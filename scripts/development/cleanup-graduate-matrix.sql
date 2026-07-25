-- DEVELOPMENT / TEST DATA CLEANUP ONLY.
-- Removes only the dataset identified by the development organization slug and
-- candidate external reference. It never deletes the Supabase Auth user,
-- user profile, or canonical definition rows.

begin;

do $$
declare
  development_slug constant text := 'graduate-matrix-development';
  development_reference constant text := 'GM-DEVELOPMENT-CANDIDATE';
  development_organization_id uuid;
  development_candidate_id uuid;
  development_user_id uuid;
begin
  select organization.id into development_organization_id
  from public.organizations as organization
  where organization.slug = development_slug;

  select candidate.id, candidate.user_id
  into development_candidate_id, development_user_id
  from public.candidates as candidate
  where candidate.organization_id = development_organization_id
    and candidate.external_reference = development_reference;

  if development_candidate_id is null then
    raise notice 'No Graduate Matrix development candidate was found; nothing to remove.';
    return;
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
  delete from public.candidate_pathways where candidate_id = development_candidate_id;
  delete from public.candidate_relationships where candidate_id = development_candidate_id;
  update public.candidate_competencies set active_cycle_id = null where candidate_id = development_candidate_id;
  delete from public.competency_cycles where candidate_competency_id in (select id from public.candidate_competencies where candidate_id = development_candidate_id);
  delete from public.candidate_competencies where candidate_id = development_candidate_id;
  delete from public.candidates where id = development_candidate_id;

  delete from public.organization_memberships
  where organization_id = development_organization_id
    and user_id = development_user_id;

  delete from public.organizations
  where id = development_organization_id
    and not exists (select 1 from public.candidates where organization_id = development_organization_id)
    and not exists (select 1 from public.organization_memberships where organization_id = development_organization_id);

  raise notice 'Graduate Matrix development dataset removed. The Auth user and user profile were retained.';
end
$$;

commit;
