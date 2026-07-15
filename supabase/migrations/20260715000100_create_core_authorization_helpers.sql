create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated;

create function private.is_active_organization_member(
  target_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships as membership
    where membership.organization_id = target_organization_id
      and membership.user_id = auth.uid()
      and membership.archived_at is null
  );
$$;

create function private.is_organization_admin(
  target_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships as membership
    where membership.organization_id = target_organization_id
      and membership.user_id = auth.uid()
      and membership.membership_role = 'organization-admin'
      and membership.archived_at is null
  );
$$;

revoke all on function private.is_active_organization_member(uuid) from public;
revoke all on function private.is_organization_admin(uuid) from public;

grant execute on function private.is_active_organization_member(uuid) to authenticated;
grant execute on function private.is_organization_admin(uuid) to authenticated;
