import { and, eq, inArray } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/client';
import { helpRequests, appointments } from '$lib/server/db/schema';
import { requireUser, requireView } from '$lib/server/pflegerouter-access';
export const load: PageServerLoad = async ({ locals, cookies, params }) => {
  const user = await requireUser(locals);
  const context = await requireView(params.view, user, cookies);
  if (context.view !== 'self' && context.view !== 'other') return { ...context, requests: [], appointments: [] };
  const recipientIds = context.recipients.map(r => r.id);
  if (!recipientIds.length) return { ...context, requests: [], appointments: [] };
  const [requests, dates] = await Promise.all([
    db.select({ id: helpRequests.id, recipientId: helpRequests.recipientId,
      title: helpRequests.title, status: helpRequests.status, priority: helpRequests.priority })
      .from(helpRequests).where(inArray(helpRequests.recipientId, recipientIds)).limit(100),
    db.select({ id: appointments.id, recipientId: appointments.recipientId,
      title: appointments.title, startsAt: appointments.startsAt, status: appointments.status })
      .from(appointments).where(inArray(appointments.recipientId, recipientIds)).limit(100)
  ]);
  return { ...context, requests, appointments: dates };
};
