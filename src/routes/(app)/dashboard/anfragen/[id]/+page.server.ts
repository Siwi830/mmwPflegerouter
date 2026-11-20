import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { helpRequests, memberships, users, careRecipients } from '$lib/server/db/schema';

const managers = ['OWNER', 'ADMIN', 'COORDINATOR'];
const statuses = ['OPEN', 'MATCHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
const priorities = ['EMERGENCY', 'URGENT', 'NORMAL', 'WISH'] as const;
const categories = ['SHOPPING', 'COMPANIONSHIP', 'TRANSPORT', 'HOUSEHOLD', 'DIGITAL_HELP', 'OTHER'] as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function context(locals: App.Locals, id: string) {
  if (!locals.user) redirect(303, '/login');
  if (!uuid.test(id)) error(404, 'Aufgabe nicht gefunden');
  const [request] = await db.select({
    id: helpRequests.id, organizationId: helpRequests.organizationId,
    recipientId: helpRequests.recipientId, title: helpRequests.title,
    description: helpRequests.description, category: helpRequests.category,
    priority: helpRequests.priority, status: helpRequests.status,
    assignedUserId: helpRequests.assignedUserId, createdAt: helpRequests.createdAt,
    updatedAt: helpRequests.updatedAt, preferredAt: helpRequests.preferredAt
  }).from(helpRequests).where(eq(helpRequests.id, id)).limit(1);
  if (!request) error(404, 'Aufgabe nicht gefunden');
  const [membership] = await db.select({ role: memberships.role })
    .from(memberships)
    .where(and(eq(memberships.organizationId, request.organizationId), eq(memberships.userId, locals.user.id)))
    .limit(1);
  if (!membership || membership.role === 'VIEWER') error(403, 'Keine Berechtigung');
  return { request, userId: locals.user.id, isManager: managers.includes(membership.role) };
}

export const load: PageServerLoad = async ({ locals, params }) => {
  const { request, userId, isManager } = await context(locals, params.id);
  const [recipient] = await db.select({ firstName: careRecipients.firstName, lastName: careRecipients.lastName })
    .from(careRecipients).where(eq(careRecipients.id, request.recipientId)).limit(1);
  const assignees = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
    .from(memberships).innerJoin(users, eq(memberships.userId, users.id))
    .where(and(eq(memberships.organizationId, request.organizationId), inArray(memberships.role, ['OWNER', 'ADMIN', 'COORDINATOR', 'VOLUNTEER']), eq(users.status, 'ACTIVE')));
  const assigned = assignees.find((u) => u.id === request.assignedUserId);
  return { request, recipient, assignees, assignedName: assigned ? `${assigned.firstName} ${assigned.lastName}` : null, isManager, isMine: request.assignedUserId === userId };
};

export const actions: Actions = {
  claim: async ({ locals, params }) => {
    const { request, userId } = await context(locals, params.id);
    if (['COMPLETED', 'CANCELLED'].includes(request.status)) return fail(400, { message: 'Abgeschlossene oder abgebrochene Aufgaben können nicht zugewiesen werden.' });
    const changed = await db.update(helpRequests)
      .set({ assignedUserId: userId, status: 'MATCHED', updatedAt: new Date() })
      .where(and(eq(helpRequests.id, request.id), isNull(helpRequests.assignedUserId), inArray(helpRequests.status, ['OPEN', 'MATCHED', 'IN_PROGRESS'])))
      .returning({ id: helpRequests.id });
    if (!changed.length) return fail(409, { message: 'Die Aufgabe wurde zwischenzeitlich zugewiesen. Bitte Seite neu laden.' });
    return { message: 'Aufgabe übernommen.' };
  },
  assign: async ({ request: eventRequest, locals, params }) => {
    const { request, isManager } = await context(locals, params.id);
    if (!isManager) error(403, 'Nur die Verwaltung darf andere Personen zuweisen.');
    if (['COMPLETED', 'CANCELLED'].includes(request.status)) return fail(400, { message: 'Diese Aufgabe ist nicht mehr aktiv.' });
    const target = String((await eventRequest.formData()).get('userId') ?? '');
    if (!uuid.test(target)) return fail(400, { message: 'Bitte eine Person auswählen.' });
    const [eligible] = await db.select({ id: memberships.userId }).from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(and(eq(memberships.organizationId, request.organizationId), eq(memberships.userId, target), inArray(memberships.role, ['OWNER', 'ADMIN', 'COORDINATOR', 'VOLUNTEER']), eq(users.status, 'ACTIVE'))).limit(1);
    if (!eligible) return fail(400, { message: 'Diese Person darf keine Aufgaben der Organisation übernehmen.' });
    const changed = await db.update(helpRequests)
      .set({ assignedUserId: target, status: 'MATCHED', updatedAt: new Date() })
      .where(and(eq(helpRequests.id, request.id), inArray(helpRequests.status, ['OPEN', 'MATCHED', 'IN_PROGRESS'])))
      .returning({ id: helpRequests.id });
    if (!changed.length) return fail(409, { message: 'Die Aufgabe wurde inzwischen abgeschlossen.' });
    return { message: 'Zuordnung gespeichert.' };
  },
  unassign: async ({ locals, params }) => {
    const { request, userId, isManager } = await context(locals, params.id);
    if (!isManager && request.assignedUserId !== userId) error(403, 'Du darfst nur deine eigene Zuordnung lösen.');
    if (!request.assignedUserId) return fail(400, { message: 'Diese Aufgabe ist nicht zugewiesen.' });
    const changed = await db.update(helpRequests)
      .set({ assignedUserId: null, status: ['COMPLETED', 'CANCELLED'].includes(request.status) ? request.status : 'OPEN', updatedAt: new Date() })
      .where(and(eq(helpRequests.id, request.id), eq(helpRequests.assignedUserId, request.assignedUserId)))
      .returning({ id: helpRequests.id });
    if (!changed.length) return fail(409, { message: 'Die Zuordnung wurde inzwischen verändert. Bitte Seite neu laden.' });
    return { message: ['COMPLETED', 'CANCELLED'].includes(request.status) ? 'Zuordnung gelöst. Der Abschlussstatus bleibt erhalten.' : 'Zuordnung gelöst. Die Aufgabe ist wieder offen.' };
  },
  update: async ({ request: eventRequest, locals, params }) => {
    const { request, userId, isManager } = await context(locals, params.id);
    if (!isManager && request.assignedUserId !== userId) error(403, 'Nur zuständige Personen dürfen die Aufgabe bearbeiten.');
    const form = await eventRequest.formData();
    const title = String(form.get('title') ?? '').trim();
    const description = String(form.get('description') ?? '').trim();
    const category = String(form.get('category') ?? '');
    const priority = String(form.get('priority') ?? '');
    const status = String(form.get('status') ?? '');
    if (!title || title.length > 200 || description.length > 5000) return fail(400, { message: 'Titel (max. 200 Zeichen) oder Beschreibung (max. 5000 Zeichen) ungültig.' });
    if (!categories.includes(category as typeof categories[number]) || !priorities.includes(priority as typeof priorities[number]) || !statuses.includes(status as typeof statuses[number])) return fail(400, { message: 'Ungültige Kategorie, Priorität oder Status.' });
    if (!isManager && (title !== request.title || description !== (request.description ?? '') || category !== request.category || priority !== request.priority)) return fail(403, { message: 'Nur die Verwaltung darf die Angaben zur Anfrage ändern.' });
    if (!isManager && !['IN_PROGRESS', 'COMPLETED'].includes(status)) return fail(403, { message: 'Du darfst nur die Bearbeitung beginnen oder abschließen.' });
    if (status === 'OPEN' && request.assignedUserId) return fail(400, { message: 'Bitte zuerst die Zuordnung lösen.' });
    if (['MATCHED', 'IN_PROGRESS'].includes(status) && !request.assignedUserId) return fail(400, { message: 'Bitte zuerst eine Person zuweisen.' });
    const changed = await db.update(helpRequests).set({
      title, description: description || null,
      category: category as typeof categories[number],
      priority, status: status as typeof statuses[number], updatedAt: new Date()
    }).where(and(eq(helpRequests.id, request.id), eq(helpRequests.updatedAt, request.updatedAt))).returning({ id: helpRequests.id });
    if (!changed.length) return fail(409, { message: 'Die Aufgabe wurde zwischenzeitlich geändert. Bitte neu laden.' });
    return { message: 'Änderungen gespeichert.' };
  }
};
