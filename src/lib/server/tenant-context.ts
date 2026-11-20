import { error, redirect } from '@sveltejs/kit';
import { TENANT_COOKIE, resolveActiveOrganization } from '$lib/server/tenant';
import type { Cookies } from '@sveltejs/kit';

export async function requireTenant(locals: App.Locals, cookies: Cookies) {
  const user = locals.user;
  if (!user) redirect(303, '/login');
  const { activeOrganization } = await resolveActiveOrganization(user.id, cookies.get(TENANT_COOKIE));
  if (!activeOrganization) error(403, 'Keine aktive Organisationsmitgliedschaft');
  const role = activeOrganization.role;
  return { user, organizationId: activeOrganization.organizationId, organizationName: activeOrganization.organizationName,
    role, canManage: role === 'OWNER' || role === 'ADMIN' || role === 'COORDINATOR' };
}
