create function private.can_edit_candidate_evidence(
  target_candidate_id uuid
)
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
        candidate.user_id = auth.uid()
        or membership.membership_role = 'organization-admin'
      )
  );
$$;

create function private.can_manage_candidate_development(
  target_candidate_id uuid
)
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
        candidate.user_id = auth.uid()
        or membership.membership_role = 'organization-admin'
        or exists (
          select 1
          from public.candidate_relationships as relationship
          where relationship.candidate_id = candidate.id
            and relationship.user_id = auth.uid()
            and relationship.relationship_type = 'mentor'
            and relationship.starts_at <= now()
            and relationship.ends_at is null
        )
      )
  );
$$;

create function private.can_verify_candidate_evidence(
  target_candidate_id uuid
)
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
            and relationship.relationship_type = 'mentor'
            and relationship.starts_at <= now()
            and relationship.ends_at is null
        )
      )
  );
$$;

revoke all on function private.can_edit_candidate_evidence(uuid) from public;
revoke all on function private.can_manage_candidate_development(uuid) from public;
revoke all on function private.can_verify_candidate_evidence(uuid) from public;

grant execute on function private.can_edit_candidate_evidence(uuid) to authenticated;
grant execute on function private.can_manage_candidate_development(uuid) to authenticated;
grant execute on function private.can_verify_candidate_evidence(uuid) to authenticated;

create function private.enforce_development_action_update_authority()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  is_mentor_or_admin boolean;
  is_linked_candidate boolean;
begin
  if current_user_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.submitted_by_user_id is not null
      and new.submitted_by_user_id <> current_user_id
    then
      raise exception using errcode = '42501',
        message = 'The development action submitter must be the authenticated writer.';
    end if;

    if new.completed_by_user_id is not null
      and new.completed_by_user_id <> current_user_id
    then
      raise exception using errcode = '42501',
        message = 'The development action completer must be the authenticated writer.';
    end if;

    if new.archived_by_user_id is not null
      and new.archived_by_user_id <> current_user_id
    then
      raise exception using errcode = '42501',
        message = 'The development action archiver must be the authenticated writer.';
    end if;

    return new;
  end if;

  is_mentor_or_admin := private.can_verify_candidate_evidence(old.candidate_id);
  is_linked_candidate := private.can_edit_candidate_evidence(old.candidate_id);

  if new.submitted_by_user_id is distinct from old.submitted_by_user_id
    and new.submitted_by_user_id is not null
    and new.submitted_by_user_id <> current_user_id
  then
    raise exception using errcode = '42501',
      message = 'The development action submitter must be the authenticated writer.';
  end if;

  if new.completed_by_user_id is distinct from old.completed_by_user_id
    and new.completed_by_user_id is not null
    and new.completed_by_user_id <> current_user_id
  then
    raise exception using errcode = '42501',
      message = 'The development action completer must be the authenticated writer.';
  end if;

  if new.archived_by_user_id is distinct from old.archived_by_user_id
    and new.archived_by_user_id is not null
    and new.archived_by_user_id <> current_user_id
  then
    raise exception using errcode = '42501',
      message = 'The development action archiver must be the authenticated writer.';
  end if;

  if is_mentor_or_admin then
    return new;
  end if;

  if not is_linked_candidate then
    raise exception using errcode = '42501',
      message = 'The authenticated user cannot update this development action.';
  end if;

  if old.status not in ('open', 'returned-for-revision')
    or new.status <> 'submitted'
    or new.submitted_at is null
    or new.submitted_by_user_id <> current_user_id
    or nullif(btrim(new.submitted_by_display_name), '') is null
  then
    raise exception using errcode = '42501',
      message = 'A candidate may only submit an open or returned development action.';
  end if;

  if new.id is distinct from old.id
    or new.candidate_id is distinct from old.candidate_id
    or new.candidate_competency_id is distinct from old.candidate_competency_id
    or new.cycle_id is distinct from old.cycle_id
    or new.source_standard_task_definition_id is distinct from old.source_standard_task_definition_id
    or new.carried_forward_from_action_id is distinct from old.carried_forward_from_action_id
    or new.title is distinct from old.title
    or new.notes is distinct from old.notes
    or new.owner is distinct from old.owner
    or new.priority is distinct from old.priority
    or new.due_date is distinct from old.due_date
    or new.created_at is distinct from old.created_at
    or new.created_by_user_id is distinct from old.created_by_user_id
    or new.created_by_display_name is distinct from old.created_by_display_name
    or new.completed_at is distinct from old.completed_at
    or new.completed_by_user_id is distinct from old.completed_by_user_id
    or new.completed_by_display_name is distinct from old.completed_by_display_name
    or new.archived_at is distinct from old.archived_at
    or new.archived_by_user_id is distinct from old.archived_by_user_id
    or new.archived_by_display_name is distinct from old.archived_by_display_name
    or new.archive_reason is distinct from old.archive_reason
  then
    raise exception using errcode = '42501',
      message = 'A candidate submission cannot change mentor-controlled development action fields.';
  end if;

  return new;
end;
$$;

create function private.enforce_evidence_cpd_signoff_authority()
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
    if new.cpd_signed_off_at is null
      and new.cpd_signed_off_by_user_id is null
      and new.cpd_signed_off_by_display_name is null
    then
      return new;
    end if;

    if not private.can_verify_candidate_evidence(new.candidate_id) then
      raise exception using errcode = '42501',
        message = 'Only an assigned mentor or organization administrator may create signed-off evidence.';
    end if;

    if new.cpd_signed_off_by_user_id is distinct from current_user_id then
      raise exception using errcode = '42501',
        message = 'The evidence CPD sign-off actor must be the authenticated writer.';
    end if;

    return new;
  end if;

  if new.cpd_signed_off_at is not distinct from old.cpd_signed_off_at
    and new.cpd_signed_off_by_user_id is not distinct from old.cpd_signed_off_by_user_id
    and new.cpd_signed_off_by_display_name is not distinct from old.cpd_signed_off_by_display_name
  then
    return new;
  end if;

  if not private.can_verify_candidate_evidence(old.candidate_id) then
    raise exception using errcode = '42501',
      message = 'Only an assigned mentor or organization administrator may change evidence CPD sign-off.';
  end if;

  if new.cpd_signed_off_by_user_id is not null
    and new.cpd_signed_off_by_user_id <> current_user_id
  then
    raise exception using errcode = '42501',
      message = 'The evidence CPD sign-off actor must be the authenticated writer.';
  end if;

  return new;
end;
$$;

create function private.enforce_accepted_evidence_link_actor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  evidence_candidate_id uuid;
begin
  if new.link_type <> 'accepted' or current_user_id is null then
    return new;
  end if;

  select evidence.candidate_id into evidence_candidate_id
  from public.evidence_entries as evidence
  where evidence.id = new.evidence_id;

  if not private.can_verify_candidate_evidence(evidence_candidate_id) then
    raise exception using errcode = '42501',
      message = 'Only an assigned mentor or organization administrator may accept an evidence competency link.';
  end if;

  if new.accepted_by_user_id is distinct from current_user_id then
    raise exception using errcode = '42501',
      message = 'The evidence competency acceptance actor must be the authenticated writer.';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_development_action_update_authority() from public;
revoke all on function private.enforce_evidence_cpd_signoff_authority() from public;
revoke all on function private.enforce_accepted_evidence_link_actor() from public;

create trigger development_actions_enforce_update_authority
before insert or update
on public.development_actions
for each row execute function private.enforce_development_action_update_authority();

create trigger evidence_entries_enforce_cpd_signoff_authority
before insert or update of cpd_signed_off_at, cpd_signed_off_by_user_id, cpd_signed_off_by_display_name
on public.evidence_entries
for each row execute function private.enforce_evidence_cpd_signoff_authority();

create trigger evidence_competency_links_enforce_accepted_actor
before insert or update of link_type, accepted_by_user_id, accepted_by_display_name, accepted_at
on public.evidence_competency_links
for each row execute function private.enforce_accepted_evidence_link_actor();

create policy standard_task_definitions_select_authenticated
on public.standard_task_definitions
for select
to authenticated
using (true);

create policy evidence_entries_select_authorized
on public.evidence_entries
for select
to authenticated
using (private.can_access_candidate(candidate_id));

create policy evidence_entries_insert_owner_or_admin
on public.evidence_entries
for insert
to authenticated
with check (
  private.can_edit_candidate_evidence(candidate_id)
  or (
    private.can_verify_candidate_evidence(candidate_id)
    and cpd_signed_off_at is not null
    and cpd_signed_off_by_user_id = auth.uid()
  )
);

create policy evidence_entries_update_owner_or_admin
on public.evidence_entries
for update
to authenticated
using (private.can_edit_candidate_evidence(candidate_id))
with check (private.can_edit_candidate_evidence(candidate_id));

create policy evidence_competency_links_select_authorized
on public.evidence_competency_links
for select
to authenticated
using (
  exists (
    select 1
    from public.evidence_entries as evidence
    where evidence.id = evidence_competency_links.evidence_id
      and private.can_access_candidate(evidence.candidate_id)
  )
);

create policy evidence_competency_links_insert_development_manager
on public.evidence_competency_links
for insert
to authenticated
with check (
  exists (
    select 1
    from public.evidence_entries as evidence
    where evidence.id = evidence_competency_links.evidence_id
      and private.can_manage_candidate_development(evidence.candidate_id)
      and (
        evidence_competency_links.link_type <> 'accepted'
        or private.can_verify_candidate_evidence(evidence.candidate_id)
      )
  )
);

create policy evidence_competency_links_update_development_manager
on public.evidence_competency_links
for update
to authenticated
using (
  exists (
    select 1
    from public.evidence_entries as evidence
    where evidence.id = evidence_competency_links.evidence_id
      and private.can_verify_candidate_evidence(evidence.candidate_id)
  )
)
with check (
  exists (
    select 1
    from public.evidence_entries as evidence
    where evidence.id = evidence_competency_links.evidence_id
      and private.can_verify_candidate_evidence(evidence.candidate_id)
  )
);

create policy evidence_competency_links_delete_development_manager
on public.evidence_competency_links
for delete
to authenticated
using (
  exists (
    select 1
    from public.evidence_entries as evidence
    where evidence.id = evidence_competency_links.evidence_id
      and private.can_manage_candidate_development(evidence.candidate_id)
  )
);

create policy development_actions_select_authorized
on public.development_actions
for select
to authenticated
using (private.can_access_candidate(candidate_id));

create policy development_actions_insert_mentor_or_admin
on public.development_actions
for insert
to authenticated
with check (
  private.can_verify_candidate_evidence(candidate_id)
  and created_by_user_id = auth.uid()
);

create policy development_actions_update_development_manager
on public.development_actions
for update
to authenticated
using (private.can_manage_candidate_development(candidate_id))
with check (private.can_manage_candidate_development(candidate_id));

create policy evidence_action_links_select_authorized
on public.evidence_action_links
for select
to authenticated
using (
  exists (
    select 1
    from public.evidence_entries as evidence
    where evidence.id = evidence_action_links.evidence_id
      and private.can_access_candidate(evidence.candidate_id)
  )
);

create policy evidence_action_links_insert_development_manager
on public.evidence_action_links
for insert
to authenticated
with check (
  created_by_user_id = auth.uid()
  and exists (
    select 1
    from public.evidence_entries as evidence
    where evidence.id = evidence_action_links.evidence_id
      and private.can_manage_candidate_development(evidence.candidate_id)
  )
);

create policy evidence_action_links_delete_development_manager
on public.evidence_action_links
for delete
to authenticated
using (
  exists (
    select 1
    from public.evidence_entries as evidence
    where evidence.id = evidence_action_links.evidence_id
      and private.can_manage_candidate_development(evidence.candidate_id)
  )
);

create policy evidence_verification_events_select_authorized
on public.evidence_verification_events
for select
to authenticated
using (
  exists (
    select 1
    from public.evidence_entries as evidence
    where evidence.id = evidence_verification_events.evidence_id
      and private.can_access_candidate(evidence.candidate_id)
  )
);

create policy evidence_verification_events_insert_verifier
on public.evidence_verification_events
for insert
to authenticated
with check (
  actor_user_id = auth.uid()
  and exists (
    select 1
    from public.evidence_entries as evidence
    where evidence.id = evidence_verification_events.evidence_id
      and private.can_verify_candidate_evidence(evidence.candidate_id)
  )
);
