create function private.validate_candidate_identity_and_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
    and new.organization_id is distinct from old.organization_id
  then
    raise exception using
      errcode = '23514',
      message = 'A candidate organization cannot be changed after creation.';
  end if;

  if new.user_id is not null and not exists (
    select 1
    from public.organization_memberships as membership
    where membership.organization_id = new.organization_id
      and membership.user_id = new.user_id
      and membership.archived_at is null
  ) then
    raise exception using
      errcode = '23514',
      message = 'A linked candidate user must have an active membership in the candidate organization.';
  end if;

  return new;
end;
$$;

create function private.protect_user_profile_created_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_at is distinct from old.created_at then
    raise exception using
      errcode = '23514',
      message = 'A user profile creation timestamp cannot be changed.';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_candidate_identity_and_organization() from public;
revoke all on function private.protect_user_profile_created_at() from public;

create trigger candidates_validate_identity_and_organization
before insert or update of user_id, organization_id
on public.candidates
for each row
execute function private.validate_candidate_identity_and_organization();

create trigger user_profiles_protect_created_at
before update of created_at
on public.user_profiles
for each row
execute function private.protect_user_profile_created_at();

create table public.candidate_relationships (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete restrict,
  user_id uuid references public.user_profiles (user_id) on delete set null,
  relationship_type text not null,
  display_name text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint candidate_relationships_type_check check (
    relationship_type in ('mentor', 'manager', 'reviewer')
  ),
  constraint candidate_relationships_date_order_check check (
    ends_at is null or ends_at >= starts_at
  )
);

create unique index candidate_relationships_current_type_key
  on public.candidate_relationships (candidate_id, relationship_type)
  where ends_at is null;

create index candidate_relationships_candidate_type_ends_idx
  on public.candidate_relationships (candidate_id, relationship_type, ends_at);

create function private.validate_candidate_relationship_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is not null and not exists (
    select 1
    from public.candidates as candidate
    join public.organization_memberships as membership
      on membership.organization_id = candidate.organization_id
     and membership.user_id = new.user_id
     and membership.archived_at is null
    where candidate.id = new.candidate_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'A linked candidate relationship user must have an active membership in the candidate organization.';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_candidate_relationship_membership() from public;

create trigger candidate_relationships_validate_membership
before insert or update of candidate_id, user_id
on public.candidate_relationships
for each row
execute function private.validate_candidate_relationship_membership();

create table public.candidate_pathways (
  candidate_id uuid primary key references public.candidates (id) on delete cascade,
  professional_body text not null,
  primary_outcome text not null,
  cibse_membership_target text not null,
  iet_membership_target text not null,
  engineering_registration_target text not null,
  current_membership_status text not null default '',
  academic_route text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint candidate_pathways_professional_body_check check (
    professional_body in (
      'cibse',
      'iet',
      'imeche',
      'cibse-certification',
      'internal',
      'other'
    )
  ),
  constraint candidate_pathways_primary_outcome_check check (
    primary_outcome in (
      'internal-graduate',
      'engtech-lcibse',
      'ieng-acibse',
      'ieng-mcibse',
      'ceng-mcibse',
      'ceng-fcibse',
      'engtech-iet',
      'ieng-iet',
      'ceng-iet',
      'engtech-imeche',
      'ieng-imeche',
      'ceng-imeche',
      'lcc',
      'lcea',
      'cibse-cert-specialist',
      'custom'
    )
  ),
  constraint candidate_pathways_cibse_membership_target_check check (
    cibse_membership_target in (
      'none',
      'graduate',
      'affiliate',
      'lcibse',
      'acibse',
      'mcibse',
      'fcibse'
    )
  ),
  constraint candidate_pathways_iet_membership_target_check check (
    iet_membership_target in ('none', 'student', 'tmiet', 'miet', 'fiet')
  ),
  constraint candidate_pathways_engineering_registration_target_check check (
    engineering_registration_target in (
      'none',
      'engtech',
      'ieng',
      'ceng',
      'international-later'
    )
  )
);

create table public.candidate_pathway_lcc_strands (
  candidate_id uuid not null references public.candidate_pathways (candidate_id) on delete cascade,
  strand_code text not null,
  primary key (candidate_id, strand_code),
  constraint candidate_pathway_lcc_strands_code_check check (
    strand_code in (
      'building-design',
      'building-operation',
      'simulation',
      'energy-management-systems'
    )
  )
);

create table public.candidate_pathway_specialist_routes (
  candidate_id uuid not null references public.candidate_pathways (candidate_id) on delete cascade,
  route_code text not null,
  primary key (candidate_id, route_code),
  constraint candidate_pathway_specialist_routes_code_check check (
    route_code in (
      'lcea',
      'air-conditioning-inspection',
      'section-63',
      'esos-lead-assessor',
      'heat-networks-consultant',
      'whole-life-carbon-assessor',
      'nabers-uk-assessor',
      'management-systems-specialist'
    )
  )
);

create table public.baseline_task_definitions (
  id text primary key,
  title text not null,
  description text not null,
  mandatory boolean not null,
  completion_mode text not null,
  source_order integer not null unique,
  definition_version integer not null default 1,
  is_active boolean not null default true,
  constraint baseline_task_definitions_completion_mode_check check (
    completion_mode in ('automatic', 'mentor')
  )
);

insert into public.baseline_task_definitions (
  id,
  title,
  description,
  mandatory,
  completion_mode,
  source_order
)
values
  (
    'candidate-profile',
    'Candidate profile completed',
    'Candidate first name, surname and scheme start date are recorded.',
    true,
    'automatic',
    1
  ),
  (
    'registration-route',
    'Registration route selected',
    'Primary target outcome / pathway is selected.',
    true,
    'automatic',
    2
  ),
  (
    'mentor-confirmed',
    'Mentor confirmed',
    'Named mentor is recorded on the Candidate page.',
    true,
    'automatic',
    3
  ),
  (
    'manager-reviewer-confirmed',
    'Manager / reviewer confirmed',
    'Line manager or additional reviewer / sponsor is recorded on the Candidate page.',
    false,
    'automatic',
    4
  ),
  (
    'file-structure',
    'Company file structure explained',
    'Project folders, drawings, specifications, calculations, markups and issued information locations have been explained.',
    true,
    'mentor',
    5
  ),
  (
    'document-control',
    'Document naming and revision control explained',
    'Naming, revisions, status, superseded information and issue control have been explained.',
    true,
    'mentor',
    6
  ),
  (
    'templates-standards',
    'Internal templates and standards location explained',
    'The candidate knows where to find reports, specs, calculation templates, schedules and internal standards.',
    true,
    'mentor',
    7
  ),
  (
    'qa-checking',
    'QA / checking process explained',
    'Internal checking, assumptions, exclusions and escalation route have been explained.',
    true,
    'mentor',
    8
  ),
  (
    'matrix-briefing',
    'Training matrix briefing completed',
    'Candidate understands BL, L1-L5, evidence, actions, mentor review and export/import expectations.',
    true,
    'mentor',
    9
  ),
  (
    'first-review',
    'First L1 review date agreed',
    'The first formal L1 review date or review window has been agreed.',
    true,
    'mentor',
    10
  ),
  (
    'initial-l1-actions',
    'Initial L1 development actions agreed',
    'Initial L1 development focus/actions are agreed before the formal cycle starts.',
    true,
    'mentor',
    11
  );

create table public.candidate_baseline_setups (
  candidate_id uuid primary key references public.candidates (id) on delete cascade,
  status text not null default 'not-started',
  formal_training_started_at timestamptz,
  formal_training_started_by_user_id uuid references public.user_profiles (user_id) on delete set null,
  formal_training_started_by_display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint candidate_baseline_setups_status_check check (
    status in ('not-started', 'in-progress', 'completed')
  )
);

create table public.candidate_baseline_tasks (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidate_baseline_setups (candidate_id) on delete cascade,
  definition_id text not null references public.baseline_task_definitions (id) on delete restrict,
  status text not null default 'not-complete',
  note text not null default '',
  completed_at timestamptz,
  completed_by_user_id uuid references public.user_profiles (user_id) on delete set null,
  completed_by_display_name text,
  updated_at timestamptz not null default now(),
  constraint candidate_baseline_tasks_candidate_definition_key unique (
    candidate_id,
    definition_id
  ),
  constraint candidate_baseline_tasks_status_check check (
    status in ('not-complete', 'complete', 'waived')
  )
);

create function private.validate_candidate_baseline_setup_actor_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.formal_training_started_by_user_id is not null and not exists (
    select 1
    from public.candidates as candidate
    join public.organization_memberships as membership
      on membership.organization_id = candidate.organization_id
     and membership.user_id = new.formal_training_started_by_user_id
     and membership.archived_at is null
    where candidate.id = new.candidate_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'A linked baseline setup actor must have an active membership in the candidate organization.';
  end if;

  return new;
end;
$$;

create function private.validate_candidate_baseline_task_actor_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.completed_by_user_id is not null and not exists (
    select 1
    from public.candidates as candidate
    join public.organization_memberships as membership
      on membership.organization_id = candidate.organization_id
     and membership.user_id = new.completed_by_user_id
     and membership.archived_at is null
    where candidate.id = new.candidate_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'A linked baseline task actor must have an active membership in the candidate organization.';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_candidate_baseline_setup_actor_membership() from public;
revoke all on function private.validate_candidate_baseline_task_actor_membership() from public;

create trigger candidate_baseline_setups_validate_actor_membership
before insert or update of candidate_id, formal_training_started_by_user_id
on public.candidate_baseline_setups
for each row
execute function private.validate_candidate_baseline_setup_actor_membership();

create trigger candidate_baseline_tasks_validate_actor_membership
before insert or update of candidate_id, completed_by_user_id
on public.candidate_baseline_tasks
for each row
execute function private.validate_candidate_baseline_task_actor_membership();

alter table public.candidate_relationships enable row level security;
alter table public.candidate_pathways enable row level security;
alter table public.candidate_pathway_lcc_strands enable row level security;
alter table public.candidate_pathway_specialist_routes enable row level security;
alter table public.baseline_task_definitions enable row level security;
alter table public.candidate_baseline_setups enable row level security;
alter table public.candidate_baseline_tasks enable row level security;
