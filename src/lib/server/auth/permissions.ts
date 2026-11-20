
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { memberships } from '$lib/server/db/schema';

export async function hasOrganizationAccess(
  userId: string,
  organizationId: string,
  allowedRoles: Array<
    'OWNER' | 'ADMIN' | 'COORDINATOR' | 'VOLUNTEER' | 'VIEWER'
  > = ['OWNER', 'ADMIN', 'COORDINATOR', 'VOLUNTEER', 'VIEWER']
): Promise<boolean> {
  const [membership] = await db
    .select({
      role: memberships.role
    })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.organizationId, organizationId),
        eq(memberships.isActive, true)
      )
    )
    .limit(1);

  return Boolean(
    membership && allowedRoles.includes(membership.role)
  );
}
