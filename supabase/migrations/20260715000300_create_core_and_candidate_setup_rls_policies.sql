create function private.can_access_candidate(
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
            and relationship.starts_at <= now()
            and relationship.ends_at is null
        )
      )
  );
$$;

create function private.can_manage_candidate_pathway(
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

revoke all on function private.can_access_candidate(uuid) from public;
revoke all on function private.can_manage_candidate_pathway(uuid) from public;

grant execute on function private.can_access_candidate(uuid) to authenticated;
grant execute on function private.can_manage_candidate_pathway(uuid) to authenticated;

create policy user_profiles_select_own
on public.user_profiles
for select
to authenticated
using (user_id = auth.uid());

create policy user_profiles_insert_own
on public.user_profiles
for insert
to authenticated
with check (user_id = auth.uid());

create policy user_profiles_update_own
on public.user_profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy organizations_select_member
on public.organizations
for select
to authenticated
using (private.is_active_organization_member(id));

create policy organization_memberships_select_own_or_admin
on public.organization_memberships
for select
to authenticated
using (
  user_id = auth.uid()
  or private.is_organization_admin(organization_id)
);

create policy candidates_select_authorized
on public.candidates
for select
to authenticated
using (private.can_access_candidate(id));

create policy candidates_insert_organization_admin
on public.candidates
for insert
to authenticated
with check (private.is_organization_admin(organization_id));

create policy candidates_update_organization_admin
on public.candidates
for update
to authenticated
using (private.is_organization_admin(organization_id))
with check (private.is_organization_admin(organization_id));

create policy competency_definitions_select_authenticated
on public.competency_definitions
for select
to authenticated
using (true);

create policy candidate_competencies_select_authorized
on public.candidate_competencies
for select
to authenticated
using (private.can_access_candidate(candidate_id));

create policy competency_cycles_select_authorized
on public.competency_cycles
for select
to authenticated
using (
  exists (
    select 1
    from public.candidate_competencies as candidate_competency
    where candidate_competency.id = competency_cycles.candidate_competency_id
      and private.can_access_candidate(candidate_competency.candidate_id)
  )
);

create policy candidate_relationships_select_authorized
on public.candidate_relationships
for select
to authenticated
using (private.can_access_candidate(candidate_id));

create policy candidate_relationships_insert_organization_admin
on public.candidate_relationships
for insert
to authenticated
with check (
  exists (
    select 1
    from public.candidates as candidate
    where candidate.id = candidate_relationships.candidate_id
      and private.is_organization_admin(candidate.organization_id)
  )
);

create policy candidate_relationships_update_organization_admin
on public.candidate_relationships
for update
to authenticated
using (
  exists (
    select 1
    from public.candidates as candidate
    where candidate.id = candidate_relationships.candidate_id
      and private.is_organization_admin(candidate.organization_id)
  )
)
with check (
  exists (
    select 1
    from public.candidates as candidate
    where candidate.id = candidate_relationships.candidate_id
      and private.is_organization_admin(candidate.organization_id)
  )
);

create policy candidate_pathways_select_authorized
on public.candidate_pathways
for select
to authenticated
using (private.can_access_candidate(candidate_id));

create policy candidate_pathways_insert_owner_or_admin
on public.candidate_pathways
for insert
to authenticated
with check (private.can_manage_candidate_pathway(candidate_id));

create policy candidate_pathways_update_owner_or_admin
on public.candidate_pathways
for update
to authenticated
using (private.can_manage_candidate_pathway(candidate_id))
with check (private.can_manage_candidate_pathway(candidate_id));

create policy candidate_pathway_lcc_strands_select_authorized
on public.candidate_pathway_lcc_strands
for select
to authenticated
using (private.can_access_candidate(candidate_id));

create policy candidate_pathway_lcc_strands_insert_owner_or_admin
on public.candidate_pathway_lcc_strands
for insert
to authenticated
with check (private.can_manage_candidate_pathway(candidate_id));

create policy candidate_pathway_lcc_strands_delete_owner_or_admin
on public.candidate_pathway_lcc_strands
for delete
to authenticated
using (private.can_manage_candidate_pathway(candidate_id));

create policy candidate_pathway_specialist_routes_select_authorized
on public.candidate_pathway_specialist_routes
for select
to authenticated
using (private.can_access_candidate(candidate_id));

create policy candidate_pathway_specialist_routes_insert_owner_or_admin
on public.candidate_pathway_specialist_routes
for insert
to authenticated
with check (private.can_manage_candidate_pathway(candidate_id));

create policy candidate_pathway_specialist_routes_delete_owner_or_admin
on public.candidate_pathway_specialist_routes
for delete
to authenticated
using (private.can_manage_candidate_pathway(candidate_id));

create policy baseline_task_definitions_select_authenticated
on public.baseline_task_definitions
for select
to authenticated
using (true);

create policy candidate_baseline_setups_select_authorized
on public.candidate_baseline_setups
for select
to authenticated
using (private.can_access_candidate(candidate_id));

create policy candidate_baseline_setups_insert_organization_admin
on public.candidate_baseline_setups
for insert
to authenticated
with check (
  exists (
    select 1
    from public.candidates as candidate
    where candidate.id = candidate_baseline_setups.candidate_id
      and private.is_organization_admin(candidate.organization_id)
  )
);

create policy candidate_baseline_setups_update_organization_admin
on public.candidate_baseline_setups
for update
to authenticated
using (
  exists (
    select 1
    from public.candidates as candidate
    where candidate.id = candidate_baseline_setups.candidate_id
      and private.is_organization_admin(candidate.organization_id)
  )
)
with check (
  exists (
    select 1
    from public.candidates as candidate
    where candidate.id = candidate_baseline_setups.candidate_id
      and private.is_organization_admin(candidate.organization_id)
  )
);

create policy candidate_baseline_tasks_select_authorized
on public.candidate_baseline_tasks
for select
to authenticated
using (private.can_access_candidate(candidate_id));

create policy candidate_baseline_tasks_insert_organization_admin
on public.candidate_baseline_tasks
for insert
to authenticated
with check (
  exists (
    select 1
    from public.candidates as candidate
    where candidate.id = candidate_baseline_tasks.candidate_id
      and private.is_organization_admin(candidate.organization_id)
  )
);

create policy candidate_baseline_tasks_update_organization_admin
on public.candidate_baseline_tasks
for update
to authenticated
using (
  exists (
    select 1
    from public.candidates as candidate
    where candidate.id = candidate_baseline_tasks.candidate_id
      and private.is_organization_admin(candidate.organization_id)
  )
)
with check (
  exists (
    select 1
    from public.candidates as candidate
    where candidate.id = candidate_baseline_tasks.candidate_id
      and private.is_organization_admin(candidate.organization_id)
  )
);
