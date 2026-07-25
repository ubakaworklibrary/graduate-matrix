alter table public.candidate_pathways
  add column configured_at timestamptz,
  add column configured_by_user_id uuid,
  add column configured_by_display_name text;

alter table public.candidate_pathways
  add constraint candidate_pathways_configured_by_user_id_fkey
  foreign key (configured_by_user_id)
  references public.user_profiles (user_id)
  on delete set null;

alter table public.candidate_pathways
  add constraint candidate_pathways_configuration_state_check
  check (
    (
      configured_at is null
      and configured_by_user_id is null
      and configured_by_display_name is null
    )
    or
    (
      configured_at is not null
      and configured_by_display_name is not null
      and btrim(configured_by_display_name) <> ''
    )
  );
