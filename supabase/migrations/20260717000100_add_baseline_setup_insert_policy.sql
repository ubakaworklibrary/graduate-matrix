-- Allow the assigned mentor (or an organisation administrator recognised by
-- the existing helper) to create the initial baseline setup row.
create policy candidate_baseline_setups_insert_mentor
on public.candidate_baseline_setups
for insert
to authenticated
with check (
  exists (
    select 1
    from public.candidates as candidate
    where candidate.id = candidate_baseline_setups.candidate_id
      and private.can_verify_candidate_evidence(candidate.id)
  )
);
