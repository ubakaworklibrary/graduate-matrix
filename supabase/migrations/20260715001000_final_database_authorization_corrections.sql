create or replace function private.enforce_evidence_cpd_signoff_authority()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  can_edit_evidence boolean;
  signoff_changed boolean;
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

  can_edit_evidence := private.can_edit_candidate_evidence(old.candidate_id);
  signoff_changed :=
    new.cpd_signed_off_at is distinct from old.cpd_signed_off_at
    or new.cpd_signed_off_by_user_id is distinct from old.cpd_signed_off_by_user_id
    or new.cpd_signed_off_by_display_name is distinct from old.cpd_signed_off_by_display_name;

  if not signoff_changed then
    if can_edit_evidence then
      return new;
    end if;

    raise exception using errcode = '42501',
      message = 'A verifier may update only evidence CPD sign-off metadata.';
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

  if not can_edit_evidence and (
    new.id is distinct from old.id
    or new.candidate_id is distinct from old.candidate_id
    or new.evidence_date is distinct from old.evidence_date
    or new.claimed_level is distinct from old.claimed_level
    or new.project_reference is distinct from old.project_reference
    or new.project_type is distinct from old.project_type
    or new.riba_stage is distinct from old.riba_stage
    or new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.outcome is distinct from old.outcome
    or new.method is distinct from old.method
    or new.structured_sections is distinct from old.structured_sections
    or new.systems is distinct from old.systems
    or new.cpd_hours is distinct from old.cpd_hours
    or new.cpd_category is distinct from old.cpd_category
    or new.created_at is distinct from old.created_at
  ) then
    raise exception using errcode = '42501',
      message = 'A verifier may update only evidence CPD sign-off metadata.';
  end if;

  return new;
end;
$$;

drop trigger if exists evidence_entries_enforce_cpd_signoff_authority
on public.evidence_entries;

create trigger evidence_entries_enforce_cpd_signoff_authority
before insert or update
on public.evidence_entries
for each row execute function private.enforce_evidence_cpd_signoff_authority();

drop policy if exists evidence_entries_update_owner_or_admin
on public.evidence_entries;

create policy evidence_entries_update_owner_or_admin
on public.evidence_entries
for update
to authenticated
using (
  private.can_edit_candidate_evidence(candidate_id)
  or private.can_verify_candidate_evidence(candidate_id)
)
with check (
  private.can_edit_candidate_evidence(candidate_id)
  or private.can_verify_candidate_evidence(candidate_id)
);

drop policy if exists evidence_competency_links_delete_development_manager
on public.evidence_competency_links;

create policy evidence_competency_links_delete_development_manager
on public.evidence_competency_links
for delete
to authenticated
using (
  exists (
    select 1
    from public.evidence_entries as evidence
    where evidence.id = evidence_competency_links.evidence_id
      and (
        (
          evidence_competency_links.link_type in ('primary', 'suggested')
          and private.can_manage_candidate_development(evidence.candidate_id)
        )
        or (
          evidence_competency_links.link_type = 'accepted'
          and private.can_verify_candidate_evidence(evidence.candidate_id)
        )
      )
  )
);
