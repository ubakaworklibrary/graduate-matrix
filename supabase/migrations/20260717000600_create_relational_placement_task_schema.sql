create table public.placement_task_definitions (
  id text primary key,
  discipline text not null,
  title text not null,
  description text not null,
  suggested_stage text,
  source_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint placement_task_definitions_discipline_check check (
    discipline in (
      'mechanical-public-health',
      'electrical',
      'sustainability',
      'administration'
    )
  ),
  constraint placement_task_definitions_title_nonblank_check check (
    btrim(title) <> ''
  ),
  constraint placement_task_definitions_description_nonblank_check check (
    btrim(description) <> ''
  ),
  constraint placement_task_definitions_suggested_stage_check check (
    suggested_stage is null
    or suggested_stage in ('graduate', 'graduate-intermediate', 'intermediate')
  ),
  constraint placement_task_definitions_source_order_check check (
    source_order > 0
  ),
  constraint placement_task_definitions_discipline_source_order_key unique (
    discipline,
    source_order
  ),
  constraint placement_task_definitions_discipline_title_key unique (
    discipline,
    title
  )
);

create index placement_task_definitions_discipline_active_order_idx
  on public.placement_task_definitions (
    discipline,
    is_active,
    source_order
  );

create table public.candidate_placement_workspaces (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  placement_discipline text not null,
  created_at timestamptz not null default now(),
  created_by_user_id uuid references public.user_profiles (user_id) on delete set null,
  created_by_display_name text not null,
  updated_at timestamptz not null default now(),
  constraint candidate_placement_workspaces_discipline_check check (
    placement_discipline in (
      'mechanical-public-health',
      'electrical',
      'sustainability',
      'administration'
    )
  ),
  constraint candidate_placement_workspaces_created_by_name_check check (
    btrim(created_by_display_name) <> ''
  ),
  constraint candidate_placement_workspaces_candidate_discipline_key unique (
    candidate_id,
    placement_discipline
  )
);

create table public.candidate_placement_tasks (
  id uuid primary key default gen_random_uuid(),
  candidate_placement_workspace_id uuid not null
    references public.candidate_placement_workspaces (id) on delete cascade,
  task_definition_id text not null
    references public.placement_task_definitions (id),
  candidate_progress text not null default 'not-started',
  candidate_note text not null default '',
  candidate_updated_at timestamptz,
  candidate_updated_by_user_id uuid
    references public.user_profiles (user_id) on delete set null,
  candidate_updated_by_display_name text,
  assigned_at timestamptz not null default now(),
  assigned_by_user_id uuid
    references public.user_profiles (user_id) on delete set null,
  assigned_by_display_name text not null,
  updated_at timestamptz not null default now(),
  constraint candidate_placement_tasks_progress_check check (
    candidate_progress in ('not-started', 'in-progress', 'complete')
  ),
  constraint candidate_placement_tasks_note_length_check check (
    char_length(candidate_note) <= 1000
  ),
  constraint candidate_placement_tasks_candidate_update_actor_check check (
    candidate_updated_at is null
    or (
      candidate_updated_by_display_name is not null
      and btrim(candidate_updated_by_display_name) <> ''
    )
  ),
  constraint candidate_placement_tasks_assigned_by_name_check check (
    btrim(assigned_by_display_name) <> ''
  ),
  constraint candidate_placement_tasks_workspace_definition_key unique (
    candidate_placement_workspace_id,
    task_definition_id
  )
);

create index candidate_placement_tasks_workspace_progress_idx
  on public.candidate_placement_tasks (
    candidate_placement_workspace_id,
    candidate_progress
  );

create index candidate_placement_tasks_definition_idx
  on public.candidate_placement_tasks (task_definition_id);

create table public.candidate_placement_task_verification_events (
  id uuid primary key default gen_random_uuid(),
  candidate_placement_task_id uuid not null
    references public.candidate_placement_tasks (id) on delete cascade,
  event_type text not null,
  mentor_comment text not null default '',
  actor_user_id uuid
    references public.user_profiles (user_id) on delete set null,
  actor_display_name text not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint candidate_placement_task_events_type_check check (
    event_type in ('verified', 'changes-required', 'reverification-required')
  ),
  constraint candidate_placement_task_events_actor_name_check check (
    btrim(actor_display_name) <> ''
  ),
  constraint candidate_placement_task_events_comment_length_check check (
    char_length(mentor_comment) <= 1000
  )
);

create index candidate_placement_task_events_latest_idx
  on public.candidate_placement_task_verification_events (
    candidate_placement_task_id,
    occurred_at desc,
    created_at desc,
    id desc
  );

create function private.is_candidate_placement_discipline_eligible(
  candidate_home_discipline text,
  target_placement_discipline text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case candidate_home_discipline
    when 'Mechanical & Public Health' then
      target_placement_discipline in ('electrical', 'sustainability', 'administration')
    when 'Electrical' then
      target_placement_discipline in ('mechanical-public-health', 'sustainability', 'administration')
    when 'Sustainability' then
      target_placement_discipline in ('mechanical-public-health', 'electrical', 'administration')
    else false
  end;
$$;

create function private.validate_candidate_placement_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate_home_discipline text;
begin
  if tg_op = 'UPDATE' and new.candidate_id is distinct from old.candidate_id then
    raise exception using
      errcode = '23514',
      message = 'A placement workspace cannot be moved to another candidate.';
  end if;

  if tg_op = 'UPDATE'
    and new.placement_discipline is distinct from old.placement_discipline
    and exists (
      select 1
      from public.candidate_placement_tasks as task
      join public.placement_task_definitions as definition
        on definition.id = task.task_definition_id
      where task.candidate_placement_workspace_id = old.id
        and definition.discipline is distinct from new.placement_discipline
    )
  then
    raise exception using
      errcode = '23514',
      message = 'A placement workspace discipline cannot invalidate assigned tasks.';
  end if;

  select candidate.discipline
  into candidate_home_discipline
  from public.candidates as candidate
  where candidate.id = new.candidate_id;

  if candidate_home_discipline is null then
    raise exception using
      errcode = '23503',
      message = 'The placement candidate does not exist.';
  end if;

  if not private.is_candidate_placement_discipline_eligible(
    candidate_home_discipline,
    new.placement_discipline
  ) then
    raise exception using
      errcode = '23514',
      message = 'The placement discipline is not eligible for the candidate home discipline.';
  end if;

  return new;
end;
$$;

create function private.validate_candidate_placement_task()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  workspace_discipline text;
  definition_discipline text;
begin
  if tg_op = 'UPDATE' and (
    new.candidate_placement_workspace_id is distinct from old.candidate_placement_workspace_id
    or new.task_definition_id is distinct from old.task_definition_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'An assigned placement task cannot be moved or redefined.';
  end if;

  if tg_op = 'UPDATE' and (
    new.assigned_at is distinct from old.assigned_at
    or new.assigned_by_display_name is distinct from old.assigned_by_display_name
    or (
      new.assigned_by_user_id is distinct from old.assigned_by_user_id
      and not (
        new.assigned_by_user_id is null
        and old.assigned_by_user_id is not null
        and not exists (
          select 1
          from public.user_profiles as profile
          where profile.user_id = old.assigned_by_user_id
        )
      )
    )
  ) then
    raise exception using
      errcode = '23514',
      message = 'Placement task assignment metadata cannot be changed.';
  end if;

  select workspace.placement_discipline
  into workspace_discipline
  from public.candidate_placement_workspaces as workspace
  where workspace.id = new.candidate_placement_workspace_id;

  select definition.discipline
  into definition_discipline
  from public.placement_task_definitions as definition
  where definition.id = new.task_definition_id;

  if workspace_discipline is null or definition_discipline is null then
    raise exception using
      errcode = '23503',
      message = 'The placement workspace or task definition does not exist.';
  end if;

  if workspace_discipline is distinct from definition_discipline then
    raise exception using
      errcode = '23514',
      message = 'The placement task definition must match the workspace discipline.';
  end if;

  return new;
end;
$$;

create function private.validate_candidate_discipline_change_for_placements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.discipline is distinct from old.discipline
    and exists (
      select 1
      from public.candidate_placement_workspaces as workspace
      join public.candidate_placement_tasks as task
        on task.candidate_placement_workspace_id = workspace.id
      where workspace.candidate_id = old.id
        and not private.is_candidate_placement_discipline_eligible(
          new.discipline,
          workspace.placement_discipline
        )
    )
  then
    raise exception using
      errcode = '23514',
      message = 'The candidate discipline change would invalidate assigned placement tasks.';
  end if;

  return new;
end;
$$;

create function private.protect_candidate_placement_verification_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
    and new.actor_user_id is null
    and old.actor_user_id is not null
    and new.id is not distinct from old.id
    and new.candidate_placement_task_id is not distinct from old.candidate_placement_task_id
    and new.event_type is not distinct from old.event_type
    and new.mentor_comment is not distinct from old.mentor_comment
    and new.actor_display_name is not distinct from old.actor_display_name
    and new.occurred_at is not distinct from old.occurred_at
    and new.created_at is not distinct from old.created_at
    and not exists (
      select 1
      from public.user_profiles as profile
      where profile.user_id = old.actor_user_id
    )
  then
    return new;
  end if;

  if auth.uid() is not null then
    raise exception using
      errcode = '42501',
      message = 'Placement task verification history is append-only.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all on function private.is_candidate_placement_discipline_eligible(text, text) from public;
revoke all on function private.validate_candidate_placement_workspace() from public;
revoke all on function private.validate_candidate_placement_task() from public;
revoke all on function private.validate_candidate_discipline_change_for_placements() from public;
revoke all on function private.protect_candidate_placement_verification_history() from public;

create trigger candidate_placement_workspaces_validate
before insert or update of candidate_id, placement_discipline
on public.candidate_placement_workspaces
for each row
execute function private.validate_candidate_placement_workspace();

create trigger candidate_placement_tasks_validate
before insert or update
on public.candidate_placement_tasks
for each row
execute function private.validate_candidate_placement_task();

create trigger candidates_validate_placement_discipline_change
before update of discipline
on public.candidates
for each row
execute function private.validate_candidate_discipline_change_for_placements();

create trigger candidate_placement_events_protect_history
before update or delete
on public.candidate_placement_task_verification_events
for each row
execute function private.protect_candidate_placement_verification_history();

insert into public.placement_task_definitions (
  id,
  discipline,
  title,
  description,
  suggested_stage,
  source_order
)
values
  ('PL-MPH-001', 'mechanical-public-health', 'Calculate room ventilation rates and prepare an air-balance schedule', 'Determine room air-flow requirements from the agreed design criteria and record coordinated supply and extract quantities.', 'graduate', 1),
  ('PL-MPH-002', 'mechanical-public-health', 'Size supply, extract and return-air ductwork', 'Select preliminary duct sizes using the agreed air flows, velocity limits and available coordination space.', 'graduate', 2),
  ('PL-MPH-003', 'mechanical-public-health', 'Calculate duct pressure losses and identify the critical index run', 'Calculate system pressure losses across fittings and components and identify the route that governs fan duty.', 'graduate-intermediate', 3),
  ('PL-MPH-004', 'mechanical-public-health', 'Size heating and cooling pipework', 'Select preliminary pipe sizes from design flow rates while considering velocity, pressure loss and system arrangement.', 'graduate', 4),
  ('PL-MPH-005', 'mechanical-public-health', 'Calculate pump duties and review system pressure losses', 'Develop a system pressure-loss calculation and use it to establish a coordinated preliminary pump duty.', 'graduate-intermediate', 5),
  ('PL-MPH-006', 'mechanical-public-health', 'Prepare mechanical system schematics', 'Prepare clear schematics showing principal equipment, distribution routes, controls interfaces and system relationships.', 'graduate', 6),
  ('PL-MPH-007', 'mechanical-public-health', 'Coordinate mechanical risers, plantrooms and ceiling zones', 'Review spatial requirements, access and interfaces for mechanical services within shared coordination zones.', 'graduate-intermediate', 7),
  ('PL-MPH-008', 'mechanical-public-health', 'Select air terminals and review throw, noise and access', 'Compare terminal selections against air flow, distribution, acoustic and maintenance-access requirements.', 'graduate-intermediate', 8),
  ('PL-MPH-009', 'mechanical-public-health', 'Size domestic water services', 'Estimate design water demands and select preliminary distribution sizes using the agreed project method.', 'graduate-intermediate', 9),
  ('PL-MPH-010', 'mechanical-public-health', 'Size above-ground drainage systems', 'Establish design discharge loads and select preliminary pipe sizes, gradients and ventilation arrangements.', 'intermediate', 10),
  ('PL-MPH-011', 'mechanical-public-health', 'Prepare builders-work and penetration requirements', 'Identify coordinated openings, plinths, supports and other builders-work information required for mechanical services.', 'graduate-intermediate', 11),
  ('PL-MPH-012', 'mechanical-public-health', 'Review fire-stopping requirements around services', 'Identify service penetrations and coordinate the information needed for suitable tested fire-stopping arrangements.', 'intermediate', 12),

  ('PL-ELEC-001', 'electrical', 'Prepare an electrical load assessment and diversity calculation', 'Compile connected loads, apply agreed diversity assumptions and document the resulting design demand.', 'graduate', 1),
  ('PL-ELEC-002', 'electrical', 'Size final circuits and distribution cables', 'Select preliminary cable sizes using design current, installation method, protective device and correction factors.', 'graduate-intermediate', 2),
  ('PL-ELEC-003', 'electrical', 'Check voltage drop and fault-current requirements', 'Check proposed circuits against the agreed voltage-drop limits and relevant fault-current parameters.', 'graduate-intermediate', 3),
  ('PL-ELEC-004', 'electrical', 'Prepare LV distribution schematics', 'Prepare coordinated single-line information showing supplies, distribution equipment, protective devices and principal loads.', 'graduate', 4),
  ('PL-ELEC-005', 'electrical', 'Prepare distribution-board schedules', 'Develop schedules that record circuit references, connected loads, protective devices, phases and spare capacity.', 'graduate', 5),
  ('PL-ELEC-006', 'electrical', 'Produce lighting layouts and lighting calculations', 'Develop coordinated luminaire layouts and calculations against the agreed visual and energy-performance criteria.', 'graduate-intermediate', 6),
  ('PL-ELEC-007', 'electrical', 'Develop emergency-lighting layouts and checks', 'Prepare emergency-lighting proposals and document coverage and performance checks for the agreed design basis.', 'graduate-intermediate', 7),
  ('PL-ELEC-008', 'electrical', 'Prepare small-power layouts', 'Coordinate socket outlets and fixed equipment supplies with user requirements, equipment information and room layouts.', 'graduate', 8),
  ('PL-ELEC-009', 'electrical', 'Size and coordinate containment routes', 'Select preliminary containment sizes and routes while considering capacity, segregation, access and spatial coordination.', 'graduate-intermediate', 9),
  ('PL-ELEC-010', 'electrical', 'Develop earthing and bonding layouts', 'Identify principal earthing and bonding connections and coordinate their locations with the electrical distribution design.', 'intermediate', 10),
  ('PL-ELEC-011', 'electrical', 'Prepare fire-alarm device layouts', 'Develop coordinated device layouts from the agreed fire strategy and system design information.', 'graduate-intermediate', 11),
  ('PL-ELEC-012', 'electrical', 'Develop electrical metering proposals', 'Identify suitable metering points and data requirements for the electrical distribution and energy strategy.', 'intermediate', 12),

  ('PL-SUS-001', 'sustainability', 'Identify the applicable energy-compliance regime and transitional arrangements', 'Review the project scope, dates and available information to record the applicable energy-assessment route and assumptions.', 'graduate-intermediate', 1),
  ('PL-SUS-002', 'sustainability', 'Prepare or review SBEM or approved DSM inputs', 'Compile or review model inputs against the coordinated architectural and building-services information.', 'graduate-intermediate', 2),
  ('PL-SUS-003', 'sustainability', 'Check geometry, fabric, occupancy and building-services model inputs', 'Cross-check key model inputs for completeness, consistency and traceability to the current design information.', 'graduate', 3),
  ('PL-SUS-004', 'sustainability', 'Compare actual-building and notional-building assumptions', 'Review the principal differences between actual and notional model inputs and explain their effect on results.', 'graduate-intermediate', 4),
  ('PL-SUS-005', 'sustainability', 'Maintain a Part L compliance issue and evidence tracker', 'Record outstanding model inputs, design responses and supporting evidence needed for the agreed compliance workflow.', 'graduate', 5),
  ('PL-SUS-006', 'sustainability', 'Undertake or review a Part O overheating assessment where applicable', 'Prepare or review assessment inputs, assumptions and outputs for projects where the agreed overheating route applies.', 'intermediate', 6),
  ('PL-SUS-007', 'sustainability', 'Prepare a TM54 operational-energy estimate', 'Develop an operational-energy estimate using documented scenarios, end uses and project-specific assumptions.', 'intermediate', 7),
  ('PL-SUS-008', 'sustainability', 'Undertake operational-energy sensitivity and scenario testing', 'Test material changes to occupancy, controls, loads or systems and explain their influence on predicted energy use.', 'intermediate', 8),
  ('PL-SUS-009', 'sustainability', 'Review passive-design measures and overheating risk', 'Review orientation, fabric, glazing, shading and ventilation measures against the agreed comfort strategy.', 'graduate-intermediate', 9),
  ('PL-SUS-010', 'sustainability', 'Prepare a BREEAM pre-assessment or evidence tracker', 'Record targeted credits, responsibilities, evidence requirements and open actions for the agreed assessment scope.', 'graduate', 10),
  ('PL-SUS-011', 'sustainability', 'Review energy and water metering strategies', 'Review proposed meter coverage, hierarchy and data uses against the project performance objectives.', 'graduate-intermediate', 11),
  ('PL-SUS-012', 'sustainability', 'Prepare a building-services embodied-carbon assessment using available EPD data or an approved estimation methodology', 'Compile quantities and suitable product data or documented estimates to assess embodied carbon for the agreed services scope.', 'intermediate', 12),

  ('PL-ADM-001', 'administration', 'Set up and maintain the project folder structure', 'Create and maintain the agreed folders so current, shared, issued and superseded information remains clearly organised.', 'graduate', 1),
  ('PL-ADM-002', 'administration', 'Apply document naming, status and revision conventions', 'Apply the agreed identifiers, suitability codes and revision rules consistently to project information.', 'graduate', 2),
  ('PL-ADM-003', 'administration', 'Maintain the drawing and document register', 'Keep an accurate register of document titles, revisions, statuses, authors and issue dates.', 'graduate', 3),
  ('PL-ADM-004', 'administration', 'Prepare meeting agendas and minutes', 'Prepare concise agendas and records that capture decisions, responsibilities and agreed due dates.', 'graduate', 4),
  ('PL-ADM-005', 'administration', 'Maintain project action trackers', 'Record, allocate and follow up project actions using clear owners, deadlines and status information.', 'graduate', 5),
  ('PL-ADM-006', 'administration', 'Maintain RFI and technical-query registers', 'Log queries, responses, owners and dates so outstanding technical information can be tracked.', 'graduate', 6),
  ('PL-ADM-007', 'administration', 'Prepare issue sheets and document transmittals', 'Compile accurate issue records showing the information transmitted, its revision and intended recipients.', 'graduate', 7),
  ('PL-ADM-008', 'administration', 'Track design comments and responses', 'Maintain a structured record of review comments, responses, owners and closure status.', 'graduate', 8),
  ('PL-ADM-009', 'administration', 'Complete document QA and checking records', 'Support the agreed review process by recording checks, comments, responses and approval status.', 'graduate-intermediate', 9),
  ('PL-ADM-010', 'administration', 'Maintain project deliverable and programme trackers', 'Keep deliverable dates, dependencies, ownership and current progress visible to the project team.', 'graduate-intermediate', 10),
  ('PL-ADM-011', 'administration', 'Record design changes and decision history', 'Maintain a traceable record of significant design changes, reasons, approvals and affected information.', 'graduate-intermediate', 11),
  ('PL-ADM-012', 'administration', 'Assemble handover and completion-document records', 'Compile and index the agreed final records, checking that required information is present and current.', 'graduate-intermediate', 12);

alter table public.placement_task_definitions enable row level security;
alter table public.candidate_placement_workspaces enable row level security;
alter table public.candidate_placement_tasks enable row level security;
alter table public.candidate_placement_task_verification_events enable row level security;
