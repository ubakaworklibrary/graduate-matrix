create table public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  user_id uuid not null references public.user_profiles (user_id) on delete restrict,
  membership_role text not null,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint organization_memberships_role_check check (
    membership_role in ('member', 'mentor', 'manager', 'organization-admin')
  )
);

create unique index organization_memberships_current_user_key
  on public.organization_memberships (organization_id, user_id)
  where archived_at is null;

create index organization_memberships_user_archived_idx
  on public.organization_memberships (user_id, archived_at);

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  user_id uuid references public.user_profiles (user_id) on delete set null,
  first_name text not null,
  surname text not null,
  job_title text not null,
  discipline text not null,
  employer_team text not null,
  office_location text not null,
  scheme_start_date date,
  expected_application_date date,
  external_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create unique index candidates_user_key
  on public.candidates (user_id)
  where user_id is not null;

create unique index candidates_organization_external_reference_key
  on public.candidates (organization_id, external_reference)
  where external_reference is not null;

create index candidates_organization_archived_idx
  on public.candidates (organization_id, archived_at);

create table public.competency_definitions (
  id text primary key,
  reference text not null unique,
  source_order integer not null unique,
  is_active boolean not null default true
);

insert into public.competency_definitions (id, reference, source_order)
values
  ('mcibse-a1', 'A1', 1),
  ('mcibse-a2', 'A2', 2),
  ('mcibse-b1', 'B1', 3),
  ('mcibse-b2', 'B2', 4),
  ('mcibse-b3', 'B3', 5),
  ('mcibse-c1', 'C1', 6),
  ('mcibse-c2', 'C2', 7),
  ('mcibse-c3', 'C3', 8),
  ('mcibse-c4', 'C4', 9),
  ('mcibse-d1', 'D1', 10),
  ('mcibse-d2', 'D2', 11),
  ('mcibse-d3', 'D3', 12),
  ('mcibse-e1', 'E1', 13),
  ('mcibse-e2', 'E2', 14),
  ('mcibse-e3', 'E3', 15),
  ('mcibse-e4', 'E4', 16),
  ('mcibse-e5', 'E5', 17);

create table public.candidate_competencies (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete restrict,
  competency_definition_id text not null references public.competency_definitions (id) on delete restrict,
  active_cycle_id uuid,
  target_level_override text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint candidate_competencies_candidate_definition_key unique (
    candidate_id,
    competency_definition_id
  ),
  constraint candidate_competencies_target_level_check check (
    target_level_override is null
    or target_level_override in ('L1', 'L2', 'L3', 'L4', 'L5')
  )
);

create index candidate_competencies_candidate_idx
  on public.candidate_competencies (candidate_id);

create table public.competency_cycles (
  id uuid primary key default gen_random_uuid(),
  candidate_competency_id uuid not null references public.candidate_competencies (id) on delete restrict,
  level text not null,
  status text not null,
  opened_at timestamptz,
  opened_by_user_id uuid references public.user_profiles (user_id) on delete set null,
  opened_by_display_name text,
  completed_at timestamptz,
  completed_by_user_id uuid references public.user_profiles (user_id) on delete set null,
  completed_by_display_name text,
  completion_reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint competency_cycles_level_check check (
    level in ('L1', 'L2', 'L3', 'L4', 'L5')
  ),
  constraint competency_cycles_status_check check (
    status in ('locked', 'open', 'paused', 'completed', 'archived')
  ),
  constraint competency_cycles_owner_id_key unique (candidate_competency_id, id)
);

alter table public.candidate_competencies
  add constraint candidate_competencies_active_cycle_ownership_fkey
  foreign key (id, active_cycle_id)
  references public.competency_cycles (candidate_competency_id, id)
  on delete restrict;

create index competency_cycles_candidate_competency_created_idx
  on public.competency_cycles (candidate_competency_id, created_at desc);

create index competency_cycles_candidate_competency_level_idx
  on public.competency_cycles (candidate_competency_id, level);

alter table public.user_profiles enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.candidates enable row level security;
alter table public.competency_definitions enable row level security;
alter table public.candidate_competencies enable row level security;
alter table public.competency_cycles enable row level security;
