import { error, fail, redirect } from '@sveltejs/kit';
import { and, asc, eq, inArray, or, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db/client';
import { appointments, appointmentParticipants, careRecipients, helpRequests, memberships, users } from '$lib/server/db/schema';
import { requireTenant } from '$lib/server/tenant-context';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const str = (form: FormData, key: string) => String(form.get(key) ?? '').trim();

export const load: PageServerLoad = async ({ locals, cookies, url }) => {
  const ctx = await requireTenant(locals, cookies);
  const org = ctx.organizationId;
  const visible = ctx.canManage ? eq(appointments.organizationId, org)
    : and(eq(appointments.organizationId, org), inArray(appointments.id,
        db.select({ id: appointmentParticipants.appointmentId }).from(appointmentParticipants)
          .where(and(eq(appointmentParticipants.organizationId, org), eq(appointmentParticipants.userId, ctx.user.id)))));

  const [items, requests, recipients, members, participation] = await Promise.all([
    db.select({ id: appointments.id, title: appointments.title, startsAt: appointments.startsAt,
      endsAt: appointments.endsAt, status: appointments.status, requestId: appointments.requestId,
      recipientId: appointments.recipientId, recipientFirstName: careRecipients.firstName,
      recipientLastName: careRecipients.lastName })
      .from(appointments)
      .innerJoin(careRecipients, and(eq(appointments.recipientId, careRecipients.id), eq(careRecipients.organizationId, org)))
      .where(visible).orderBy(asc(appointments.startsAt)),
    ctx.canManage ? db.select({ id: helpRequests.id, title: helpRequests.title, recipientId: helpRequests.recipientId })
      .from(helpRequests).where(eq(helpRequests.organizationId, org)) : Promise.resolve([]),
    ctx.canManage ? db.select({ id: careRecipients.id, firstName: careRecipients.firstName, lastName: careRecipients.lastName })
      .from(careRecipients).where(and(eq(careRecipients.organizationId, org), eq(careRecipients.isDeleted, false))) : Promise.resolve([]),
    ctx.canManage ? db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, role: memberships.role })
      .from(memberships).innerJoin(users, eq(memberships.userId, users.id))
      .where(and(eq(memberships.organizationId, org), eq(memberships.isActive, true))) : Promise.resolve([]),
    db.select({ appointmentId: appointmentParticipants.appointmentId, userId: appointmentParticipants.userId,
      firstName: users.firstName, lastName: users.lastName })
      .from(appointmentParticipants).innerJoin(users, eq(appointmentParticipants.userId, users.id))
      .where(eq(appointmentParticipants.organizationId, org))
  ]);
  const visibleIds = new Set(items.map(i => i.id));
  return { items, requests, recipients, members, canManage: ctx.canManage,
    organizationName: ctx.organizationName,
    participants: participation.filter(p => visibleIds.has(p.appointmentId)),
    selectedRequestId: url.searchParams.get('requestId') ?? '' };
};

export const actions: Actions = {
  create: async ({ locals, cookies, request }) => {
    const ctx = await requireTenant(locals, cookies);
    if (!ctx.canManage) error(403, 'Keine Berechtigung, Termine zu erstellen');
    const form = await request.formData();
    const title = str(form, 'title');
    const requestId = str(form, 'requestId');
    let recipientId = str(form, 'recipientId');
    let assignedUserId: string | null = null;
    const startsAt = new Date(str(form, 'startsAtIso'));
    const endsAt = new Date(str(form, 'endsAtIso'));
    const participantIds = [...new Set(form.getAll('participantIds').map(String))];
    if (!title || title.length > 200 || !Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || endsAt <= startsAt)
      return fail(400, { message: 'Titel und gültigen Zeitraum angeben (Ende nach Beginn).' });
    if (requestId && !uuid.test(requestId)) return fail(400, { message: 'Ungültige Hilfsanfrage.' });
    if (recipientId && !uuid.test(recipientId)) return fail(400, { message: 'Ungültige betreute Person.' });
    if (participantIds.some(id => !uuid.test(id))) return fail(400, { message: 'Ungültige Teilnehmer-ID.' });
    const org = ctx.organizationId;
    if (requestId) {
      const [linked] = await db.select({ recipientId: helpRequests.recipientId, assignedUserId: helpRequests.assignedUserId })
        .from(helpRequests).where(and(eq(helpRequests.id, requestId), eq(helpRequests.organizationId, org))).limit(1);
      if (!linked) return fail(400, { message: 'Hilfsanfrage gehört nicht zur aktiven Organisation.' });
      if (recipientId && recipientId !== linked.recipientId) return fail(400, { message: 'Betreute Person passt nicht zur Hilfsanfrage.' });
      recipientId = linked.recipientId;
      assignedUserId = linked.assignedUserId;
    }
    // Im aktuellen Schema ist recipientId Pflicht – auch für eigenständige Termine.
    if (!recipientId) return fail(400, { message: 'Bitte eine betreute Person auswählen.' });
    const [recipient] = await db.select({ id: careRecipients.id, userId: careRecipients.userId }).from(careRecipients)
      .where(and(eq(careRecipients.id, recipientId), eq(careRecipients.organizationId, org), eq(careRecipients.isDeleted, false))).limit(1);
    if (!recipient) return fail(400, { message: 'Betreute Person nicht gefunden.' });
    // Automatisch beteiligte aktive Organisationsmitglieder aufnehmen.
    const candidateIds = [...new Set([
      ...participantIds, ctx.user.id, assignedUserId, recipient.userId
    ].filter((id): id is string => Boolean(id)))];
    const allowed = await db.select({ userId: memberships.userId })
      .from(memberships)
      .where(and(
        eq(memberships.organizationId, org),
        eq(memberships.isActive, true),
        inArray(memberships.userId, candidateIds)
      ));
    const allowedIds = new Set(allowed.map(item => item.userId));
    if (participantIds.some(id => !allowedIds.has(id)))
      return fail(403, { message: 'Mindestens eine ausgewählte Person gehört nicht zur Organisation.' });
    const finalParticipantIds = candidateIds.filter(id => allowedIds.has(id));

    await db.transaction(async tx => {
      const [created] = await tx.insert(appointments).values({
        organizationId: org, recipientId, requestId: requestId || null, title, startsAt, endsAt, status: 'SCHEDULED'
      }).returning({ id: appointments.id });
      if (finalParticipantIds.length) await tx.insert(appointmentParticipants).values(finalParticipantIds.map(userId => ({
        appointmentId: created.id, organizationId: org, userId
      })));
    });
    redirect(303, '/dashboard/termine');
  }
};
