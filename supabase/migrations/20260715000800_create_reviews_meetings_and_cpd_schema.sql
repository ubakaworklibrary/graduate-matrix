create table public.candidate_reviews (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete restrict,
  reviewed_on date,
  reviewed_by_user_id uuid references public.user_profiles (user_id) on delete set null,
  reviewed_by_display_name text not null,
  outcome text not null,
  next_review_date date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint candidate_reviews_candidate_id_id_key unique (candidate_id, id),
  constraint candidate_reviews_outcome_check check (
    outcome in ('not-recorded', 'accepted', 'accepted-with-actions')
  ),
  constraint candidate_reviews_reviewer_check check (
    nullif(btrim(reviewed_by_display_name), '') is not null
  )
);

create index candidate_reviews_candidate_reviewed_idx
  on public.candidate_reviews (candidate_id, reviewed_on desc, created_at desc);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete restrict,
  review_id uuid references public.candidate_reviews (id) on delete set null,
  meeting_date date not null,
  meeting_type text not null,
  attendees text not null,
  duration text not null,
  notes text not null default '',
  outcome text not null default '',
  candidate_comment text not null default '',
  created_by_user_id uuid references public.user_profiles (user_id) on delete set null,
  created_by_display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meetings_creator_check check (
    nullif(btrim(created_by_display_name), '') is not null
  )
);

create index meetings_candidate_date_idx
  on public.meetings (candidate_id, meeting_date desc, created_at desc);

create table public.cpd_entries (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete restrict,
  cpd_date date not null,
  title text not null,
  hours double precision not null,
  category text not null,
  description text not null default '',
  outcome text not null default '',
  signed_off_at timestamptz,
  signed_off_by_user_id uuid references public.user_profiles (user_id) on delete set null,
  signed_off_by_display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cpd_entries_hours_check check (
    hours not in (
      'Infinity'::double precision,
      '-Infinity'::double precision,
      'NaN'::double precision
    )
  ),
  constraint cpd_entries_category_check check (
    category in ('T', 'M', 'P', 'E', 'uncategorized')
  ),
  constraint cpd_entries_signoff_check check (
    (
      signed_off_at is null
      and signed_off_by_user_id is null
      and signed_off_by_display_name is null
    )
    or (
      signed_off_at is not null
      and nullif(btrim(signed_off_by_display_name), '') is not null
    )
  )
);

create index cpd_entries_candidate_date_idx
  on public.cpd_entries (candidate_id, cpd_date desc, created_at desc);

create table public.cpd_competency_links (
  id uuid primary key default gen_random_uuid(),
  cpd_entry_id uuid not null references public.cpd_entries (id) on delete restrict,
  competency_definition_id text not null references public.competency_definitions (id) on delete restrict,
  link_type text not null,
  accepted_at timestamptz,
  accepted_by_user_id uuid references public.user_profiles (user_id) on delete set null,
  accepted_by_display_name text,
  created_at timestamptz not null default now(),
  constraint cpd_competency_links_entry_definition_key unique (
    cpd_entry_id,
    competency_definition_id
  ),
  constraint cpd_competency_links_type_check check (
    link_type in ('accepted', 'suggested')
  ),
  constraint cpd_competency_links_acceptance_check check (
    (
      link_type = 'suggested'
      and accepted_at is null
      and accepted_by_user_id is null
      and accepted_by_display_name is null
    )
    or (
      link_type = 'accepted'
      and accepted_at is not null
      and nullif(btrim(accepted_by_display_name), '') is not null
    )
  )
);

create index cpd_competency_links_definition_type_idx
  on public.cpd_competency_links (competency_definition_id, link_type);

create table public.cpd_attachments (
  id uuid primary key default gen_random_uuid(),
  cpd_entry_id uuid not null references public.cpd_entries (id) on delete cascade,
  storage_key text not null,
  display_filename text not null,
  added_at timestamptz not null default now(),
  added_by_user_id uuid references public.user_profiles (user_id) on delete set null,
  constraint cpd_attachments_entry_storage_key unique (cpd_entry_id, storage_key),
  constraint cpd_attachments_storage_key_check check (
    nullif(btrim(storage_key), '') is not null
  ),
  constraint cpd_attachments_filename_check check (
    nullif(btrim(display_filename), '') is not null
  )
);

create function private.validate_candidate_review_actor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.reviewed_by_user_id is not null and not exists (
    select 1
    from public.candidates as candidate
    join public.organization_memberships as membership
      on membership.organization_id = candidate.organization_id
     and membership.user_id = new.reviewed_by_user_id
     and membership.archived_at is null
    where candidate.id = new.candidate_id
  ) then
    raise exception using errcode = '23514',
      message = 'A review actor must have active membership in the candidate organization.';
  end if;
  return new;
end;
$$;

create function private.validate_meeting_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.review_id is not null and not exists (
    select 1
    from public.candidate_reviews as review
    where review.id = new.review_id
      and review.candidate_id = new.candidate_id
  ) then
    raise exception using errcode = '23514',
      message = 'A meeting can link only to a review for the same candidate.';
  end if;

  if new.created_by_user_id is not null
    and (
      tg_op = 'INSERT'
      or new.created_by_user_id is distinct from old.created_by_user_id
    )
    and not exists (
    select 1
    from public.candidates as candidate
    join public.organization_memberships as membership
      on membership.organization_id = candidate.organization_id
     and membership.user_id = new.created_by_user_id
     and membership.archived_at is null
    where candidate.id = new.candidate_id
  ) then
    raise exception using errcode = '23514',
      message = 'A meeting creator must have active membership in the candidate organization.';
  end if;
  return new;
end;
$$;

create function private.validate_cpd_actor_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.signed_off_by_user_id is not null and not exists (
    select 1
    from public.candidates as candidate
    join public.organization_memberships as membership
      on membership.organization_id = candidate.organization_id
     and membership.user_id = new.signed_off_by_user_id
     and membership.archived_at is null
    where candidate.id = new.candidate_id
  ) then
    raise exception using errcode = '23514',
      message = 'A CPD sign-off actor must have active membership in the candidate organization.';
  end if;
  return new;
end;
$$;

create function private.validate_cpd_competency_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry_candidate_id uuid;
begin
  select entry.candidate_id into entry_candidate_id
  from public.cpd_entries as entry
  where entry.id = new.cpd_entry_id;

  if not exists (
    select 1
    from public.candidate_competencies as competency
    where competency.candidate_id = entry_candidate_id
      and competency.competency_definition_id = new.competency_definition_id
  ) then
    raise exception using errcode = '23514',
      message = 'CPD can link only to a competency belonging to the same candidate.';
  end if;

  if new.accepted_by_user_id is not null and not exists (
    select 1
    from public.candidates as candidate
    join public.organization_memberships as membership
      on membership.organization_id = candidate.organization_id
     and membership.user_id = new.accepted_by_user_id
     and membership.archived_at is null
    where candidate.id = entry_candidate_id
  ) then
    raise exception using errcode = '23514',
      message = 'A CPD competency-link actor must have active membership in the candidate organization.';
  end if;
  return new;
end;
$$;

create function private.validate_cpd_attachment_actor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.added_by_user_id is not null and not exists (
    select 1
    from public.cpd_entries as entry
    join public.candidates as candidate on candidate.id = entry.candidate_id
    join public.organization_memberships as membership
      on membership.organization_id = candidate.organization_id
     and membership.user_id = new.added_by_user_id
     and membership.archived_at is null
    where entry.id = new.cpd_entry_id
  ) then
    raise exception using errcode = '23514',
      message = 'A CPD attachment actor must have active membership in the candidate organization.';
  end if;
  return new;
end;
$$;

create function private.protect_candidate_owned_history()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.candidate_id is distinct from old.candidate_id
    or new.created_at is distinct from old.created_at
  then
    raise exception using errcode = '23514',
      message = 'Candidate ownership and creation time cannot be changed.';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_candidate_review_actor() from public;
revoke all on function private.validate_meeting_integrity() from public;
revoke all on function private.validate_cpd_actor_membership() from public;
revoke all on function private.validate_cpd_competency_link() from public;
revoke all on function private.validate_cpd_attachment_actor() from public;
revoke all on function private.protect_candidate_owned_history() from public;

create trigger candidate_reviews_validate_actor
before insert or update of candidate_id, reviewed_by_user_id
on public.candidate_reviews
for each row execute function private.validate_candidate_review_actor();

create trigger candidate_reviews_protect_ownership
before update of candidate_id, created_at
on public.candidate_reviews
for each row execute function private.protect_candidate_owned_history();

create trigger meetings_validate_integrity
before insert or update of candidate_id, review_id, created_by_user_id
on public.meetings
for each row execute function private.validate_meeting_integrity();

create trigger meetings_protect_ownership
before update of candidate_id, created_at
on public.meetings
for each row execute function private.protect_candidate_owned_history();

create trigger cpd_entries_validate_actor
before insert or update of candidate_id, signed_off_by_user_id
on public.cpd_entries
for each row execute function private.validate_cpd_actor_membership();

create trigger cpd_entries_protect_ownership
before update of candidate_id, created_at
on public.cpd_entries
for each row execute function private.protect_candidate_owned_history();

create trigger cpd_competency_links_validate_integrity
before insert or update of cpd_entry_id, competency_definition_id, accepted_by_user_id
on public.cpd_competency_links
for each row execute function private.validate_cpd_competency_link();

create trigger cpd_attachments_validate_actor
before insert or update of cpd_entry_id, added_by_user_id
on public.cpd_attachments
for each row execute function private.validate_cpd_attachment_actor();
