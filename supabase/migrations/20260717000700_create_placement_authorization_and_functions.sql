create function private.can_view_candidate_placements(
  target_candidate_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and private.can_access_candidate(target_candidate_id);
$$;

create function private.can_assign_candidate_placement_tasks(
  target_candidate_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
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
            and relationship.relationship_type = 'mentor'
            and relationship.user_id = auth.uid()
            and relationship.starts_at <= now()
            and relationship.ends_at is null
        )
      )
  );
$$;

create function private.can_update_candidate_placement_progress(
  target_candidate_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.candidates as candidate
    join public.organization_memberships as membership
      on membership.organization_id = candidate.organization_id
     and membership.user_id = auth.uid()
     and membership.archived_at is null
    where candidate.id = target_candidate_id
      and candidate.user_id = auth.uid()
  );
$$;

create function private.can_verify_candidate_placement_tasks(
  target_candidate_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
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
            and relationship.relationship_type = 'mentor'
            and relationship.user_id = auth.uid()
            and relationship.starts_at <= now()
            and relationship.ends_at is null
        )
      )
  );
$$;

revoke all on function private.can_view_candidate_placements(uuid) from public;
revoke all on function private.can_assign_candidate_placement_tasks(uuid) from public;
revoke all on function private.can_update_candidate_placement_progress(uuid) from public;
revoke all on function private.can_verify_candidate_placement_tasks(uuid) from public;

grant execute on function private.can_view_candidate_placements(uuid) to authenticated;
grant execute on function private.can_assign_candidate_placement_tasks(uuid) to authenticated;
grant execute on function private.can_update_candidate_placement_progress(uuid) to authenticated;
grant execute on function private.can_verify_candidate_placement_tasks(uuid) to authenticated;

create policy placement_task_definitions_select_active
on public.placement_task_definitions
for select
to authenticated
using (is_active);

create policy candidate_placement_workspaces_select_authorized
on public.candidate_placement_workspaces
for select
to authenticated
using (private.can_view_candidate_placements(candidate_id));

create policy candidate_placement_tasks_select_authorized
on public.candidate_placement_tasks
for select
to authenticated
using (
  exists (
    select 1
    from public.candidate_placement_workspaces as workspace
    where workspace.id = candidate_placement_tasks.candidate_placement_workspace_id
      and private.can_view_candidate_placements(workspace.candidate_id)
  )
);

create policy candidate_placement_task_events_select_authorized
on public.candidate_placement_task_verification_events
for select
to authenticated
using (
  exists (
    select 1
    from public.candidate_placement_tasks as task
    join public.candidate_placement_workspaces as workspace
      on workspace.id = task.candidate_placement_workspace_id
    where task.id = candidate_placement_task_verification_events.candidate_placement_task_id
      and private.can_view_candidate_placements(workspace.candidate_id)
  )
);

revoke all on table public.placement_task_definitions from public, anon, authenticated;
revoke all on table public.candidate_placement_workspaces from public, anon, authenticated;
revoke all on table public.candidate_placement_tasks from public, anon, authenticated;
revoke all on table public.candidate_placement_task_verification_events from public, anon, authenticated;

grant select on table public.placement_task_definitions to authenticated;
grant select on table public.candidate_placement_workspaces to authenticated;
grant select on table public.candidate_placement_tasks to authenticated;
grant select on table public.candidate_placement_task_verification_events to authenticated;

create function public.assign_candidate_placement_tasks(
  p_candidate_id uuid,
  p_placement_discipline text,
  p_task_definition_ids text[]
)
returns setof public.candidate_placement_tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  actor_display_name text;
  candidate_home_discipline text;
  workspace_id uuid;
begin
  if actor_user_id is null then
    raise exception using
      errcode = '28000',
      message = 'Authentication is required to assign placement tasks.';
  end if;

  if p_candidate_id is null then
    raise exception using
      errcode = '22023',
      message = 'A placement candidate is required.';
  end if;

  select candidate.discipline
  into candidate_home_discipline
  from public.candidates as candidate
  where candidate.id = p_candidate_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'The placement candidate does not exist.';
  end if;

  if not private.can_assign_candidate_placement_tasks(p_candidate_id) then
    raise exception using
      errcode = '42501',
      message = 'You are not authorised to assign placement tasks.';
  end if;

  select nullif(btrim(profile.display_name), '')
  into actor_display_name
  from public.user_profiles as profile
  where profile.user_id = actor_user_id;

  if actor_display_name is null then
    raise exception using
      errcode = '22023',
      message = 'The authenticated user must have a display name.';
  end if;

  if p_placement_discipline not in (
    'mechanical-public-health',
    'electrical',
    'sustainability',
    'administration'
  ) or p_placement_discipline is null then
    raise exception using
      errcode = '22023',
      message = 'The placement discipline is not recognised.';
  end if;

  if candidate_home_discipline not in (
    'Mechanical & Public Health',
    'Electrical',
    'Sustainability'
  ) then
    raise exception using
      errcode = '22023',
      message = 'The candidate home discipline is not recognised for placements.';
  end if;

  if not private.is_candidate_placement_discipline_eligible(
    candidate_home_discipline,
    p_placement_discipline
  ) then
    raise exception using
      errcode = '22023',
      message = 'The placement discipline is not eligible for the candidate home discipline.';
  end if;

  if p_task_definition_ids is null then
    raise exception using
      errcode = '22023',
      message = 'Placement task selections must be supplied.';
  end if;

  if cardinality(p_task_definition_ids) = 0 then
    raise exception using
      errcode = '22023',
      message = 'At least one placement task must be selected.';
  end if;

  if exists (
    select 1
    from unnest(p_task_definition_ids) as requested(task_definition_id)
    where requested.task_definition_id is null
  ) then
    raise exception using
      errcode = '22023',
      message = 'Placement task selections cannot contain null values.';
  end if;

  if cardinality(p_task_definition_ids) <> cardinality(array(
    select distinct requested.task_definition_id
    from unnest(p_task_definition_ids) as requested(task_definition_id)
  )) then
    raise exception using
      errcode = '22023',
      message = 'Placement task selections cannot contain duplicates.';
  end if;

  if exists (
    select 1
    from unnest(p_task_definition_ids) as requested(task_definition_id)
    left join public.placement_task_definitions as definition
      on definition.id = requested.task_definition_id
    where definition.id is null
      or not definition.is_active
  ) then
    raise exception using
      errcode = '22023',
      message = 'A selected placement task is unrecognised or inactive.';
  end if;

  if exists (
    select 1
    from unnest(p_task_definition_ids) as requested(task_definition_id)
    join public.placement_task_definitions as definition
      on definition.id = requested.task_definition_id
    where definition.discipline is distinct from p_placement_discipline
  ) then
    raise exception using
      errcode = '22023',
      message = 'Every selected task must match the placement discipline.';
  end if;

  insert into public.candidate_placement_workspaces (
    candidate_id,
    placement_discipline,
    created_by_user_id,
    created_by_display_name
  )
  values (
    p_candidate_id,
    p_placement_discipline,
    actor_user_id,
    actor_display_name
  )
  on conflict (candidate_id, placement_discipline) do nothing;

  select workspace.id
  into workspace_id
  from public.candidate_placement_workspaces as workspace
  where workspace.candidate_id = p_candidate_id
    and workspace.placement_discipline = p_placement_discipline
  for update;

  if exists (
    select 1
    from public.candidate_placement_tasks as task
    where task.candidate_placement_workspace_id = workspace_id
      and task.task_definition_id = any(p_task_definition_ids)
  ) then
    raise exception using
      errcode = '23505',
      message = 'One or more selected placement tasks are already assigned.';
  end if;

  return query
  insert into public.candidate_placement_tasks as assigned_task (
    candidate_placement_workspace_id,
    task_definition_id,
    assigned_by_user_id,
    assigned_by_display_name
  )
  select
    workspace_id,
    requested.task_definition_id,
    actor_user_id,
    actor_display_name
  from unnest(p_task_definition_ids) as requested(task_definition_id)
  returning assigned_task.*;
end;
$$;

create function public.update_candidate_placement_task_progress(
  p_candidate_placement_task_id uuid,
  p_candidate_progress text,
  p_candidate_note text
)
returns public.candidate_placement_tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  actor_display_name text;
  target_candidate_id uuid;
  normalized_note text := btrim(coalesce(p_candidate_note, ''));
  latest_verification_type text;
  task_row public.candidate_placement_tasks%rowtype;
begin
  if actor_user_id is null then
    raise exception using
      errcode = '28000',
      message = 'Authentication is required to update placement progress.';
  end if;

  if p_candidate_placement_task_id is null then
    raise exception using
      errcode = '22023',
      message = 'A placement task is required.';
  end if;

  if p_candidate_progress not in ('not-started', 'in-progress', 'complete')
    or p_candidate_progress is null
  then
    raise exception using
      errcode = '22023',
      message = 'The candidate placement progress value is not recognised.';
  end if;

  if char_length(normalized_note) > 1000 then
    raise exception using
      errcode = '22023',
      message = 'The candidate placement note must not exceed 1000 characters.';
  end if;

  select task.*
  into task_row
  from public.candidate_placement_tasks as task
  where task.id = p_candidate_placement_task_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'The placement task does not exist.';
  end if;

  select workspace.candidate_id
  into target_candidate_id
  from public.candidate_placement_workspaces as workspace
  where workspace.id = task_row.candidate_placement_workspace_id;

  if not private.can_update_candidate_placement_progress(target_candidate_id) then
    raise exception using
      errcode = '42501',
      message = 'You are not authorised to update this placement task.';
  end if;

  select nullif(btrim(profile.display_name), '')
  into actor_display_name
  from public.user_profiles as profile
  where profile.user_id = actor_user_id;

  if actor_display_name is null then
    raise exception using
      errcode = '22023',
      message = 'The authenticated user must have a display name.';
  end if;

  if task_row.candidate_progress = p_candidate_progress
    and task_row.candidate_note = normalized_note
  then
    return task_row;
  end if;

  select verification.event_type
  into latest_verification_type
  from public.candidate_placement_task_verification_events as verification
  where verification.candidate_placement_task_id = p_candidate_placement_task_id
  order by
    verification.occurred_at desc,
    verification.created_at desc,
    verification.id desc
  limit 1;

  update public.candidate_placement_tasks
  set candidate_progress = p_candidate_progress,
      candidate_note = normalized_note,
      candidate_updated_at = transaction_timestamp(),
      candidate_updated_by_user_id = actor_user_id,
      candidate_updated_by_display_name = actor_display_name,
      updated_at = transaction_timestamp()
  where id = p_candidate_placement_task_id
  returning * into task_row;

  if latest_verification_type = 'verified' then
    insert into public.candidate_placement_task_verification_events (
      candidate_placement_task_id,
      event_type,
      mentor_comment,
      actor_user_id,
      actor_display_name,
      occurred_at
    )
    values (
      p_candidate_placement_task_id,
      'reverification-required',
      '',
      actor_user_id,
      actor_display_name,
      transaction_timestamp()
    );
  end if;

  return task_row;
end;
$$;

create function public.record_candidate_placement_task_verification(
  p_candidate_placement_task_id uuid,
  p_decision text,
  p_mentor_comment text
)
returns public.candidate_placement_task_verification_events
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  actor_display_name text;
  target_candidate_id uuid;
  normalized_comment text := btrim(coalesce(p_mentor_comment, ''));
  task_row public.candidate_placement_tasks%rowtype;
  event_row public.candidate_placement_task_verification_events%rowtype;
begin
  if actor_user_id is null then
    raise exception using
      errcode = '28000',
      message = 'Authentication is required to verify placement tasks.';
  end if;

  if p_candidate_placement_task_id is null then
    raise exception using
      errcode = '22023',
      message = 'A placement task is required.';
  end if;

  if p_decision not in ('verified', 'changes-required') or p_decision is null then
    raise exception using
      errcode = '22023',
      message = 'The placement verification decision is not recognised.';
  end if;

  if char_length(normalized_comment) > 1000 then
    raise exception using
      errcode = '22023',
      message = 'The mentor comment must not exceed 1000 characters.';
  end if;

  select task.*
  into task_row
  from public.candidate_placement_tasks as task
  where task.id = p_candidate_placement_task_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'The placement task does not exist.';
  end if;

  select workspace.candidate_id
  into target_candidate_id
  from public.candidate_placement_workspaces as workspace
  where workspace.id = task_row.candidate_placement_workspace_id;

  if not private.can_verify_candidate_placement_tasks(target_candidate_id) then
    raise exception using
      errcode = '42501',
      message = 'You are not authorised to verify this placement task.';
  end if;

  select nullif(btrim(profile.display_name), '')
  into actor_display_name
  from public.user_profiles as profile
  where profile.user_id = actor_user_id;

  if actor_display_name is null then
    raise exception using
      errcode = '22023',
      message = 'The authenticated user must have a display name.';
  end if;

  if p_decision = 'verified' and task_row.candidate_progress <> 'complete' then
    raise exception using
      errcode = '22023',
      message = 'A placement task can be verified only when candidate progress is complete.';
  end if;

  insert into public.candidate_placement_task_verification_events (
    candidate_placement_task_id,
    event_type,
    mentor_comment,
    actor_user_id,
    actor_display_name,
    occurred_at
  )
  values (
    p_candidate_placement_task_id,
    p_decision,
    normalized_comment,
    actor_user_id,
    actor_display_name,
    transaction_timestamp()
  )
  returning * into event_row;

  return event_row;
end;
$$;

revoke all on function public.assign_candidate_placement_tasks(uuid, text, text[]) from public;
revoke all on function public.assign_candidate_placement_tasks(uuid, text, text[]) from anon;
grant execute on function public.assign_candidate_placement_tasks(uuid, text, text[]) to authenticated;

revoke all on function public.update_candidate_placement_task_progress(uuid, text, text) from public;
revoke all on function public.update_candidate_placement_task_progress(uuid, text, text) from anon;
grant execute on function public.update_candidate_placement_task_progress(uuid, text, text) to authenticated;

revoke all on function public.record_candidate_placement_task_verification(uuid, text, text) from public;
revoke all on function public.record_candidate_placement_task_verification(uuid, text, text) from anon;
grant execute on function public.record_candidate_placement_task_verification(uuid, text, text) to authenticated;
