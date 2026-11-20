import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/client';
import { users, memberships } from '$lib/server/db/schema';
import { requireTenant } from '$lib/server/tenant-context';

export const load: PageServerLoad = async ({ locals, cookies }) => {
  const tenant = await requireTenant(locals, cookies);
  if (tenant.role !== 'OWNER' && tenant.role !== 'ADMIN') error(403, 'Kein Zugriff');
  const rows = await db.select({
    id: users.id, firstName: users.firstName, lastName: users.lastName,
    email: users.email, role: memberships.role
  }).from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(memberships.organizationId, tenant.organizationId), eq(memberships.isActive, true)));
  return { users: rows.map(({ firstName, lastName, ...rest }) => ({ ...rest, name: `${firstName} ${lastName}` })) };
};
