create function private.competency_level_number(value text)
returns integer
language sql
immutable
strict
set search_path = ''
as $$
  select case value
    when 'L1' then 1
    when 'L2' then 2
    when 'L3' then 3
    when 'L4' then 4
    when 'L5' then 5
  end;
$$;

revoke all on function private.competency_level_number(text) from public;

create function public.initialize_candidate_competency(
  p_candidate_id uuid,
  p_competency_definition_id text,
  p_initial_level text,
  p_occurred_at timestamptz,
  p_performed_by_display_name text,
  p_reason text
)
returns table (candidate_competency_id uuid, initial_cycle_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  new_candidate_competency_id uuid := gen_random_uuid();
  new_cycle_id uuid := gen_random_uuid();
begin
  if current_user_id is null
    or not private.can_verify_candidate_evidence(p_candidate_id)
  then
    raise exception using errcode = '42501',
      message = 'Only an assigned mentor or organization administrator may initialize a candidate competency.';
  end if;

  if p_initial_level <> 'L1' then
    raise exception using errcode = '22023',
      message = 'An initial candidate competency cycle must start at L1.';
  end if;

  if p_occurred_at is null
    or nullif(btrim(p_performed_by_display_name), '') is null
  then
    raise exception using errcode = '22023',
      message = 'Initialization requires an occurrence time and performer display name.';
  end if;

  perform 1
  from public.candidates as candidate
  where candidate.id = p_candidate_id
  for update;

  if not found then
    raise exception using errcode = '23503', message = 'Candidate not found.';
  end if;

  if not exists (
    select 1
    from public.competency_definitions as definition
    where definition.id = p_competency_definition_id
      and definition.is_active
  ) then
    raise exception using errcode = '23503',
      message = 'Active competency definition not found.';
  end if;

  insert into public.candidate_competencies (
    id,
    candidate_id,
    competency_definition_id,
    active_cycle_id,
    created_at,
    updated_at
  ) values (
    new_candidate_competency_id,
    p_candidate_id,
    p_competency_definition_id,
    null,
    p_occurred_at,
    p_occurred_at
  );

  insert into public.competency_cycles (
    id,
    candidate_competency_id,
    level,
    status,
    opened_at,
    opened_by_user_id,
    opened_by_display_name,
    created_at,
    updated_at
  ) values (
    new_cycle_id,
    new_candidate_competency_id,
    p_initial_level,
    'open',
    p_occurred_at,
    current_user_id,
    p_performed_by_display_name,
    p_occurred_at,
    p_occurred_at
  );

  update public.candidate_competencies
  set active_cycle_id = new_cycle_id,
      updated_at = p_occurred_at
  where id = new_candidate_competency_id;

  insert into public.progression_events (
    candidate_id,
    candidate_competency_id,
    cycle_id,
    event_type,
    occurred_at,
    performed_by_user_id,
    performed_by_display_name,
    reason,
    level
  ) values (
    p_candidate_id,
    new_candidate_competency_id,
    new_cycle_id,
    'cycle-opened',
    p_occurred_at,
    current_user_id,
    p_performed_by_display_name,
    p_reason,
    p_initial_level
  );

  return query select new_candidate_competency_id, new_cycle_id;
end;
$$;

create function public.complete_active_competency_cycle(
  p_candidate_competency_id uuid,
  p_mentor_assessment_id uuid,
  p_occurred_at timestamptz,
  p_performed_by_display_name text,
  p_mentor_completed_at timestamptz,
  p_mentor_completed_by_user_id uuid,
  p_mentor_completed_by_display_name text,
  p_manager_signed_off_at timestamptz,
  p_manager_signed_off_by_user_id uuid,
  p_manager_signed_off_by_display_name text,
  p_manager_signoff_confirmed boolean,
  p_reason text,
  p_evidence_basis text,
  p_carry_forward_selections jsonb
)
returns table (
  completed_cycle_id uuid,
  destination_cycle_id uuid,
  progression_event_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  competency_row public.candidate_competencies%rowtype;
  active_cycle public.competency_cycles%rowtype;
  action_row public.development_actions%rowtype;
  assessment_status text;
  assessment_recommendation text;
  destination_level text;
  new_cycle_id uuid;
  new_event_id uuid := gen_random_uuid();
  selection jsonb;
  selected_action_id uuid;
  selected_due_date date;
begin
  select * into competency_row
  from public.candidate_competencies
  where id = p_candidate_competency_id
  for update;

  if not found then
    raise exception using errcode = '23503', message = 'Candidate competency not found.';
  end if;

  if current_user_id is null
    or not private.can_verify_candidate_evidence(competency_row.candidate_id)
  then
    raise exception using errcode = '42501',
      message = 'Only an assigned mentor or organization administrator may complete a competency cycle.';
  end if;

  if competency_row.active_cycle_id is null then
    raise exception using errcode = '22023', message = 'The candidate competency has no active cycle.';
  end if;

  select * into active_cycle
  from public.competency_cycles
  where id = competency_row.active_cycle_id
    and candidate_competency_id = competency_row.id
  for update;

  if not found or active_cycle.status <> 'open' then
    raise exception using errcode = '22023', message = 'The active competency cycle must be open.';
  end if;

  select assessment.status, assessment.recommendation
    into assessment_status, assessment_recommendation
  from public.mentor_assessments as assessment
  where assessment.id = p_mentor_assessment_id
    and assessment.candidate_id = competency_row.candidate_id
    and assessment.candidate_competency_id = competency_row.id
    and assessment.cycle_id = active_cycle.id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'A matching mentor assessment is required.';
  end if;

  if assessment_status <> 'demonstrated' then
    raise exception using errcode = '22023', message = 'The matching assessment must be demonstrated.';
  end if;

  if assessment_recommendation <> 'progress-discussion' then
    raise exception using errcode = '22023',
      message = 'The matching assessment must recommend a progression discussion.';
  end if;

  if p_occurred_at is null
    or p_mentor_completed_at is null
    or p_manager_signed_off_at is null
    or not coalesce(p_manager_signoff_confirmed, false)
    or nullif(btrim(p_performed_by_display_name), '') is null
    or nullif(btrim(p_mentor_completed_by_display_name), '') is null
    or nullif(btrim(p_manager_signed_off_by_display_name), '') is null
    or nullif(btrim(p_reason), '') is null
    or nullif(btrim(p_evidence_basis), '') is null
  then
    raise exception using errcode = '22023',
      message = 'Completion requires mentor completion, manager sign-off, confirmation, reason, and evidence basis.';
  end if;

  if p_mentor_completed_by_user_id is not null and not exists (
    select 1
    from public.candidate_relationships as relationship
    join public.candidates as candidate
      on candidate.id = relationship.candidate_id
    join public.organization_memberships as membership
      on membership.organization_id = candidate.organization_id
     and membership.user_id = relationship.user_id
     and membership.archived_at is null
    where relationship.candidate_id = competency_row.candidate_id
      and relationship.user_id = p_mentor_completed_by_user_id
      and relationship.relationship_type = 'mentor'
      and relationship.starts_at <= p_mentor_completed_at
      and (relationship.ends_at is null or relationship.ends_at >= p_mentor_completed_at)
  ) then
    raise exception using errcode = '23514',
      message = 'The mentor completion user must be an applicable candidate mentor.';
  end if;

  if p_manager_signed_off_by_user_id is not null and not exists (
    select 1
    from public.candidate_relationships as relationship
    join public.candidates as candidate
      on candidate.id = relationship.candidate_id
    join public.organization_memberships as membership
      on membership.organization_id = candidate.organization_id
     and membership.user_id = relationship.user_id
     and membership.archived_at is null
    where relationship.candidate_id = competency_row.candidate_id
      and relationship.user_id = p_manager_signed_off_by_user_id
      and relationship.relationship_type = 'manager'
      and relationship.starts_at <= p_manager_signed_off_at
      and (relationship.ends_at is null or relationship.ends_at >= p_manager_signed_off_at)
  ) then
    raise exception using errcode = '23514',
      message = 'The manager sign-off user must be an applicable candidate manager.';
  end if;

  if p_carry_forward_selections is null then
    p_carry_forward_selections := '[]'::jsonb;
  end if;

  if jsonb_typeof(p_carry_forward_selections) <> 'array' then
    raise exception using errcode = '22023', message = 'Carry-forward selections must be a JSON array.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_carry_forward_selections) as item
    group by item ->> 'actionId'
    having count(*) > 1
  ) then
    raise exception using errcode = '22023', message = 'Carry-forward action selections must be unique.';
  end if;

  destination_level := case active_cycle.level
    when 'L1' then 'L2'
    when 'L2' then 'L3'
    when 'L3' then 'L4'
    when 'L4' then 'L5'
    when 'L5' then null
  end;

  if destination_level is null and jsonb_array_length(p_carry_forward_selections) > 0 then
    raise exception using errcode = '22023', message = 'L5 completion cannot carry actions into a higher cycle.';
  end if;

  if destination_level is not null then
    new_cycle_id := gen_random_uuid();

    insert into public.competency_cycles (
      id,
      candidate_competency_id,
      level,
      status,
      opened_at,
      opened_by_user_id,
      opened_by_display_name,
      created_at,
      updated_at
    ) values (
      new_cycle_id,
      competency_row.id,
      destination_level,
      'open',
      p_occurred_at,
      p_mentor_completed_by_user_id,
      p_mentor_completed_by_display_name,
      p_occurred_at,
      p_occurred_at
    );

    for selection in
      select value from jsonb_array_elements(p_carry_forward_selections)
    loop
      begin
        selected_action_id := (selection ->> 'actionId')::uuid;
        selected_due_date := (selection ->> 'newDueDate')::date;
      exception when others then
        raise exception using errcode = '22023',
          message = 'Every carry-forward selection requires a valid actionId and newDueDate.';
      end;

      if selected_due_date is null then
        raise exception using errcode = '22023',
          message = 'Every selected carry-forward action requires a new due date.';
      end if;

      select * into action_row
      from public.development_actions
      where id = selected_action_id
        and candidate_id = competency_row.candidate_id
        and candidate_competency_id = competency_row.id
        and cycle_id = active_cycle.id
      for update;

      if not found then
        raise exception using errcode = '23514',
          message = 'A selected carry-forward action does not belong to the active cycle.';
      end if;

      insert into public.development_actions (
        candidate_id,
        candidate_competency_id,
        cycle_id,
        source_standard_task_definition_id,
        carried_forward_from_action_id,
        title,
        notes,
        owner,
        priority,
        status,
        due_date,
        created_at,
        created_by_user_id,
        created_by_display_name,
        updated_at
      ) values (
        action_row.candidate_id,
        action_row.candidate_competency_id,
        new_cycle_id,
        action_row.source_standard_task_definition_id,
        action_row.id,
        action_row.title,
        action_row.notes,
        action_row.owner,
        action_row.priority,
        'open',
        selected_due_date,
        p_occurred_at,
        current_user_id,
        p_performed_by_display_name,
        p_occurred_at
      );
    end loop;
  end if;

  update public.competency_cycles
  set status = 'completed',
      completed_at = p_mentor_completed_at,
      completed_by_user_id = p_mentor_completed_by_user_id,
      completed_by_display_name = p_mentor_completed_by_display_name,
      completion_reason = p_reason,
      updated_at = p_occurred_at
  where id = active_cycle.id;

  update public.candidate_competencies
  set active_cycle_id = coalesce(new_cycle_id, active_cycle.id),
      updated_at = p_occurred_at
  where id = competency_row.id;

  insert into public.progression_events (
    id,
    candidate_id,
    candidate_competency_id,
    cycle_id,
    event_type,
    occurred_at,
    performed_by_user_id,
    performed_by_display_name,
    reason,
    from_level,
    to_level,
    destination_cycle_id,
    mentor_approved_at,
    mentor_approved_by_user_id,
    mentor_approved_by_display_name,
    manager_signed_off_at,
    manager_signed_off_by_user_id,
    manager_signed_off_by_display_name,
    manager_signoff_confirmed,
    approval_authority,
    evidence_basis
  ) values (
    new_event_id,
    competency_row.candidate_id,
    competency_row.id,
    active_cycle.id,
    'cycle-completed',
    p_occurred_at,
    current_user_id,
    p_performed_by_display_name,
    p_reason,
    active_cycle.level,
    destination_level,
    new_cycle_id,
    p_mentor_completed_at,
    p_mentor_completed_by_user_id,
    p_mentor_completed_by_display_name,
    p_manager_signed_off_at,
    p_manager_signed_off_by_user_id,
    p_manager_signed_off_by_display_name,
    true,
    'mentor-and-manager',
    p_evidence_basis
  );

  return query select active_cycle.id, new_cycle_id, new_event_id;
end;
$$;

create function public.reset_active_competency_cycle(
  p_candidate_competency_id uuid,
  p_occurred_at timestamptz,
  p_performed_by_display_name text,
  p_reason text
)
returns table (
  locked_cycle_id uuid,
  replacement_cycle_id uuid,
  reset_event_id uuid,
  opened_event_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  competency_row public.candidate_competencies%rowtype;
  active_cycle public.competency_cycles%rowtype;
  new_cycle_id uuid := gen_random_uuid();
  new_reset_event_id uuid := gen_random_uuid();
  new_opened_event_id uuid := gen_random_uuid();
begin
  select * into competency_row
  from public.candidate_competencies
  where id = p_candidate_competency_id
  for update;

  if not found then
    raise exception using errcode = '23503', message = 'Candidate competency not found.';
  end if;

  if current_user_id is null
    or not private.can_verify_candidate_evidence(competency_row.candidate_id)
  then
    raise exception using errcode = '42501',
      message = 'Only an assigned mentor or organization administrator may reset an active cycle.';
  end if;

  if competency_row.active_cycle_id is null then
    raise exception using errcode = '22023', message = 'The candidate competency has no active cycle.';
  end if;

  select * into active_cycle
  from public.competency_cycles
  where id = competency_row.active_cycle_id
    and candidate_competency_id = competency_row.id
  for update;

  if not found or active_cycle.status <> 'open' then
    raise exception using errcode = '22023', message = 'The active competency cycle must be open.';
  end if;

  if p_occurred_at is null
    or nullif(btrim(p_performed_by_display_name), '') is null
    or nullif(btrim(p_reason), '') is null
  then
    raise exception using errcode = '22023',
      message = 'Cycle reset requires an occurrence time, performer, and reason.';
  end if;

  update public.competency_cycles
  set status = 'locked', updated_at = p_occurred_at
  where id = active_cycle.id;

  insert into public.competency_cycles (
    id,
    candidate_competency_id,
    level,
    status,
    opened_at,
    opened_by_user_id,
    opened_by_display_name,
    created_at,
    updated_at
  ) values (
    new_cycle_id,
    competency_row.id,
    active_cycle.level,
    'open',
    p_occurred_at,
    current_user_id,
    p_performed_by_display_name,
    p_occurred_at,
    p_occurred_at
  );

  update public.candidate_competencies
  set active_cycle_id = new_cycle_id, updated_at = p_occurred_at
  where id = competency_row.id;

  insert into public.progression_events (
    id, candidate_id, candidate_competency_id, cycle_id, event_type,
    occurred_at, performed_by_user_id, performed_by_display_name, reason
  ) values (
    new_reset_event_id, competency_row.candidate_id, competency_row.id,
    active_cycle.id, 'cycle-reset', p_occurred_at, current_user_id,
    p_performed_by_display_name, p_reason
  );

  insert into public.progression_events (
    id, candidate_id, candidate_competency_id, cycle_id, event_type,
    occurred_at, performed_by_user_id, performed_by_display_name, reason,
    level, previous_cycle_id
  ) values (
    new_opened_event_id, competency_row.candidate_id, competency_row.id,
    new_cycle_id, 'cycle-opened', p_occurred_at, current_user_id,
    p_performed_by_display_name, p_reason, active_cycle.level, active_cycle.id
  );

  return query
    select active_cycle.id, new_cycle_id, new_reset_event_id, new_opened_event_id;
end;
$$;

create function public.reopen_earlier_competency_level(
  p_candidate_competency_id uuid,
  p_level text,
  p_represented_cycle_ids uuid[],
  p_occurred_at timestamptz,
  p_performed_by_display_name text,
  p_reason text
)
returns table (reopened_cycle_id uuid, reopened_event_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  competency_row public.candidate_competencies%rowtype;
  active_cycle public.competency_cycles%rowtype;
  represented_cycle public.competency_cycles%rowtype;
  new_cycle_id uuid := gen_random_uuid();
  new_event_id uuid := gen_random_uuid();
  represented_cycle_id uuid;
  expected_cycle_count integer;
begin
  select * into competency_row
  from public.candidate_competencies
  where id = p_candidate_competency_id
  for update;

  if not found then
    raise exception using errcode = '23503', message = 'Candidate competency not found.';
  end if;

  if current_user_id is null
    or not private.can_verify_candidate_evidence(competency_row.candidate_id)
  then
    raise exception using errcode = '42501',
      message = 'Only an assigned mentor or organization administrator may reopen an earlier level.';
  end if;

  if competency_row.active_cycle_id is null then
    raise exception using errcode = '22023', message = 'The candidate competency has no active cycle.';
  end if;

  select * into active_cycle
  from public.competency_cycles
  where id = competency_row.active_cycle_id
    and candidate_competency_id = competency_row.id
  for update;

  if not found or active_cycle.status <> 'open' then
    raise exception using errcode = '22023', message = 'The active competency cycle must be open.';
  end if;

  if private.competency_level_number(p_level) is null
    or private.competency_level_number(p_level) >= private.competency_level_number(active_cycle.level)
  then
    raise exception using errcode = '22023', message = 'An explicitly earlier competency level is required.';
  end if;

  if p_occurred_at is null
    or nullif(btrim(p_performed_by_display_name), '') is null
    or nullif(btrim(p_reason), '') is null
  then
    raise exception using errcode = '22023',
      message = 'Reopening requires an occurrence time, performer, and reason.';
  end if;

  expected_cycle_count :=
    private.competency_level_number(active_cycle.level)
    - private.competency_level_number(p_level);

  if coalesce(cardinality(p_represented_cycle_ids), 0) <> expected_cycle_count
    or (
      select count(distinct represented.id)
      from unnest(p_represented_cycle_ids) as represented(id)
    ) <> expected_cycle_count
  then
    raise exception using errcode = '22023',
      message = 'Exactly one represented cycle is required for each applicable later level.';
  end if;

  foreach represented_cycle_id in array p_represented_cycle_ids
  loop
    select * into represented_cycle
    from public.competency_cycles
    where id = represented_cycle_id
      and candidate_competency_id = competency_row.id
    for update;

    if not found
      or private.competency_level_number(represented_cycle.level)
        <= private.competency_level_number(p_level)
      or private.competency_level_number(represented_cycle.level)
        > private.competency_level_number(active_cycle.level)
    then
      raise exception using errcode = '23514',
        message = 'A represented cycle is not an applicable owned later-level cycle.';
    end if;

    if represented_cycle.level = active_cycle.level
      and represented_cycle.id <> active_cycle.id
    then
      raise exception using errcode = '23514',
        message = 'The represented current-level cycle must be the active cycle.';
    end if;
  end loop;

  if (
    select count(distinct cycle.level)
    from public.competency_cycles as cycle
    where cycle.id = any(p_represented_cycle_ids)
      and cycle.candidate_competency_id = competency_row.id
  ) <> expected_cycle_count
  then
    raise exception using errcode = '22023',
      message = 'Represented cycles must cover every applicable later level exactly once.';
  end if;

  foreach represented_cycle_id in array p_represented_cycle_ids
  loop
    select * into represented_cycle
    from public.competency_cycles
    where id = represented_cycle_id;

    if represented_cycle.status not in ('archived', 'locked') then
      update public.competency_cycles
      set status = 'paused', updated_at = p_occurred_at
      where id = represented_cycle.id;

      insert into public.progression_events (
        candidate_id, candidate_competency_id, cycle_id, event_type,
        occurred_at, performed_by_user_id, performed_by_display_name, reason
      ) values (
        competency_row.candidate_id, competency_row.id, represented_cycle.id,
        'cycle-paused', p_occurred_at, current_user_id,
        p_performed_by_display_name, p_reason
      );
    end if;
  end loop;

  insert into public.competency_cycles (
    id,
    candidate_competency_id,
    level,
    status,
    opened_at,
    opened_by_user_id,
    opened_by_display_name,
    created_at,
    updated_at
  ) values (
    new_cycle_id,
    competency_row.id,
    p_level,
    'open',
    p_occurred_at,
    current_user_id,
    p_performed_by_display_name,
    p_occurred_at,
    p_occurred_at
  );

  update public.candidate_competencies
  set active_cycle_id = new_cycle_id, updated_at = p_occurred_at
  where id = competency_row.id;

  insert into public.progression_events (
    id, candidate_id, candidate_competency_id, cycle_id, event_type,
    occurred_at, performed_by_user_id, performed_by_display_name, reason
  ) values (
    new_event_id, competency_row.candidate_id, competency_row.id,
    new_cycle_id, 'cycle-reopened', p_occurred_at, current_user_id,
    p_performed_by_display_name, p_reason
  );

  return query select new_cycle_id, new_event_id;
end;
$$;

revoke all on function public.initialize_candidate_competency(
  uuid, text, text, timestamptz, text, text
) from public;
revoke all on function public.complete_active_competency_cycle(
  uuid, uuid, timestamptz, text, timestamptz, uuid, text, timestamptz,
  uuid, text, boolean, text, text, jsonb
) from public;
revoke all on function public.reset_active_competency_cycle(
  uuid, timestamptz, text, text
) from public;
revoke all on function public.reopen_earlier_competency_level(
  uuid, text, uuid[], timestamptz, text, text
) from public;

grant execute on function public.initialize_candidate_competency(
  uuid, text, text, timestamptz, text, text
) to authenticated;
grant execute on function public.complete_active_competency_cycle(
  uuid, uuid, timestamptz, text, timestamptz, uuid, text, timestamptz,
  uuid, text, boolean, text, text, jsonb
) to authenticated;
grant execute on function public.reset_active_competency_cycle(
  uuid, timestamptz, text, text
) to authenticated;
grant execute on function public.reopen_earlier_competency_level(
  uuid, text, uuid[], timestamptz, text, text
) to authenticated;
