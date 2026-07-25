-- DEVELOPMENT / TEST DATA ONLY.
-- Creates a blank candidate record for mentor-led onboarding.
-- Run this whole file in the Supabase SQL Editor.

begin;

do $$
declare
  test_email constant text := 'uattah@etchassociates.com';
  development_slug constant text := 'graduate-matrix-development';
  development_reference constant text := 'GM-DEVELOPMENT-CANDIDATE';
  development_candidate_id constant uuid := 'd0000000-0000-4000-8000-000000000001';
  test_user_id uuid;
  development_organization_id uuid;
  old_candidate_id uuid;
  existing_candidate record;
  setup_time timestamptz := clock_timestamp();
begin
  select id into test_user_id
  from auth.users
  where lower(email) = lower(test_email);

  if test_user_id is null then
    raise exception 'No Supabase Auth user exists for email: %', test_email;
  end if;

  -- Keep the development database's canonical BL definitions aligned with the
  -- application before the candidate is loaded.
  insert into public.baseline_task_definitions (
    id, title, description, mandatory, completion_mode,
    source_order, definition_version, is_active
  ) values (
    'cscs-card',
    'CSCS Card',
    'The candidate holds the appropriate valid CSCS card or has an agreed action to obtain it.',
    true,
    'mentor',
    12,
    1,
    true
  )
  on conflict (id) do update
  set title = excluded.title,
      description = excluded.description,
      mandatory = excluded.mandatory,
      completion_mode = excluded.completion_mode,
      source_order = excluded.source_order,
      definition_version = excluded.definition_version,
      is_active = excluded.is_active;

  select candidate.id into old_candidate_id
  from public.candidates as candidate
  join public.organizations as organization on organization.id = candidate.organization_id
  where organization.slug = development_slug
    and candidate.external_reference = development_reference;

  if old_candidate_id is not null then
    delete from public.cpd_attachments where cpd_entry_id in (select id from public.cpd_entries where candidate_id = old_candidate_id);
    delete from public.cpd_competency_links where cpd_entry_id in (select id from public.cpd_entries where candidate_id = old_candidate_id);
    delete from public.cpd_entries where candidate_id = old_candidate_id;
    delete from public.meetings where candidate_id = old_candidate_id;
    delete from public.candidate_reviews where candidate_id = old_candidate_id;
    delete from public.evidence_action_links where evidence_id in (select id from public.evidence_entries where candidate_id = old_candidate_id);
    delete from public.evidence_verification_events where evidence_id in (select id from public.evidence_entries where candidate_id = old_candidate_id);
    delete from public.evidence_competency_links where evidence_id in (select id from public.evidence_entries where candidate_id = old_candidate_id);
    delete from public.evidence_entries where candidate_id = old_candidate_id;
    delete from public.development_actions where candidate_id = old_candidate_id;
    delete from public.competency_cycle_reviews where candidate_id = old_candidate_id;
    delete from public.mentor_assessments where candidate_id = old_candidate_id;
    delete from public.progression_events where candidate_id = old_candidate_id;
    delete from public.candidate_baseline_tasks where candidate_id = old_candidate_id;
    delete from public.candidate_baseline_setups where candidate_id = old_candidate_id;
    delete from public.candidate_pathway_lcc_strands where candidate_id = old_candidate_id;
    delete from public.candidate_pathway_specialist_routes where candidate_id = old_candidate_id;
    delete from public.candidate_pathways where candidate_id = old_candidate_id;
    delete from public.candidate_relationships where candidate_id = old_candidate_id;
    update public.candidate_competencies set active_cycle_id = null where candidate_id = old_candidate_id;
    delete from public.competency_cycles where candidate_competency_id in (select id from public.candidate_competencies where candidate_id = old_candidate_id);
    delete from public.candidate_competencies where candidate_id = old_candidate_id;
    delete from public.candidates where id = old_candidate_id;
  end if;

  select id, external_reference into existing_candidate
  from public.candidates
  where user_id = test_user_id;

  if found then
    raise exception 'Auth user % is already linked to candidate % (reference %).',
      test_email, existing_candidate.id, existing_candidate.external_reference;
  end if;

  insert into public.user_profiles (user_id, display_name, created_at, updated_at)
  values (
    test_user_id,
    coalesce(nullif(btrim((select raw_user_meta_data ->> 'full_name' from auth.users where id = test_user_id)), ''), test_email),
    setup_time,
    setup_time
  )
  on conflict (user_id) do nothing;

  insert into public.organizations (name, slug, created_at, updated_at)
  values ('Graduate Matrix Development Organisation', development_slug, setup_time, setup_time)
  on conflict (slug) do update
  set archived_at = null, updated_at = excluded.updated_at
  returning id into development_organization_id;

  insert into public.organization_memberships (
    organization_id, user_id, membership_role, created_at, archived_at
  ) values (
    development_organization_id, test_user_id, 'organization-admin', setup_time, null
  )
  on conflict (organization_id, user_id) where archived_at is null
  do update set membership_role = 'organization-admin';

  insert into public.candidates (
    id, organization_id, user_id, first_name, surname, job_title, discipline,
    employer_team, office_location, scheme_start_date,
    expected_application_date, external_reference, created_at, updated_at
  ) values (
    development_candidate_id, development_organization_id, null, '', '', '', '',
    '', '', null, null, development_reference, setup_time, setup_time
  );

  -- A valid empty pathway shell is required by the canonical profile mapper.
  insert into public.candidate_pathways (
    candidate_id, professional_body, primary_outcome,
    cibse_membership_target, iet_membership_target,
    engineering_registration_target, current_membership_status,
    academic_route, notes, configured_at, configured_by_user_id,
    configured_by_display_name, created_at, updated_at
  ) values (
    development_candidate_id, 'other', 'custom', 'none', 'none', 'none',
    '', '', '', null, null, null, setup_time, setup_time
  );

  -- Force the next browser refresh back through the login flow.
  delete from auth.sessions where user_id = test_user_id;

  raise notice 'Blank Graduate Matrix mentor-onboarding state created for %.', test_email;
end
$$;

commit;
