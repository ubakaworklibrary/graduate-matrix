create table public.candidate_placements (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  host_discipline text not null check (host_discipline in ('Mechanical & Public Health', 'Electrical', 'Sustainability', 'Administration')),
  starts_on date not null,
  ends_on date not null,
  status text not null default 'planned' check (status in ('planned', 'active', 'completed', 'cancelled')),
  host_team text not null default '',
  supervisor_name text not null default '',
  objectives text not null default '',
  task_completion jsonb not null default '{}'::jsonb,
  reflection text not null default '',
  mentor_verified_at timestamptz,
  mentor_verified_by_user_id uuid references public.user_profiles (user_id) on delete set null,
  mentor_verified_by_display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint candidate_placements_date_order check (ends_on >= starts_on),
  constraint candidate_placements_verification_check check (
    (mentor_verified_at is null and mentor_verified_by_user_id is null and mentor_verified_by_display_name is null)
    or (mentor_verified_at is not null and mentor_verified_by_display_name is not null)
  )
);

create index candidate_placements_candidate_dates_idx
  on public.candidate_placements (candidate_id, starts_on desc, ends_on desc);

alter table public.candidate_placements enable row level security;

create policy candidate_placements_select_authorized
on public.candidate_placements for select to authenticated
using (private.can_access_candidate(candidate_id));

create policy candidate_placements_insert_authorized
on public.candidate_placements for insert to authenticated
with check (private.can_manage_candidate_development(candidate_id));

create policy candidate_placements_update_authorized
on public.candidate_placements for update to authenticated
using (private.can_manage_candidate_development(candidate_id))
with check (private.can_manage_candidate_development(candidate_id));

create policy candidate_placements_delete_authorized
on public.candidate_placements for delete to authenticated
using (private.can_manage_candidate_development(candidate_id));

-- Candidate, mentor and organisation-admin setup users may choose controlled
-- relationship names. Linked user IDs remain protected by the membership trigger.
create policy candidate_relationships_insert_setup_authorized
on public.candidate_relationships for insert to authenticated
with check (private.can_manage_candidate_development(candidate_id));

create policy candidate_relationships_update_setup_authorized
on public.candidate_relationships for update to authenticated
using (private.can_manage_candidate_development(candidate_id))
with check (private.can_manage_candidate_development(candidate_id));

grant select, insert, update, delete on public.candidate_placements to authenticated;
