import { and, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/client';
import { careRepresentations, careRecipients } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/pflegerouter-access';
export const load: PageServerLoad = async ({ locals }) => {
  const user = await requireUser(locals);
  const requests = await db.select({ id: careRepresentations.id, type: careRepresentations.type,
    status: careRepresentations.status, recipientName: careRecipients.firstName,
    recipientSurname: careRecipients.lastName, recipientId: careRecipients.id,
    canView: careRepresentations.canView,
    canManageRequests: careRepresentations.canManageRequests,
    canManageAppointments: careRepresentations.canManageAppointments })
    .from(careRepresentations).innerJoin(careRecipients, eq(careRepresentations.recipientId, careRecipients.id))
    .where(and(eq(careRepresentations.representativeUserId, user.id),
      eq(careRepresentations.organizationId, careRecipients.organizationId)));
  const incoming = await db.select({ id: careRepresentations.id,
    recipientName: careRecipients.firstName, recipientSurname: careRecipients.lastName })
    .from(careRepresentations).innerJoin(careRecipients,
      and(eq(careRepresentations.recipientId, careRecipients.id),
        eq(careRepresentations.organizationId, careRecipients.organizationId)))
    .where(and(eq(careRecipients.userId, user.id),
      eq(careRepresentations.type, 'CONSENT'), eq(careRepresentations.status, 'PENDING')));
  return { requests, incoming };
};
