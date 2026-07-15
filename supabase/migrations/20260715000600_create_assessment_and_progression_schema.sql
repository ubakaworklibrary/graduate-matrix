create table public.mentor_assessments (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null,
  candidate_competency_id uuid not null,
  cycle_id uuid not null,
  status text not null,
  recommendation text not null,
  next_action text not null default '',
  assessed_at timestamptz,
  assessed_by_user_id uuid references public.user_profiles (user_id) on delete set null,
  assessed_by_display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mentor_assessments_candidate_competency_fkey
    foreign key (candidate_id, candidate_competency_id)
    references public.candidate_competencies (candidate_id, id)
    on delete restrict,
  constraint mentor_assessments_cycle_fkey
    foreign key (candidate_competency_id, cycle_id)
    references public.competency_cycles (candidate_competency_id, id)
    on delete restrict,
  constraint mentor_assessments_status_check check (
    status in ('not-reviewed', 'more-evidence', 'demonstrated')
  ),
  constraint mentor_assessments_recommendation_check check (
    recommendation in ('not-set', 'maintain-level', 'progress-discussion')
  ),
  constraint mentor_assessments_assessor_check check (
    (
      assessed_at is null
      and assessed_by_user_id is null
      and assessed_by_display_name is null
    )
    or (
      assessed_at is not null
      and nullif(btrim(assessed_by_display_name), '') is not null
    )
  )
);

create index mentor_assessments_cycle_assessed_idx
  on public.mentor_assessments (cycle_id, assessed_at desc, updated_at desc);

create index mentor_assessments_candidate_competency_idx
  on public.mentor_assessments (candidate_competency_id, created_at desc);

create table public.competency_cycle_reviews (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null,
  candidate_competency_id uuid not null,
  cycle_id uuid not null,
  status text not null,
  recommendation text not null,
  next_action text,
  reviewed_at timestamptz not null,
  reviewed_by_user_id uuid references public.user_profiles (user_id) on delete set null,
  reviewed_by_display_name text not null,
  created_at timestamptz not null default now(),
  constraint competency_cycle_reviews_candidate_competency_fkey
    foreign key (candidate_id, candidate_competency_id)
    references public.candidate_competencies (candidate_id, id)
    on delete restrict,
  constraint competency_cycle_reviews_cycle_fkey
    foreign key (candidate_competency_id, cycle_id)
    references public.competency_cycles (candidate_competency_id, id)
    on delete restrict,
  constraint competency_cycle_reviews_status_check check (
    status in ('not-reviewed', 'more-evidence', 'demonstrated')
  ),
  constraint competency_cycle_reviews_recommendation_check check (
    recommendation in ('not-set', 'maintain-level', 'progress-discussion')
  ),
  constraint competency_cycle_reviews_reviewer_check check (
    nullif(btrim(reviewed_by_display_name), '') is not null
  )
);

create index competency_cycle_reviews_cycle_reviewed_idx
  on public.competency_cycle_reviews (cycle_id, reviewed_at desc, created_at desc);

create table public.progression_events (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null,
  candidate_competency_id uuid not null,
  cycle_id uuid not null,
  event_type text not null,
  occurred_at timestamptz not null,
  performed_by_user_id uuid references public.user_profiles (user_id) on delete set null,
  performed_by_display_name text not null,
  reason text,
  level text,
  from_level text,
  to_level text,
  previous_cycle_id uuid,
  destination_cycle_id uuid,
  mentor_approved_at timestamptz,
  mentor_approved_by_user_id uuid references public.user_profiles (user_id) on delete set null,
  mentor_approved_by_display_name text,
  manager_signed_off_at timestamptz,
  manager_signed_off_by_user_id uuid references public.user_profiles (user_id) on delete set null,
  manager_signed_off_by_display_name text,
  manager_signoff_confirmed boolean,
  approval_authority text,
  evidence_basis text,
  is_imported boolean not null default false,
  import_source_reference text,
  created_at timestamptz not null default now(),
  constraint progression_events_candidate_competency_fkey
    foreign key (candidate_id, candidate_competency_id)
    references public.candidate_competencies (candidate_id, id)
    on delete restrict,
  constraint progression_events_cycle_fkey
    foreign key (candidate_competency_id, cycle_id)
    references public.competency_cycles (candidate_competency_id, id)
    on delete restrict,
  constraint progression_events_previous_cycle_fkey
    foreign key (candidate_competency_id, previous_cycle_id)
    references public.competency_cycles (candidate_competency_id, id)
    on delete restrict,
  constraint progression_events_destination_cycle_fkey
    foreign key (candidate_competency_id, destination_cycle_id)
    references public.competency_cycles (candidate_competency_id, id)
    on delete restrict,
  constraint progression_events_type_check check (
    event_type in (
      'cycle-opened',
      'cycle-completed',
      'cycle-paused',
      'cycle-reopened',
      'cycle-reset',
      'cycle-archived'
    )
  ),
  constraint progression_events_level_check check (
    level is null or level in ('L1', 'L2', 'L3', 'L4', 'L5')
  ),
  constraint progression_events_from_level_check check (
    from_level is null or from_level in ('L1', 'L2', 'L3', 'L4', 'L5')
  ),
  constraint progression_events_to_level_check check (
    to_level is null or to_level in ('L1', 'L2', 'L3', 'L4', 'L5')
  ),
  constraint progression_events_authority_check check (
    approval_authority is null
    or approval_authority in ('mentor', 'mentor-and-manager')
  ),
  constraint progression_events_performer_check check (
    nullif(btrim(performed_by_display_name), '') is not null
  ),
  constraint progression_events_import_check check (
    is_imported or import_source_reference is null
  ),
  constraint progression_events_event_shape_check check (
    (
      event_type = 'cycle-opened'
      and level is not null
      and from_level is null
      and to_level is null
      and destination_cycle_id is null
      and mentor_approved_at is null
      and mentor_approved_by_user_id is null
      and mentor_approved_by_display_name is null
      and manager_signed_off_at is null
      and manager_signed_off_by_user_id is null
      and manager_signed_off_by_display_name is null
      and manager_signoff_confirmed is null
      and approval_authority is null
      and evidence_basis is null
    )
    or (
      event_type = 'cycle-completed'
      and level is null
      and previous_cycle_id is null
      and from_level is not null
      and (
        (to_level is null and destination_cycle_id is null)
        or (to_level is not null and destination_cycle_id is not null)
      )
      and mentor_approved_at is not null
      and nullif(btrim(mentor_approved_by_display_name), '') is not null
      and manager_signed_off_at is not null
      and nullif(btrim(manager_signed_off_by_display_name), '') is not null
      and manager_signoff_confirmed is true
      and approval_authority = 'mentor-and-manager'
      and nullif(btrim(reason), '') is not null
      and nullif(btrim(evidence_basis), '') is not null
    )
    or (
      event_type in ('cycle-paused', 'cycle-reopened', 'cycle-reset')
      and nullif(btrim(reason), '') is not null
      and level is null
      and from_level is null
      and to_level is null
      and previous_cycle_id is null
      and destination_cycle_id is null
      and mentor_approved_at is null
      and mentor_approved_by_user_id is null
      and mentor_approved_by_display_name is null
      and manager_signed_off_at is null
      and manager_signed_off_by_user_id is null
      and manager_signed_off_by_display_name is null
      and manager_signoff_confirmed is null
      and approval_authority is null
      and evidence_basis is null
    )
    or (
      event_type = 'cycle-archived'
      and level is null
      and from_level is null
      and to_level is null
      and previous_cycle_id is null
      and destination_cycle_id is null
      and mentor_approved_at is null
      and mentor_approved_by_user_id is null
      and mentor_approved_by_display_name is null
      and manager_signed_off_at is null
      and manager_signed_off_by_user_id is null
      and manager_signed_off_by_display_name is null
      and manager_signoff_confirmed is null
      and approval_authority is null
      and evidence_basis is null
    )
  )
);

create index progression_events_candidate_occurred_idx
  on public.progression_events (candidate_id, occurred_at desc, created_at desc, id desc);

create index progression_events_candidate_competency_occurred_idx
  on public.progression_events (candidate_competency_id, occurred_at desc, created_at desc, id desc);

create index progression_events_cycle_occurred_idx
  on public.progression_events (cycle_id, occurred_at desc, created_at desc, id desc);
