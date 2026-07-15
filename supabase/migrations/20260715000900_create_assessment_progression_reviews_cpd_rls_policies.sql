create function private.can_manage_candidate_reviews(target_candidate_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.candidates as candidate
    join public.organization_memberships as membership
      on membership.organization_id = candidate.organization_id
     and membership.user_id = auth.uid()
     and membership.archived_at is null
    where candidate.id = target_candidate_id
      and (
        membership.membership_role = 'organization-admin'
        or exists (
          select 1
          from public.candidate_relationships as relationship
          where relationship.candidate_id = candidate.id
            and relationship.user_id = auth.uid()
            and relationship.relationship_type in ('mentor', 'manager', 'reviewer')
            and relationship.starts_at <= now()
            and relationship.ends_at is null
        )
      )
  );
$$;

create function private.enforce_assessment_actor_and_ownership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    return new;
  end if;

  if not private.can_verify_candidate_evidence(new.candidate_id) then
    raise exception using errcode = '42501',
      message = 'Only an assigned mentor or organization administrator may write mentor assessments.';
  end if;

  if new.assessed_at is not null
    and new.assessed_by_user_id is distinct from current_user_id
  then
    raise exception using errcode = '42501',
      message = 'A recorded assessment must be attributed to the authenticated writer.';
  end if;

  if new.assessed_by_user_id is not null
    and new.assessed_by_user_id <> current_user_id
  then
    raise exception using errcode = '42501',
      message = 'The assessment actor must be the authenticated writer.';
  end if;

  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.candidate_id is distinct from old.candidate_id
    or new.candidate_competency_id is distinct from old.candidate_competency_id
    or new.cycle_id is distinct from old.cycle_id
    or new.created_at is distinct from old.created_at
  ) then
    raise exception using errcode = '23514',
      message = 'Assessment ownership and creation metadata cannot be changed.';
  end if;

  return new;
end;
$$;

create function private.enforce_cycle_review_actor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    return new;
  end if;

  if not private.can_verify_candidate_evidence(new.candidate_id)
    or new.reviewed_by_user_id is distinct from current_user_id
  then
    raise exception using errcode = '42501',
      message = 'A competency-cycle review must be recorded by its authenticated mentor or administrator.';
  end if;
  return new;
end;
$$;

create function private.enforce_candidate_review_actor_and_ownership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    return new;
  end if;

  if not private.can_manage_candidate_reviews(new.candidate_id) then
    raise exception using errcode = '42501',
      message = 'The authenticated user cannot manage this candidate review.';
  end if;

  if new.reviewed_by_user_id is distinct from current_user_id
  then
    raise exception using errcode = '42501',
      message = 'The review actor must be the authenticated writer.';
  end if;

  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.candidate_id is distinct from old.candidate_id
    or new.created_at is distinct from old.created_at
  ) then
    raise exception using errcode = '23514',
      message = 'Review ownership and creation metadata cannot be changed.';
  end if;
  return new;
end;
$$;

create function private.enforce_meeting_actor_and_ownership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.created_by_user_id is distinct from current_user_id then
      raise exception using errcode = '42501',
        message = 'The meeting creator must be the authenticated writer.';
    end if;
    return new;
  end if;

  if new.id is distinct from old.id
    or new.candidate_id is distinct from old.candidate_id
    or new.created_at is distinct from old.created_at
    or new.created_by_user_id is distinct from old.created_by_user_id
    or new.created_by_display_name is distinct from old.created_by_display_name
  then
    raise exception using errcode = '23514',
      message = 'Meeting ownership and creation metadata cannot be changed.';
  end if;
  return new;
end;
$$;

create function private.enforce_cpd_write_authority()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  can_edit boolean;
  can_verify boolean;
  signoff_changed boolean;
begin
  if current_user_id is null then
    return new;
  end if;

  can_edit := private.can_edit_candidate_evidence(new.candidate_id);
  can_verify := private.can_verify_candidate_evidence(new.candidate_id);

  if tg_op = 'INSERT' then
    if new.signed_off_at is null
      and new.signed_off_by_user_id is null
      and new.signed_off_by_display_name is null
    then
      if not can_edit then
        raise exception using errcode = '42501',
          message = 'Only the candidate or an organization administrator may create unsigned CPD.';
      end if;
      return new;
    end if;

    if not can_verify
      or new.signed_off_by_user_id is distinct from current_user_id
    then
      raise exception using errcode = '42501',
        message = 'Signed-off CPD must be created by its authenticated mentor or administrator.';
    end if;
    return new;
  end if;

  signoff_changed :=
    new.signed_off_at is distinct from old.signed_off_at
    or new.signed_off_by_user_id is distinct from old.signed_off_by_user_id
    or new.signed_off_by_display_name is distinct from old.signed_off_by_display_name;

  if signoff_changed then
    if not can_verify then
      raise exception using errcode = '42501',
        message = 'Only an assigned mentor or organization administrator may change CPD sign-off.';
    end if;
    if (
      new.signed_off_at is not null
      and new.signed_off_by_user_id is distinct from current_user_id
    ) or (
      new.signed_off_by_user_id is not null
      and new.signed_off_by_user_id <> current_user_id
    )
    then
      raise exception using errcode = '42501',
        message = 'The CPD sign-off actor must be the authenticated writer.';
    end if;
  end if;

  if can_edit then
    return new;
  end if;

  if not can_verify
    or not signoff_changed
    or new.id is distinct from old.id
    or new.candidate_id is distinct from old.candidate_id
    or new.cpd_date is distinct from old.cpd_date
    or new.title is distinct from old.title
    or new.hours is distinct from old.hours
    or new.category is distinct from old.category
    or new.description is distinct from old.description
    or new.outcome is distinct from old.outcome
    or new.created_at is distinct from old.created_at
  then
    raise exception using errcode = '42501',
      message = 'A mentor may update only CPD sign-off metadata.';
  end if;

  return new;
end;
$$;

create function private.enforce_cpd_link_actor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  entry_candidate_id uuid;
begin
  if current_user_id is null or new.link_type <> 'accepted' then
    return new;
  end if;

  select entry.candidate_id into entry_candidate_id
  from public.cpd_entries as entry
  where entry.id = new.cpd_entry_id;

  if not private.can_verify_candidate_evidence(entry_candidate_id)
    or new.accepted_by_user_id is distinct from current_user_id
  then
    raise exception using errcode = '42501',
      message = 'An accepted CPD competency link must be attributed to its authenticated mentor or administrator.';
  end if;
  return new;
end;
$$;

create function private.enforce_cpd_attachment_actor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.added_by_user_id is distinct from current_user_id then
      raise exception using errcode = '42501',
        message = 'The CPD attachment actor must be the authenticated writer.';
    end if;
    return new;
  end if;

  if new.id is distinct from old.id
    or new.cpd_entry_id is distinct from old.cpd_entry_id
    or new.added_at is distinct from old.added_at
    or new.added_by_user_id is distinct from old.added_by_user_id
  then
    raise exception using errcode = '23514',
      message = 'CPD attachment ownership and attribution cannot be changed.';
  end if;
  return new;
end;
$$;

revoke all on function private.can_manage_candidate_reviews(uuid) from public;
revoke all on function private.enforce_assessment_actor_and_ownership() from public;
revoke all on function private.enforce_cycle_review_actor() from public;
revoke all on function private.enforce_candidate_review_actor_and_ownership() from public;
revoke all on function private.enforce_meeting_actor_and_ownership() from public;
revoke all on function private.enforce_cpd_write_authority() from public;
revoke all on function private.enforce_cpd_link_actor() from public;
revoke all on function private.enforce_cpd_attachment_actor() from public;

grant execute on function private.can_manage_candidate_reviews(uuid) to authenticated;

create trigger mentor_assessments_enforce_actor_and_ownership
before insert or update
on public.mentor_assessments
for each row execute function private.enforce_assessment_actor_and_ownership();

create trigger competency_cycle_reviews_enforce_actor
before insert
on public.competency_cycle_reviews
for each row execute function private.enforce_cycle_review_actor();

create trigger candidate_reviews_enforce_actor_and_ownership
before insert or update
on public.candidate_reviews
for each row execute function private.enforce_candidate_review_actor_and_ownership();

create trigger meetings_enforce_actor_and_ownership
before insert or update
on public.meetings
for each row execute function private.enforce_meeting_actor_and_ownership();

create trigger cpd_entries_enforce_write_authority
before insert or update
on public.cpd_entries
for each row execute function private.enforce_cpd_write_authority();

create trigger cpd_competency_links_enforce_actor
before insert or update of link_type, accepted_at, accepted_by_user_id, accepted_by_display_name
on public.cpd_competency_links
for each row execute function private.enforce_cpd_link_actor();

create trigger cpd_attachments_enforce_actor
before insert or update
on public.cpd_attachments
for each row execute function private.enforce_cpd_attachment_actor();

alter table public.mentor_assessments enable row level security;
alter table public.competency_cycle_reviews enable row level security;
alter table public.progression_events enable row level security;
alter table public.candidate_reviews enable row level security;
alter table public.meetings enable row level security;
alter table public.cpd_entries enable row level security;
alter table public.cpd_competency_links enable row level security;
alter table public.cpd_attachments enable row level security;

create policy mentor_assessments_select_authorized
on public.mentor_assessments
for select to authenticated
using (private.can_access_candidate(candidate_id));

create policy mentor_assessments_insert_verifier
on public.mentor_assessments
for insert to authenticated
with check (private.can_verify_candidate_evidence(candidate_id));

create policy mentor_assessments_update_verifier
on public.mentor_assessments
for update to authenticated
using (private.can_verify_candidate_evidence(candidate_id))
with check (private.can_verify_candidate_evidence(candidate_id));

create policy competency_cycle_reviews_select_authorized
on public.competency_cycle_reviews
for select to authenticated
using (private.can_access_candidate(candidate_id));

create policy competency_cycle_reviews_insert_verifier
on public.competency_cycle_reviews
for insert to authenticated
with check (private.can_verify_candidate_evidence(candidate_id));

create policy progression_events_select_authorized
on public.progression_events
for select to authenticated
using (private.can_access_candidate(candidate_id));

create policy candidate_reviews_select_authorized
on public.candidate_reviews
for select to authenticated
using (private.can_access_candidate(candidate_id));

create policy candidate_reviews_insert_manager
on public.candidate_reviews
for insert to authenticated
with check (private.can_manage_candidate_reviews(candidate_id));

create policy candidate_reviews_update_manager
on public.candidate_reviews
for update to authenticated
using (private.can_manage_candidate_reviews(candidate_id))
with check (private.can_manage_candidate_reviews(candidate_id));

create policy meetings_select_authorized
on public.meetings
for select to authenticated
using (private.can_access_candidate(candidate_id));

create policy meetings_insert_development_manager
on public.meetings
for insert to authenticated
with check (
  private.can_manage_candidate_development(candidate_id)
  and created_by_user_id = auth.uid()
);

create policy meetings_update_development_manager
on public.meetings
for update to authenticated
using (private.can_manage_candidate_development(candidate_id))
with check (private.can_manage_candidate_development(candidate_id));

create policy meetings_delete_development_manager
on public.meetings
for delete to authenticated
using (private.can_manage_candidate_development(candidate_id));

create policy cpd_entries_select_authorized
on public.cpd_entries
for select to authenticated
using (private.can_access_candidate(candidate_id));

create policy cpd_entries_insert_authorized
on public.cpd_entries
for insert to authenticated
with check (
  private.can_edit_candidate_evidence(candidate_id)
  or (
    private.can_verify_candidate_evidence(candidate_id)
    and signed_off_at is not null
    and signed_off_by_user_id = auth.uid()
  )
);

create policy cpd_entries_update_authorized
on public.cpd_entries
for update to authenticated
using (
  private.can_edit_candidate_evidence(candidate_id)
  or private.can_verify_candidate_evidence(candidate_id)
)
with check (
  private.can_edit_candidate_evidence(candidate_id)
  or private.can_verify_candidate_evidence(candidate_id)
);

create policy cpd_entries_delete_unsigned_owner_or_admin
on public.cpd_entries
for delete to authenticated
using (
  private.can_edit_candidate_evidence(candidate_id)
  and signed_off_at is null
  and not exists (
    select 1
    from public.cpd_competency_links as link
    where link.cpd_entry_id = cpd_entries.id
  )
);

create policy cpd_competency_links_select_authorized
on public.cpd_competency_links
for select to authenticated
using (
  exists (
    select 1
    from public.cpd_entries as entry
    where entry.id = cpd_competency_links.cpd_entry_id
      and private.can_access_candidate(entry.candidate_id)
  )
);

create policy cpd_competency_links_insert_development_manager
on public.cpd_competency_links
for insert to authenticated
with check (
  exists (
    select 1
    from public.cpd_entries as entry
    where entry.id = cpd_competency_links.cpd_entry_id
      and private.can_manage_candidate_development(entry.candidate_id)
      and (
        cpd_competency_links.link_type = 'suggested'
        or private.can_verify_candidate_evidence(entry.candidate_id)
      )
  )
);

create policy cpd_competency_links_update_verifier
on public.cpd_competency_links
for update to authenticated
using (
  exists (
    select 1
    from public.cpd_entries as entry
    where entry.id = cpd_competency_links.cpd_entry_id
      and private.can_verify_candidate_evidence(entry.candidate_id)
  )
)
with check (
  exists (
    select 1
    from public.cpd_entries as entry
    where entry.id = cpd_competency_links.cpd_entry_id
      and private.can_verify_candidate_evidence(entry.candidate_id)
  )
);

create policy cpd_competency_links_delete_authorized
on public.cpd_competency_links
for delete to authenticated
using (
  exists (
    select 1
    from public.cpd_entries as entry
    where entry.id = cpd_competency_links.cpd_entry_id
      and (
        (
          cpd_competency_links.link_type = 'suggested'
          and private.can_manage_candidate_development(entry.candidate_id)
        )
        or (
          cpd_competency_links.link_type = 'accepted'
          and private.can_verify_candidate_evidence(entry.candidate_id)
        )
      )
  )
);

create policy cpd_attachments_select_authorized
on public.cpd_attachments
for select to authenticated
using (
  exists (
    select 1
    from public.cpd_entries as entry
    where entry.id = cpd_attachments.cpd_entry_id
      and private.can_access_candidate(entry.candidate_id)
  )
);

create policy cpd_attachments_insert_development_manager
on public.cpd_attachments
for insert to authenticated
with check (
  added_by_user_id = auth.uid()
  and exists (
    select 1
    from public.cpd_entries as entry
    where entry.id = cpd_attachments.cpd_entry_id
      and private.can_manage_candidate_development(entry.candidate_id)
  )
);

create policy cpd_attachments_update_development_manager
on public.cpd_attachments
for update to authenticated
using (
  exists (
    select 1
    from public.cpd_entries as entry
    where entry.id = cpd_attachments.cpd_entry_id
      and private.can_manage_candidate_development(entry.candidate_id)
  )
)
with check (
  exists (
    select 1
    from public.cpd_entries as entry
    where entry.id = cpd_attachments.cpd_entry_id
      and private.can_manage_candidate_development(entry.candidate_id)
  )
);

create policy cpd_attachments_delete_development_manager
on public.cpd_attachments
for delete to authenticated
using (
  exists (
    select 1
    from public.cpd_entries as entry
    where entry.id = cpd_attachments.cpd_entry_id
      and private.can_manage_candidate_development(entry.candidate_id)
  )
);
