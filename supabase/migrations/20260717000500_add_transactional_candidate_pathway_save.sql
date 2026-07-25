create function private.can_configure_candidate_pathway(
  target_candidate_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.candidates as candidate
    join public.organization_memberships as membership
      on membership.organization_id = candidate.organization_id
     and membership.user_id = auth.uid()
     and membership.archived_at is null
    where candidate.id = target_candidate_id
      and (
        candidate.user_id = auth.uid()
        or membership.membership_role = 'organization-admin'
        or exists (
          select 1
          from public.candidate_relationships as relationship
          where relationship.candidate_id = candidate.id
            and relationship.relationship_type = 'mentor'
            and relationship.user_id = auth.uid()
            and relationship.starts_at <= now()
            and relationship.ends_at is null
        )
      )
  );
$$;

revoke all on function private.can_configure_candidate_pathway(uuid) from public;

create function public.save_candidate_pathway_configuration(
  p_candidate_id uuid,
  p_operation text,
  p_professional_body text,
  p_primary_outcome text,
  p_cibse_membership_target text,
  p_iet_membership_target text,
  p_engineering_registration_target text,
  p_current_membership_status text,
  p_academic_route text,
  p_notes text,
  p_lcc_strands text[],
  p_specialist_routes text[]
)
returns public.candidate_pathways
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  actor_display_name text;
  pathway_row public.candidate_pathways%rowtype;
  lcc_strands text[];
  specialist_routes text[];
begin
  if actor_user_id is null then
    raise exception using errcode = '28000', message = 'Authentication is required to configure a candidate pathway.';
  end if;

  if p_candidate_id is null then
    raise exception using errcode = '22023', message = 'A candidate is required.';
  end if;

  perform 1
  from public.candidates as candidate
  where candidate.id = p_candidate_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'The candidate does not exist.';
  end if;

  if not private.can_configure_candidate_pathway(p_candidate_id) then
    raise exception using errcode = '42501', message = 'You are not authorised to configure this candidate pathway.';
  end if;

  select nullif(btrim(profile.display_name), '')
  into actor_display_name
  from public.user_profiles as profile
  where profile.user_id = actor_user_id;

  if actor_display_name is null then
    raise exception using errcode = '22023', message = 'The authenticated user must have a display name.';
  end if;

  if p_operation not in ('configure', 'clear') or p_operation is null then
    raise exception using errcode = '22023', message = 'The pathway operation must be configure or clear.';
  end if;

  if p_lcc_strands is null or p_specialist_routes is null then
    raise exception using
      errcode = '22023',
      message = 'LCC strand and specialist-route selections must be supplied.';
  end if;

  lcc_strands := p_lcc_strands;
  specialist_routes := p_specialist_routes;

  insert into public.candidate_pathways (
    candidate_id,
    professional_body,
    primary_outcome,
    cibse_membership_target,
    iet_membership_target,
    engineering_registration_target,
    current_membership_status,
    academic_route,
    notes,
    configured_at,
    configured_by_user_id,
    configured_by_display_name
  )
  values (
    p_candidate_id,
    'other',
    'custom',
    'none',
    'none',
    'none',
    '',
    '',
    '',
    null,
    null,
    null
  )
  on conflict (candidate_id) do nothing;

  select pathway.*
  into pathway_row
  from public.candidate_pathways as pathway
  where pathway.candidate_id = p_candidate_id
  for update;

  if p_operation = 'clear' then
    if p_professional_body is not null
      or p_primary_outcome is not null
      or p_cibse_membership_target not in ('none')
      or p_iet_membership_target not in ('none')
      or p_engineering_registration_target not in ('none')
      or coalesce(p_current_membership_status, '') <> ''
      or coalesce(p_academic_route, '') <> ''
      or coalesce(p_notes, '') <> ''
      or cardinality(lcc_strands) <> 0
      or cardinality(specialist_routes) <> 0
    then
      raise exception using errcode = '22023', message = 'A clear operation cannot contain pathway selections.';
    end if;

    update public.candidate_pathways
    set professional_body = 'other',
        primary_outcome = 'custom',
        cibse_membership_target = 'none',
        iet_membership_target = 'none',
        engineering_registration_target = 'none',
        current_membership_status = '',
        academic_route = '',
        notes = '',
        configured_at = null,
        configured_by_user_id = null,
        configured_by_display_name = null,
        updated_at = transaction_timestamp()
    where candidate_id = p_candidate_id;

    delete from public.candidate_pathway_lcc_strands
    where candidate_id = p_candidate_id;

    delete from public.candidate_pathway_specialist_routes
    where candidate_id = p_candidate_id;
  else
    if p_professional_body is null or p_primary_outcome is null then
      raise exception using errcode = '22023', message = 'Professional body and primary outcome are required.';
    end if;

    if p_cibse_membership_target is null
      or p_iet_membership_target is null
      or p_engineering_registration_target is null
    then
      raise exception using errcode = '22023', message = 'All dependent pathway targets are required.';
    end if;

    if p_professional_body not in ('cibse', 'iet', 'imeche', 'cibse-certification', 'internal', 'other') then
      raise exception using errcode = '22023', message = 'The professional body value is not recognised.';
    end if;

    if p_primary_outcome not in (
      'internal-graduate', 'engtech-lcibse', 'ieng-acibse', 'ieng-mcibse',
      'ceng-mcibse', 'ceng-fcibse', 'engtech-iet', 'ieng-iet', 'ceng-iet',
      'engtech-imeche', 'ieng-imeche', 'ceng-imeche', 'lcc', 'lcea',
      'cibse-cert-specialist', 'custom'
    ) then
      raise exception using errcode = '22023', message = 'The primary outcome value is not recognised.';
    end if;

    if not (
      (p_professional_body = 'cibse' and p_primary_outcome in ('internal-graduate', 'engtech-lcibse', 'ieng-acibse', 'ieng-mcibse', 'ceng-mcibse', 'ceng-fcibse', 'custom'))
      or (p_professional_body = 'iet' and p_primary_outcome in ('internal-graduate', 'engtech-iet', 'ieng-iet', 'ceng-iet', 'custom'))
      or (p_professional_body = 'imeche' and p_primary_outcome in ('internal-graduate', 'engtech-imeche', 'ieng-imeche', 'ceng-imeche', 'custom'))
      or (p_professional_body = 'cibse-certification' and p_primary_outcome in ('lcc', 'lcea', 'cibse-cert-specialist', 'custom'))
      or (p_professional_body = 'internal' and p_primary_outcome = 'internal-graduate')
      or (p_professional_body = 'other' and p_primary_outcome in ('custom', 'internal-graduate'))
    ) then
      raise exception using errcode = '22023', message = 'The professional body and primary outcome combination is invalid.';
    end if;

    if p_cibse_membership_target not in ('none', 'graduate', 'affiliate', 'lcibse', 'acibse', 'mcibse', 'fcibse')
      or p_iet_membership_target not in ('none', 'student', 'tmiet', 'miet', 'fiet')
      or p_engineering_registration_target not in ('none', 'engtech', 'ieng', 'ceng', 'international-later')
    then
      raise exception using errcode = '22023', message = 'A dependent pathway target value is not recognised.';
    end if;

    if (p_professional_body <> 'cibse' and p_cibse_membership_target <> 'none')
      or (p_professional_body <> 'iet' and p_iet_membership_target <> 'none')
      or (p_professional_body not in ('cibse', 'iet', 'imeche') and p_engineering_registration_target <> 'none')
    then
      raise exception using errcode = '22023', message = 'A dependent target does not apply to the selected professional body.';
    end if;

    if p_professional_body = 'cibse'
      and p_cibse_membership_target not in ('none', 'graduate', 'affiliate', 'lcibse', 'acibse', 'mcibse', 'fcibse')
    then
      raise exception using errcode = '22023', message = 'The CIBSE membership target is invalid.';
    end if;

    if p_professional_body = 'iet'
      and p_iet_membership_target not in ('none', 'student', 'tmiet', 'miet', 'fiet')
    then
      raise exception using errcode = '22023', message = 'The IET membership target is invalid.';
    end if;

    if p_primary_outcome = 'internal-graduate'
      and (p_cibse_membership_target, p_iet_membership_target, p_engineering_registration_target) <> ('none', 'none', 'none')
      or p_primary_outcome = 'engtech-lcibse'
      and (p_cibse_membership_target, p_iet_membership_target, p_engineering_registration_target) <> ('lcibse', 'none', 'engtech')
      or p_primary_outcome = 'ieng-acibse'
      and (p_cibse_membership_target, p_iet_membership_target, p_engineering_registration_target) <> ('acibse', 'none', 'ieng')
      or p_primary_outcome = 'ieng-mcibse'
      and (p_cibse_membership_target, p_iet_membership_target, p_engineering_registration_target) <> ('mcibse', 'none', 'ieng')
      or p_primary_outcome = 'ceng-mcibse'
      and (p_cibse_membership_target, p_iet_membership_target, p_engineering_registration_target) <> ('mcibse', 'none', 'ceng')
      or p_primary_outcome = 'ceng-fcibse'
      and (p_cibse_membership_target, p_iet_membership_target, p_engineering_registration_target) <> ('fcibse', 'none', 'ceng')
      or p_primary_outcome = 'engtech-iet'
      and (p_cibse_membership_target, p_iet_membership_target, p_engineering_registration_target) <> ('none', 'tmiet', 'engtech')
      or p_primary_outcome = 'ieng-iet'
      and (p_cibse_membership_target, p_iet_membership_target, p_engineering_registration_target) <> ('none', 'miet', 'ieng')
      or p_primary_outcome = 'ceng-iet'
      and (p_cibse_membership_target, p_iet_membership_target, p_engineering_registration_target) <> ('none', 'miet', 'ceng')
      or p_primary_outcome = 'engtech-imeche'
      and (p_cibse_membership_target, p_iet_membership_target, p_engineering_registration_target) <> ('none', 'none', 'engtech')
      or p_primary_outcome = 'ieng-imeche'
      and (p_cibse_membership_target, p_iet_membership_target, p_engineering_registration_target) <> ('none', 'none', 'ieng')
      or p_primary_outcome = 'ceng-imeche'
      and (p_cibse_membership_target, p_iet_membership_target, p_engineering_registration_target) <> ('none', 'none', 'ceng')
      or p_primary_outcome in ('lcc', 'lcea')
      and (p_cibse_membership_target, p_iet_membership_target, p_engineering_registration_target) <> ('none', 'none', 'none')
    then
      raise exception using errcode = '22023', message = 'The dependent targets do not match the selected primary outcome.';
    end if;

    if cardinality(lcc_strands) <> cardinality(array(
      select distinct strand.value
      from unnest(lcc_strands) as strand(value)
    )) then
      raise exception using errcode = '22023', message = 'LCC strand selections cannot contain duplicates.';
    end if;

    if cardinality(specialist_routes) <> cardinality(array(
      select distinct route.value
      from unnest(specialist_routes) as route(value)
    )) then
      raise exception using errcode = '22023', message = 'Specialist-route selections cannot contain duplicates.';
    end if;

    if exists (
      select 1 from unnest(lcc_strands) as strand(value)
      where strand.value is null
        or strand.value not in ('building-design', 'building-operation', 'simulation', 'energy-management-systems')
    ) then
      raise exception using errcode = '22023', message = 'An LCC strand value is not recognised.';
    end if;

    if exists (
      select 1 from unnest(specialist_routes) as route(value)
      where route.value is null
        or route.value not in ('lcea', 'air-conditioning-inspection', 'section-63', 'esos-lead-assessor', 'heat-networks-consultant', 'whole-life-carbon-assessor', 'nabers-uk-assessor', 'management-systems-specialist')
    ) then
      raise exception using errcode = '22023', message = 'A specialist-route value is not recognised.';
    end if;

    if p_primary_outcome <> 'lcc' and cardinality(lcc_strands) <> 0 then
      raise exception using errcode = '22023', message = 'LCC strands do not apply to the selected primary outcome.';
    end if;

    if p_professional_body <> 'cibse-certification' and cardinality(specialist_routes) <> 0 then
      raise exception using errcode = '22023', message = 'Specialist routes do not apply to the selected professional body.';
    end if;

    if p_primary_outcome = 'lcea'
      and (cardinality(specialist_routes) <> 1 or specialist_routes[1] <> 'lcea')
    then
      raise exception using errcode = '22023', message = 'The LCEA outcome requires the LCEA specialist route.';
    end if;

    update public.candidate_pathways
    set professional_body = p_professional_body,
        primary_outcome = p_primary_outcome,
        cibse_membership_target = p_cibse_membership_target,
        iet_membership_target = p_iet_membership_target,
        engineering_registration_target = p_engineering_registration_target,
        current_membership_status = coalesce(p_current_membership_status, ''),
        academic_route = coalesce(p_academic_route, ''),
        notes = coalesce(p_notes, ''),
        configured_at = transaction_timestamp(),
        configured_by_user_id = actor_user_id,
        configured_by_display_name = actor_display_name,
        updated_at = transaction_timestamp()
    where candidate_id = p_candidate_id;

    delete from public.candidate_pathway_lcc_strands
    where candidate_id = p_candidate_id;

    insert into public.candidate_pathway_lcc_strands (candidate_id, strand_code)
    select p_candidate_id, strand.value
    from unnest(lcc_strands) as strand(value);

    delete from public.candidate_pathway_specialist_routes
    where candidate_id = p_candidate_id;

    insert into public.candidate_pathway_specialist_routes (candidate_id, route_code)
    select p_candidate_id, route.value
    from unnest(specialist_routes) as route(value);
  end if;

  select pathway.*
  into pathway_row
  from public.candidate_pathways as pathway
  where pathway.candidate_id = p_candidate_id;

  return pathway_row;
end;
$$;

revoke all on function public.save_candidate_pathway_configuration(
  uuid, text, text, text, text, text, text, text, text, text, text[], text[]
) from public;
revoke all on function public.save_candidate_pathway_configuration(
  uuid, text, text, text, text, text, text, text, text, text, text[], text[]
) from anon;
grant execute on function public.save_candidate_pathway_configuration(
  uuid, text, text, text, text, text, text, text, text, text, text[], text[]
) to authenticated;
