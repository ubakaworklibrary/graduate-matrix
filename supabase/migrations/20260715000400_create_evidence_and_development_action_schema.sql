create table public.standard_task_definitions (
  id text primary key,
  task_type text not null,
  discipline text not null,
  title text not null,
  competency_references text[] not null default '{}',
  suggested_level text not null,
  owner text not null,
  priority text not null,
  due_period text not null,
  deliverable text not null,
  success_criteria text not null,
  mentor_prompt text not null,
  source_order integer not null unique,
  definition_version integer not null default 1,
  is_active boolean not null default true,
  constraint standard_task_definitions_type_check check (
    task_type in ('core', 'discipline', 'project', 'gap', 'site')
  ),
  constraint standard_task_definitions_discipline_check check (
    discipline in ('general', 'mechanical', 'electrical', 'sustainability', 'site', 'digital')
  ),
  constraint standard_task_definitions_level_check check (
    suggested_level in ('L1', 'L2', 'L3', 'L4', 'L5')
  ),
  constraint standard_task_definitions_priority_check check (
    priority in ('low', 'medium', 'high')
  )
);

insert into public.standard_task_definitions (
  id, task_type, discipline, title, competency_references, suggested_level,
  owner, priority, due_period, deliverable, success_criteria, mentor_prompt,
  source_order
)
values
  ('ST-001', 'core', 'general', 'Read and summarise the graduate scheme and competence framework', array['E4', 'D1'], 'L1', 'Candidate', 'medium', 'Year 1 Q1', 'Short reflective note', 'Candidate can explain how evidence, competence levels and mentor review work.', 'Check the candidate understands that evidence supports review but does not automatically change their assessed level.', 1),
  ('ST-002', 'core', 'general', 'Complete initial professional registration pathway setup with mentor', array['E4', 'E1'], 'L1', 'Candidate / Mentor', 'high', 'Year 1 Q1', 'Completed Candidate setup page', 'Target route, mentor, start date, review frequency and next review expectations are agreed.', 'Confirm the pathway is valid and that CIBSE/IET/certification fields are not mixed incorrectly.', 2),
  ('ST-003', 'core', 'general', 'Create a six-month CPD plan', array['E4'], 'L1', 'Candidate', 'medium', 'Year 1 Q1', 'Six-month CPD plan', 'CPD activities are relevant to the candidate''s pathway and current competence gaps.', 'Check the plan includes technical, professional and reflective learning rather than only software training.', 3),
  ('ST-004', 'core', 'general', 'Attend a design meeting and record key technical actions', array['D1', 'D3', 'C1'], 'L1', 'Candidate', 'medium', 'Year 1', 'Meeting reflection or action summary', 'Candidate identifies decisions, actions, coordination issues and their own follow-up items.', 'Check whether the candidate has understood the engineering decisions rather than only taking minutes.', 4),
  ('ST-005', 'project', 'general', 'Prepare a simple design calculation under supervision', array['A2', 'B2'], 'L2', 'Candidate', 'medium', 'Year 1 / Year 2', 'Calculation sheet with assumptions', 'Calculation method, inputs, assumptions, units and review comments are clear.', 'Check whether the candidate has understood the assumptions and not just followed a template.', 5),
  ('ST-006', 'project', 'general', 'Review a senior engineer''s calculation and identify assumptions', array['A1', 'A2', 'B2'], 'L2', 'Candidate', 'medium', 'Year 1 / Year 2', 'Marked-up calculation or assumption review note', 'Candidate identifies key design inputs, limitations, assumptions and items requiring confirmation.', 'Check whether the candidate can distinguish fixed design inputs from assumptions.', 6),
  ('ST-007', 'project', 'general', 'Produce or update a drawing / schematic markup', array['B2', 'D1'], 'L2', 'Candidate', 'medium', 'Year 1 / Year 2', 'Marked-up drawing, schematic or schedule', 'Markup is clear, coordinated and technically sensible.', 'Review whether the markup would be understandable to another discipline or CAD/BIM technician.', 7),
  ('ST-008', 'project', 'general', 'Prepare a short technical note explaining a design decision', array['D1', 'D2', 'B2'], 'L2', 'Candidate', 'medium', 'Year 2', 'Technical note', 'The note explains options, constraints, recommendation and basis of judgement.', 'Check whether the recommendation is justified rather than asserted.', 8),
  ('ST-009', 'core', 'general', 'Log one design risk and proposed mitigation', array['E2', 'B1', 'C1'], 'L2', 'Candidate', 'medium', 'Year 1 / Year 2', 'Risk register entry', 'Risk is specific, relevant, owned and has a practical mitigation or escalation route.', 'Check whether the item is a real design/CDM risk rather than a generic observation.', 9),
  ('ST-010', 'site', 'site', 'Attend a site visit and record design / installation observations', array['B3', 'E2', 'D1'], 'L2', 'Candidate', 'medium', 'Year 1 / Year 2', 'Site visit note with observations', 'Candidate links site observations to design intent, installation quality, access, maintainability or safety.', 'Check that the candidate reflects on what the observation means for design practice.', 10),
  ('ST-011', 'project', 'general', 'Review a contractor technical submittal with mentor support', array['B2', 'C2', 'D1'], 'L3', 'Candidate', 'medium', 'Year 2 / Year 3', 'Submittal comments', 'Comments are clear, relevant, coordinated and technically justified.', 'Check whether the candidate avoids over-commenting and focuses on compliance, performance and interfaces.', 11),
  ('ST-012', 'project', 'general', 'Draft a response to an RFI or technical query', array['B2', 'C2', 'D1'], 'L3', 'Candidate', 'medium', 'Year 2 / Year 3', 'Draft RFI response', 'Response is clear, coordinated, caveated where needed and avoids over-commitment.', 'Check whether the candidate understands commercial and coordination risk in written responses.', 12),
  ('ST-013', 'project', 'general', 'Prepare a small option appraisal', array['A2', 'B1', 'B2', 'E3'], 'L3', 'Candidate', 'medium', 'Year 2 / Year 3', 'Options table or short appraisal note', 'Candidate compares technical performance, cost, carbon, risk, programme and maintainability where relevant.', 'Check whether the preferred option follows logically from the appraisal criteria.', 13),
  ('ST-014', 'project', 'general', 'Lead a small package of work under supervision', array['C1', 'C2', 'D1'], 'L3', 'Candidate', 'high', 'Year 3', 'Package tracker and issued outputs', 'Candidate plans tasks, tracks progress, coordinates inputs and escalates issues at the right time.', 'Check whether the candidate shows ownership while still using appropriate supervision.', 14),
  ('ST-015', 'core', 'general', 'Present completed project work to mentor or team', array['D2', 'D3'], 'L3', 'Candidate', 'medium', 'Annual review', 'Presentation slides or notes', 'Candidate explains context, method, judgement, outcome and lessons learned.', 'Assess clarity, confidence, technical accuracy and ability to answer questions.', 15),
  ('ST-016', 'core', 'general', 'Complete a lesson-learned reflection after a task or project stage', array['B3', 'E4', 'D3'], 'L2', 'Candidate', 'medium', 'After project milestone', 'Reflection note', 'Candidate explains what changed in their judgement, method or future approach.', 'Check for genuine reflection rather than a description of what happened.', 16),
  ('ST-017', 'project', 'sustainability', 'Identify a sustainability improvement in a live project', array['E3', 'B1', 'B2'], 'L3', 'Candidate', 'medium', 'Year 2 / Year 3', 'Sustainability improvement note', 'Improvement is technically realistic and linked to project constraints.', 'Check that the suggestion is deliverable, not just aspirational.', 17),
  ('ST-018', 'core', 'general', 'Review a design against relevant codes or standards', array['E1', 'A1', 'B2'], 'L3', 'Candidate', 'medium', 'Year 2 / Year 3', 'Compliance note', 'Candidate identifies relevant standards and applies them correctly to a design decision.', 'Check whether the candidate cites the right standard and applies it in context.', 18),
  ('ST-019', 'site', 'site', 'Support commissioning or witness testing activity', array['B3', 'E2', 'D1'], 'L3', 'Candidate', 'medium', 'Year 3 / Year 4', 'Commissioning or witness record', 'Candidate links test outcomes to design intent and identifies actions or issues.', 'Check whether the candidate understands why the test matters, not just that it was completed.', 19),
  ('ST-020', 'gap', 'general', 'Support or mentor a junior colleague / work experience student', array['C3', 'D3', 'E4'], 'L4', 'Candidate', 'medium', 'Year 3 / Year 4', 'Mentoring reflection', 'Candidate demonstrates communication, support, judgement and awareness of the other person''s development needs.', 'Check that leadership is evidenced through behaviour, not job title.', 20),
  ('M-001', 'discipline', 'mechanical', 'Complete a heating or cooling load review', array['A2', 'B2'], 'L2', 'Candidate', 'medium', 'Year 1 / Year 2', 'Load review note', 'Inputs, source model, assumptions and peak load basis are understood.', 'Check whether the candidate has interrogated the model outputs and not just copied loads.', 21),
  ('M-002', 'discipline', 'mechanical', 'Size pipework or ductwork under supervision', array['A2', 'B2'], 'L2', 'Candidate', 'medium', 'Year 1 / Year 2', 'Calculation sheet and schedule', 'Velocity, pressure drop, diversity assumptions, material and sizing basis are recorded.', 'Check assumptions, branches, diversity and whether the candidate has documented review comments.', 22),
  ('M-003', 'discipline', 'mechanical', 'Review plant selection against duty, resilience and maintainability', array['B1', 'B2', 'E2'], 'L3', 'Candidate', 'medium', 'Year 2 / Year 3', 'Plant selection note', 'Candidate explains why the plant is suitable and identifies duty, access, maintenance and resilience considerations.', 'Check whether lifecycle and practical maintenance have been considered.', 23),
  ('M-004', 'discipline', 'mechanical', 'Produce a controls philosophy summary for a small system', array['A2', 'B2', 'D1'], 'L3', 'Candidate', 'medium', 'Year 2 / Year 3', 'Controls note', 'Operating modes, setpoints, safeties, interfaces and user controls are clear.', 'Check whether the sequence is practical and avoids hidden interface gaps.', 24),
  ('M-005', 'discipline', 'mechanical', 'Review access and maintenance requirements on a drawing', array['E2', 'B3', 'C1'], 'L2', 'Candidate', 'medium', 'Year 1 / Year 2', 'Markup or access risk note', 'Candidate identifies realistic access, replacement, isolation, draining and maintenance constraints.', 'Check for practical site understanding rather than generic comments.', 25),
  ('M-006', 'discipline', 'mechanical', 'Compare two low-carbon heating or cooling options', array['E3', 'A2', 'B2'], 'L3', 'Candidate', 'medium', 'Year 2 / Year 3', 'Options appraisal', 'Includes energy, carbon, buildability, operational risk, cost and control implications where relevant.', 'Check whether the candidate can explain trade-offs rather than only headline efficiency.', 26),
  ('E-001', 'discipline', 'electrical', 'Complete a basic load schedule review', array['A2', 'B2'], 'L2', 'Candidate', 'medium', 'Year 1 / Year 2', 'Load schedule review', 'Loads, diversity, spare capacity and assumptions are clear.', 'Check whether the candidate has understood load sources and diversity basis.', 27),
  ('E-002', 'discipline', 'electrical', 'Carry out cable sizing under supervision', array['A2', 'B2', 'E1'], 'L2', 'Candidate', 'medium', 'Year 1 / Year 2', 'Cable calculation', 'Method, protective device, installation method, grouping, voltage drop and disconnection checks are understood.', 'Check the candidate understands BS 7671 factors and not only software output.', 28),
  ('E-003', 'discipline', 'electrical', 'Review lighting calculation outputs', array['A2', 'B2'], 'L2', 'Candidate', 'medium', 'Year 1 / Year 2', 'Lighting calculation review', 'Candidate comments on lux levels, uniformity, glare assumptions and room/use constraints.', 'Check whether the review links back to brief and standards.', 29),
  ('E-004', 'discipline', 'electrical', 'Review containment routes for coordination issues', array['B2', 'D1', 'C1'], 'L2', 'Candidate', 'medium', 'Year 1 / Year 2', 'Drawing markup', 'Candidate identifies clashes, access, bends, installation constraints and coordination issues.', 'Check whether the markup is useful to other disciplines and installers.', 30),
  ('E-005', 'discipline', 'electrical', 'Review emergency lighting or fire alarm design principles', array['E1', 'E2', 'B2'], 'L3', 'Candidate', 'medium', 'Year 2 / Year 3', 'Compliance note', 'Candidate links the design to relevant safety requirements and identifies items requiring specialist confirmation.', 'Check whether the candidate understands life-safety implications and limits of competence.', 31),
  ('S-001', 'discipline', 'sustainability', 'Complete an operational energy reduction note', array['E3', 'B2'], 'L2', 'Candidate', 'medium', 'Year 1 / Year 2', 'Energy reduction note', 'Candidate identifies realistic measures and explains expected operational impact.', 'Check whether measures are project-specific and not generic.', 32),
  ('S-002', 'discipline', 'sustainability', 'Prepare a simple embodied carbon comparison', array['E3', 'A2'], 'L3', 'Candidate', 'medium', 'Year 2 / Year 3', 'Carbon comparison', 'Candidate explains assumptions, boundaries, limitations and decision relevance.', 'Check whether the comparison is fair and not over-claimed.', 33),
  ('S-003', 'discipline', 'sustainability', 'Review overheating or comfort risks', array['E3', 'B2', 'E2'], 'L3', 'Candidate', 'medium', 'Year 2 / Year 3', 'Risk note', 'Candidate links design choices to occupant comfort, health risk and operational constraints.', 'Check whether the candidate identifies both design and operational mitigations.', 34),
  ('S-004', 'discipline', 'sustainability', 'Identify one circular economy or reuse opportunity', array['E3', 'B1'], 'L2', 'Candidate', 'low', 'Year 1 / Year 2', 'Reuse opportunity note', 'Suggestion is practical, project-relevant and recognises constraints.', 'Check whether the action is deliverable and proportionate.', 35);

create table public.evidence_entries (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete restrict,
  evidence_date date not null,
  claimed_level text not null,
  project_reference text not null,
  project_type text not null,
  riba_stage text not null,
  title text not null,
  description text not null,
  outcome text not null,
  method text not null,
  structured_sections jsonb,
  systems text[] not null default '{}',
  cpd_hours double precision,
  cpd_category text,
  cpd_signed_off_at timestamptz,
  cpd_signed_off_by_user_id uuid references public.user_profiles (user_id) on delete set null,
  cpd_signed_off_by_display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evidence_entries_claimed_level_check check (
    claimed_level in ('L1', 'L2', 'L3', 'L4', 'L5')
  ),
  constraint evidence_entries_method_check check (
    method in ('carr', 'star', 'psar')
  ),
  constraint evidence_entries_structured_sections_check check (
    structured_sections is null or jsonb_typeof(structured_sections) = 'object'
  ),
  constraint evidence_entries_cpd_check check (
    (
      cpd_hours is null
      and cpd_category is null
      and cpd_signed_off_at is null
      and cpd_signed_off_by_user_id is null
      and cpd_signed_off_by_display_name is null
    )
    or (
      cpd_hours is not null
      and cpd_hours not in (
        'Infinity'::double precision,
        '-Infinity'::double precision,
        'NaN'::double precision
      )
      and cpd_category in ('T', 'M', 'P', 'E', 'uncategorized')
      and (
        (
          cpd_signed_off_at is null
          and cpd_signed_off_by_user_id is null
          and cpd_signed_off_by_display_name is null
        )
        or (
          cpd_signed_off_at is not null
          and nullif(btrim(cpd_signed_off_by_display_name), '') is not null
        )
      )
    )
  )
);

create table public.evidence_competency_links (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references public.evidence_entries (id) on delete restrict,
  competency_definition_id text not null references public.competency_definitions (id) on delete restrict,
  link_type text not null,
  accepted_at timestamptz,
  accepted_by_user_id uuid references public.user_profiles (user_id) on delete set null,
  accepted_by_display_name text,
  created_at timestamptz not null default now(),
  constraint evidence_competency_links_evidence_definition_key unique (
    evidence_id,
    competency_definition_id
  ),
  constraint evidence_competency_links_type_check check (
    link_type in ('primary', 'accepted', 'suggested')
  )
);

create unique index evidence_competency_links_primary_key
  on public.evidence_competency_links (evidence_id)
  where link_type = 'primary';

create index evidence_entries_candidate_date_idx
  on public.evidence_entries (candidate_id, evidence_date desc);

create index evidence_competency_links_definition_type_idx
  on public.evidence_competency_links (competency_definition_id, link_type);

alter table public.candidate_competencies
  add constraint candidate_competencies_candidate_id_id_key
  unique (candidate_id, id);

create table public.development_actions (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null,
  candidate_competency_id uuid not null,
  cycle_id uuid not null,
  source_standard_task_definition_id text references public.standard_task_definitions (id) on delete restrict,
  carried_forward_from_action_id uuid,
  title text not null,
  notes text not null default '',
  owner text not null,
  priority text not null,
  status text not null,
  due_date date,
  created_at timestamptz not null default now(),
  created_by_user_id uuid references public.user_profiles (user_id) on delete set null,
  created_by_display_name text not null,
  submitted_at timestamptz,
  submitted_by_user_id uuid references public.user_profiles (user_id) on delete set null,
  submitted_by_display_name text,
  completed_at timestamptz,
  completed_by_user_id uuid references public.user_profiles (user_id) on delete set null,
  completed_by_display_name text,
  archived_at timestamptz,
  archived_by_user_id uuid references public.user_profiles (user_id) on delete set null,
  archived_by_display_name text,
  archive_reason text,
  updated_at timestamptz not null default now(),
  constraint development_actions_candidate_competency_fkey
    foreign key (candidate_id, candidate_competency_id)
    references public.candidate_competencies (candidate_id, id)
    on delete restrict,
  constraint development_actions_cycle_fkey
    foreign key (candidate_competency_id, cycle_id)
    references public.competency_cycles (candidate_competency_id, id)
    on delete restrict,
  constraint development_actions_candidate_id_id_key unique (candidate_id, id),
  constraint development_actions_owner_check check (
    owner in ('graduate', 'mentor', 'shared')
  ),
  constraint development_actions_priority_check check (
    priority in ('low', 'medium', 'high')
  ),
  constraint development_actions_status_check check (
    status in ('open', 'submitted', 'returned-for-revision', 'completed', 'closed')
  ),
  constraint development_actions_completion_check check (
    (status <> 'completed' or completed_at is not null)
    and (
      completed_at is null
      or nullif(btrim(completed_by_display_name), '') is not null
    )
  ),
  constraint development_actions_submission_check check (
    submitted_at is null
    or nullif(btrim(submitted_by_display_name), '') is not null
  ),
  constraint development_actions_archive_check check (
    (
      archived_at is null
      and archived_by_user_id is null
      and archived_by_display_name is null
      and archive_reason is null
    )
    or (
      archived_at is not null
      and nullif(btrim(archived_by_display_name), '') is not null
      and nullif(btrim(archive_reason), '') is not null
    )
  ),
  constraint development_actions_carry_forward_self_check check (
    carried_forward_from_action_id is null
    or carried_forward_from_action_id <> id
  )
);

alter table public.development_actions
  add constraint development_actions_carried_forward_fkey
  foreign key (candidate_id, carried_forward_from_action_id)
  references public.development_actions (candidate_id, id)
  on delete restrict;

create index development_actions_candidate_status_due_idx
  on public.development_actions (candidate_id, status, due_date);

create index development_actions_competency_archived_idx
  on public.development_actions (candidate_competency_id, archived_at);

create table public.evidence_action_links (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references public.evidence_entries (id) on delete restrict,
  development_action_id uuid not null references public.development_actions (id) on delete restrict,
  created_by_user_id uuid references public.user_profiles (user_id) on delete set null,
  created_by_display_name text not null,
  created_at timestamptz not null default now(),
  constraint evidence_action_links_evidence_action_key unique (
    evidence_id,
    development_action_id
  )
);

create index evidence_action_links_development_action_idx
  on public.evidence_action_links (development_action_id);

create table public.evidence_verification_events (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references public.evidence_entries (id) on delete restrict,
  event_type text not null,
  actor_user_id uuid references public.user_profiles (user_id) on delete set null,
  actor_display_name text not null,
  occurred_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  constraint evidence_verification_events_type_check check (
    event_type in ('verified', 'verification-revoked', 'reverification-required')
  )
);

create index evidence_verification_events_evidence_occurred_idx
  on public.evidence_verification_events (evidence_id, occurred_at desc, created_at desc, id desc);

create function private.validate_evidence_actor_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.cpd_signed_off_by_user_id is not null and not exists (
    select 1
    from public.organization_memberships as membership
    join public.candidates as candidate
      on candidate.organization_id = membership.organization_id
    where candidate.id = new.candidate_id
      and membership.user_id = new.cpd_signed_off_by_user_id
      and membership.archived_at is null
  ) then
    raise exception using errcode = '23514',
      message = 'A linked evidence CPD sign-off actor must have active membership in the candidate organization.';
  end if;
  return new;
end;
$$;

create function private.validate_evidence_competency_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  evidence_candidate_id uuid;
begin
  select evidence.candidate_id into evidence_candidate_id
  from public.evidence_entries as evidence
  where evidence.id = new.evidence_id;

  perform 1
    from public.candidate_competencies as candidate_competency
    where candidate_competency.candidate_id = evidence_candidate_id
      and candidate_competency.competency_definition_id = new.competency_definition_id
    for key share;

  if not found then
    raise exception using errcode = '23514',
      message = 'Evidence can link only to a competency belonging to the same candidate.';
  end if;

  if new.accepted_by_user_id is not null and not exists (
    select 1
    from public.organization_memberships as membership
    join public.candidates as candidate
      on candidate.organization_id = membership.organization_id
    where candidate.id = evidence_candidate_id
      and membership.user_id = new.accepted_by_user_id
      and membership.archived_at is null
  ) then
    raise exception using errcode = '23514',
      message = 'A linked evidence competency actor must have active membership in the candidate organization.';
  end if;
  return new;
end;
$$;

create function private.protect_evidence_ownership()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.candidate_id is distinct from old.candidate_id then
    raise exception using errcode = '23514',
      message = 'Evidence cannot be moved to another candidate.';
  end if;
  if new.created_at is distinct from old.created_at then
    raise exception using errcode = '23514',
      message = 'An evidence creation timestamp cannot be changed.';
  end if;
  return new;
end;
$$;

create function private.protect_linked_candidate_competency()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.evidence_competency_links as link
    join public.evidence_entries as evidence
      on evidence.id = link.evidence_id
    where evidence.candidate_id = old.candidate_id
      and link.competency_definition_id = old.competency_definition_id
  ) then
    raise exception using errcode = '23503',
      message = 'A candidate competency linked to evidence cannot be deleted.';
  end if;
  return old;
end;
$$;

create function private.validate_development_action_actors()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by_user_id is not null
    and (tg_op = 'INSERT' or new.created_by_user_id is distinct from old.created_by_user_id)
    and not exists (
      select 1
      from public.organization_memberships as membership
      join public.candidates as candidate
        on candidate.organization_id = membership.organization_id
      where candidate.id = new.candidate_id
        and membership.user_id = new.created_by_user_id
        and membership.archived_at is null
    )
  then
    raise exception using errcode = '23514',
      message = 'A linked development action creator must have active membership in the candidate organization.';
  end if;

  if new.submitted_by_user_id is not null
    and (tg_op = 'INSERT' or new.submitted_by_user_id is distinct from old.submitted_by_user_id)
    and not exists (
      select 1
      from public.organization_memberships as membership
      join public.candidates as candidate
        on candidate.organization_id = membership.organization_id
      where candidate.id = new.candidate_id
        and membership.user_id = new.submitted_by_user_id
        and membership.archived_at is null
    )
  then
    raise exception using errcode = '23514',
      message = 'A linked development action submitter must have active membership in the candidate organization.';
  end if;

  if new.completed_by_user_id is not null
    and (tg_op = 'INSERT' or new.completed_by_user_id is distinct from old.completed_by_user_id)
    and not exists (
      select 1
      from public.organization_memberships as membership
      join public.candidates as candidate
        on candidate.organization_id = membership.organization_id
      where candidate.id = new.candidate_id
        and membership.user_id = new.completed_by_user_id
        and membership.archived_at is null
    )
  then
    raise exception using errcode = '23514',
      message = 'A linked development action completer must have active membership in the candidate organization.';
  end if;

  if new.archived_by_user_id is not null
    and (tg_op = 'INSERT' or new.archived_by_user_id is distinct from old.archived_by_user_id)
    and not exists (
      select 1
      from public.organization_memberships as membership
      join public.candidates as candidate
        on candidate.organization_id = membership.organization_id
      where candidate.id = new.candidate_id
        and membership.user_id = new.archived_by_user_id
        and membership.archived_at is null
    )
  then
    raise exception using errcode = '23514',
      message = 'A linked development action archiver must have active membership in the candidate organization.';
  end if;

  return new;
end;
$$;

create function private.protect_development_action_ownership()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.candidate_id is distinct from old.candidate_id
    or new.candidate_competency_id is distinct from old.candidate_competency_id
    or new.cycle_id is distinct from old.cycle_id
  then
    raise exception using errcode = '23514',
      message = 'Development action candidate and cycle ownership cannot be changed.';
  end if;
  if new.created_at is distinct from old.created_at
    or (
      new.created_by_user_id is distinct from old.created_by_user_id
      and new.created_by_user_id is not null
    )
    or new.created_by_display_name is distinct from old.created_by_display_name
  then
    raise exception using errcode = '23514',
      message = 'Development action creation metadata cannot be changed.';
  end if;
  return new;
end;
$$;

create function private.validate_evidence_action_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  evidence_candidate_id uuid;
  action_candidate_id uuid;
begin
  select evidence.candidate_id into evidence_candidate_id
  from public.evidence_entries as evidence
  where evidence.id = new.evidence_id;

  select action.candidate_id into action_candidate_id
  from public.development_actions as action
  where action.id = new.development_action_id;

  if evidence_candidate_id is distinct from action_candidate_id then
    raise exception using errcode = '23514',
      message = 'Evidence and development actions must belong to the same candidate.';
  end if;

  if new.created_by_user_id is not null and not exists (
    select 1
    from public.organization_memberships as membership
    join public.candidates as candidate
      on candidate.organization_id = membership.organization_id
    where candidate.id = evidence_candidate_id
      and membership.user_id = new.created_by_user_id
      and membership.archived_at is null
  ) then
    raise exception using errcode = '23514',
      message = 'A linked evidence action actor must have active membership in the candidate organization.';
  end if;
  return new;
end;
$$;

create function private.validate_evidence_verification_actor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  evidence_candidate_id uuid;
begin
  select evidence.candidate_id into evidence_candidate_id
  from public.evidence_entries as evidence
  where evidence.id = new.evidence_id;

  if new.actor_user_id is not null and not exists (
    select 1
    from public.organization_memberships as membership
    join public.candidates as candidate
      on candidate.organization_id = membership.organization_id
    where candidate.id = evidence_candidate_id
      and membership.user_id = new.actor_user_id
      and membership.archived_at is null
  ) then
    raise exception using errcode = '23514',
      message = 'A linked verification actor must have active membership in the candidate organization.';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_evidence_actor_membership() from public;
revoke all on function private.validate_evidence_competency_link() from public;
revoke all on function private.protect_evidence_ownership() from public;
revoke all on function private.protect_linked_candidate_competency() from public;
revoke all on function private.validate_development_action_actors() from public;
revoke all on function private.protect_development_action_ownership() from public;
revoke all on function private.validate_evidence_action_link() from public;
revoke all on function private.validate_evidence_verification_actor() from public;

create trigger evidence_entries_validate_actor_membership
before insert or update of candidate_id, cpd_signed_off_by_user_id
on public.evidence_entries
for each row execute function private.validate_evidence_actor_membership();

create trigger evidence_entries_protect_ownership
before update of candidate_id, created_at
on public.evidence_entries
for each row execute function private.protect_evidence_ownership();

create trigger evidence_competency_links_validate_integrity
before insert or update of evidence_id, competency_definition_id, accepted_by_user_id
on public.evidence_competency_links
for each row execute function private.validate_evidence_competency_link();

create trigger candidate_competencies_protect_evidence_links
before delete
on public.candidate_competencies
for each row execute function private.protect_linked_candidate_competency();

create trigger development_actions_validate_actor_membership
before insert or update of candidate_id, created_by_user_id, submitted_by_user_id, completed_by_user_id, archived_by_user_id
on public.development_actions
for each row execute function private.validate_development_action_actors();

create trigger development_actions_protect_ownership
before update of candidate_id, candidate_competency_id, cycle_id, created_at, created_by_user_id, created_by_display_name
on public.development_actions
for each row execute function private.protect_development_action_ownership();

create trigger evidence_action_links_validate_integrity
before insert or update of evidence_id, development_action_id, created_by_user_id
on public.evidence_action_links
for each row execute function private.validate_evidence_action_link();

create trigger evidence_verification_events_validate_actor_membership
before insert or update of evidence_id, actor_user_id
on public.evidence_verification_events
for each row execute function private.validate_evidence_verification_actor();

alter table public.standard_task_definitions enable row level security;
alter table public.evidence_entries enable row level security;
alter table public.evidence_competency_links enable row level security;
alter table public.development_actions enable row level security;
alter table public.evidence_action_links enable row level security;
alter table public.evidence_verification_events enable row level security;
