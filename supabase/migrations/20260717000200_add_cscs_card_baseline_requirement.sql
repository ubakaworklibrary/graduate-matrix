insert into public.baseline_task_definitions (
  id,
  title,
  description,
  mandatory,
  completion_mode,
  source_order,
  definition_version,
  is_active
)
values (
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
