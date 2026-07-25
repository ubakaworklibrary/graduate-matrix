-- DEVELOPMENT / TEST DATA RESET ONLY.
-- Clears the identifiable development candidate's working data while preserving
-- the Auth user, organization membership, candidate record and mentor relationship.

begin;

do $$
declare
  development_slug constant text := 'graduate-matrix-development';
  development_reference constant text := 'GM-DEVELOPMENT-CANDIDATE';
  development_candidate_id uuid;
begin
  select candidate.id into development_candidate_id
  from public.candidates as candidate
  join public.organizations as organization on organization.id = candidate.organization_id
  where organization.slug = development_slug
    and candidate.external_reference = development_reference;

  if development_candidate_id is null then
    raise exception 'The Graduate Matrix development candidate was not found. Run setup-graduate-matrix.sql first.';
  end if;

  delete from public.cpd_attachments where cpd_entry_id in (select id from public.cpd_entries where candidate_id = development_candidate_id);
  delete from public.cpd_competency_links where cpd_entry_id in (select id from public.cpd_entries where candidate_id = development_candidate_id);
  delete from public.cpd_entries where candidate_id = development_candidate_id;
  delete from public.meetings where candidate_id = development_candidate_id;
  delete from public.candidate_reviews where candidate_id = development_candidate_id;
  delete from public.evidence_action_links where evidence_id in (select id from public.evidence_entries where candidate_id = development_candidate_id);
  delete from public.evidence_verification_events where evidence_id in (select id from public.evidence_entries where candidate_id = development_candidate_id);
  delete from public.evidence_competency_links where evidence_id in (select id from public.evidence_entries where candidate_id = development_candidate_id);
  delete from public.evidence_entries where candidate_id = development_candidate_id;
  delete from public.development_actions where candidate_id = development_candidate_id;
  delete from public.competency_cycle_reviews where candidate_id = development_candidate_id;
  delete from public.mentor_assessments where candidate_id = development_candidate_id;
  delete from public.progression_events where candidate_id = development_candidate_id;
  delete from public.candidate_baseline_tasks where candidate_id = development_candidate_id;
  delete from public.candidate_baseline_setups where candidate_id = development_candidate_id;
  delete from public.candidate_pathway_lcc_strands where candidate_id = development_candidate_id;
  delete from public.candidate_pathway_specialist_routes where candidate_id = development_candidate_id;
  update public.candidate_competencies set active_cycle_id = null where candidate_id = development_candidate_id;
  delete from public.competency_cycles where candidate_competency_id in (select id from public.candidate_competencies where candidate_id = development_candidate_id);
  delete from public.candidate_competencies where candidate_id = development_candidate_id;

  update public.candidates
  set first_name = '', surname = '', job_title = '', discipline = '',
      employer_team = '', office_location = '', scheme_start_date = null,
      expected_application_date = null, updated_at = clock_timestamp()
  where id = development_candidate_id;

  update public.candidate_pathways
  set professional_body = 'other', primary_outcome = 'custom',
      cibse_membership_target = 'none', iet_membership_target = 'none',
      engineering_registration_target = 'none', current_membership_status = '',
      academic_route = '', notes = '', configured_at = null,
      configured_by_user_id = null, configured_by_display_name = null,
      updated_at = clock_timestamp()
  where candidate_id = development_candidate_id;

  raise notice 'Development working data cleared. Candidate, mentor relationship and login access were retained.';
end
$$;

commit;
