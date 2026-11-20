import { and, asc, desc, eq, isNull, or, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/client';
import { appointments, careRecipients, helpRequests, organizations } from '$lib/server/db/schema';
import { requireTenant } from '$lib/server/tenant-context';

export const load: PageServerLoad = async ({ locals, cookies }) => {
  const ctx = await requireTenant(locals, cookies);
  const org = ctx.organizationId;
  const visible = ctx.canManage
    ? eq(helpRequests.organizationId, org)
    : and(eq(helpRequests.organizationId, org), or(
        and(eq(helpRequests.status, 'OPEN'), isNull(helpRequests.assignedUserId)),
        eq(helpRequests.assignedUserId, ctx.user.id)
      ));
  const [requests, linkedAppointments] = await Promise.all([
    db.select({
      id: helpRequests.id, title: helpRequests.title, description: helpRequests.description,
      category: helpRequests.category, priority: helpRequests.priority, status: helpRequests.status,
      assignedUserId: helpRequests.assignedUserId, createdAt: helpRequests.createdAt,
      recipientId: careRecipients.id, recipientFirstName: careRecipients.firstName,
      recipientLastName: careRecipients.lastName, organizationName: organizations.name
    }).from(helpRequests)
      .innerJoin(careRecipients, and(eq(helpRequests.recipientId, careRecipients.id), eq(careRecipients.organizationId, org)))
      .innerJoin(organizations, eq(helpRequests.organizationId, organizations.id))
      .where(visible)
      .orderBy(sql`case ${helpRequests.priority} when 'EMERGENCY' then 0 when 'URGENT' then 1 when 'NORMAL' then 2 else 3 end`, desc(helpRequests.createdAt)),
    db.select({ requestId: appointments.requestId, id: appointments.id, title: appointments.title,
      startsAt: appointments.startsAt, status: appointments.status })
      .from(appointments)
      .where(and(eq(appointments.organizationId, org), sql`${appointments.requestId} is not null`))
      .orderBy(asc(appointments.startsAt))
  ]);
  const visibleIds = new Set(requests.map(r => r.id));
  return {
    organizationName: ctx.organizationName, canManage: ctx.canManage, requests,
    appointments: linkedAppointments.filter(a => a.requestId && visibleIds.has(a.requestId))
  };
};
