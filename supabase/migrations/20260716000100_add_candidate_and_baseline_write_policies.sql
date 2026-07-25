-- Adds self-service and mentor write access for candidate/pathway editing and
-- mentor write access for baseline task/setup editing. Additive only: no
-- table, column, or trigger changes. Existing organization-admin policies are
-- untouched; these are extra permissive policies that RLS OR's alongside them.

create policy candidates_update_self_or_mentor
on public.candidates
for update
to authenticated
using (private.can_manage_candidate_development(id))
with check (private.can_manage_candidate_development(id));

create policy candidate_baseline_setups_update_mentor
on public.candidate_baseline_setups
for update
to authenticated
using (
  exists (
    select 1
    from public.candidates as candidate
    where candidate.id = candidate_baseline_setups.candidate_id
      and private.can_verify_candidate_evidence(candidate.id)
  )
)
with check (
  exists (
    select 1
    from public.candidates as candidate
    where candidate.id = candidate_baseline_setups.candidate_id
      and private.can_verify_candidate_evidence(candidate.id)
  )
);

create policy candidate_baseline_tasks_insert_mentor
on public.candidate_baseline_tasks
for insert
to authenticated
with check (
  exists (
    select 1
    from public.candidates as candidate
    where candidate.id = candidate_baseline_tasks.candidate_id
      and private.can_verify_candidate_evidence(candidate.id)
  )
);

create policy candidate_baseline_tasks_update_mentor
on public.candidate_baseline_tasks
for update
to authenticated
using (
  exists (
    select 1
    from public.candidates as candidate
    where candidate.id = candidate_baseline_tasks.candidate_id
      and private.can_verify_candidate_evidence(candidate.id)
  )
)
with check (
  exists (
    select 1
    from public.candidates as candidate
    where candidate.id = candidate_baseline_tasks.candidate_id
      and private.can_verify_candidate_evidence(candidate.id)
  )
);
