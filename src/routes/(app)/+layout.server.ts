import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

import {
  TENANT_COOKIE,
  resolveActiveOrganization
} from '$lib/server/tenant';

export const load: LayoutServerLoad = async ({
  locals,
  cookies
}) => {
  const user = locals.user;

  if (!user) {
    redirect(303, '/login');
  }

  const requestedOrganizationId =
    cookies.get(TENANT_COOKIE);

  const {
    organizations,
    activeOrganization
  } = await resolveActiveOrganization(
    user.id,
    requestedOrganizationId
  );

  if (!activeOrganization) {
    redirect(303, '/mein-bereich');
  }

  const role = activeOrganization.role;

  return {
    user,
    memberships: organizations,
    activeOrganization,

    canManageOrganizations:
      role === 'OWNER' || role === 'ADMIN',

    canManagePeople:
      role === 'OWNER' ||
      role === 'ADMIN' ||
      role === 'COORDINATOR',

    canReviewChanges:
      role === 'OWNER' ||
      role === 'ADMIN' ||
      role === 'COORDINATOR'
  };
};