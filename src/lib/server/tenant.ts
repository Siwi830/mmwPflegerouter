import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import {
  memberships,
  organizations
} from '$lib/server/db/schema';

export const TENANT_COOKIE = 'active_organization';

export async function getUserOrganizations(userId: string) {
  return db
    .select({
      organizationId: memberships.organizationId,
      organizationName: organizations.name,
      role: memberships.role
    })
    .from(memberships)
    .innerJoin(
      organizations,
      eq(memberships.organizationId, organizations.id)
    )
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.isActive, true)
      )
    );
}

export async function resolveActiveOrganization(
  userId: string,
  requestedOrganizationId?: string
) {
  const organizations = await getUserOrganizations(userId);

  const activeOrganization =
    organizations.find(
      (organization) =>
        organization.organizationId === requestedOrganizationId
    ) ?? organizations[0] ?? null;

  return {
    organizations,
    activeOrganization
  };
}