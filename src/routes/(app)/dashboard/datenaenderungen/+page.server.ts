import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db/client';
import {
  careRecipientChangeRequests,
  careRecipients,
  memberships,
  organizations
} from '$lib/server/db/schema';

const editableRoles = ['OWNER', 'ADMIN', 'COORDINATOR'] as const;
const proposedSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(40),
  city: z.string().trim().max(120),
  postalCode: z.string().trim().max(20),
  addressLine: z.string().trim().max(250)
}).strict();

const actionSchema = z.object({
  id: z.string().uuid(),
  reviewNote: z.string().trim().max(1000)
});

async function authorizedOrganizations(userId: string) {
  const rows = await db.select({
    id: organizations.id,
    name: organizations.name,
    role: memberships.role
  }).from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(and(eq(memberships.userId, userId), eq(memberships.isActive, true)));

  return rows.filter((row) => editableRoles.some((role) => role === row.role));
}

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(303, '/login');
  const orgs = await authorizedOrganizations(locals.user.id);
  if (orgs.length === 0) error(403, 'Keine Berechtigung für Datenänderungen.');

  const requests = await db.select({
    id: careRecipientChangeRequests.id,
    status: careRecipientChangeRequests.status,
    proposedData: careRecipientChangeRequests.proposedData,
    reviewNote: careRecipientChangeRequests.reviewNote,
    createdAt: careRecipientChangeRequests.createdAt,
    reviewedAt: careRecipientChangeRequests.reviewedAt,
    organizationId: careRecipientChangeRequests.organizationId,
    organizationName: organizations.name,
    recipientId: careRecipients.id,
    firstName: careRecipients.firstName,
    lastName: careRecipients.lastName,
    phone: careRecipients.phone,
    city: careRecipients.city,
    postalCode: careRecipients.postalCode,
    addressLine: careRecipients.addressLine
  }).from(careRecipientChangeRequests)
    .innerJoin(careRecipients, and(
      eq(careRecipientChangeRequests.recipientId, careRecipients.id),
      eq(careRecipientChangeRequests.organizationId, careRecipients.organizationId)
    ))
    .innerJoin(organizations, eq(careRecipientChangeRequests.organizationId, organizations.id))
    .where(inArray(careRecipientChangeRequests.organizationId, orgs.map((org) => org.id)))
    .orderBy(desc(careRecipientChangeRequests.createdAt))
    .limit(200);

  return {
    requests: requests.map((request) => {
      const parsed = proposedSchema.safeParse(safeParseJson(request.proposedData));
      return {
        ...request,
        proposed: parsed.success ? parsed.data : null
      };
    })
  };
};

function safeParseJson(value: string): unknown {
  try { return JSON.parse(value); } catch { return null; }
}

async function decide(userId: string, request: Request, decision: 'APPROVED' | 'REJECTED') {
  const form = await request.formData();
  const parsed = actionSchema.safeParse({
    id: String(form.get('id') ?? ''),
    reviewNote: String(form.get('reviewNote') ?? '')
  });
  if (!parsed.success) return fail(400, { message: 'Ungültige Angaben.' });
  if (decision === 'REJECTED' && !parsed.data.reviewNote) {
    return fail(400, { message: 'Bitte einen Ablehnungsgrund angeben.' });
  }

  const orgs = await authorizedOrganizations(userId);
  if (orgs.length === 0) error(403, 'Keine Berechtigung.');

  return db.transaction(async (tx) => {
    // FOR UPDATE sperrt den Antrag während der Entscheidung gegen parallele Bearbeitung.
    const [change] = await tx.select().from(careRecipientChangeRequests)
      .where(and(
        eq(careRecipientChangeRequests.id, parsed.data.id),
        inArray(careRecipientChangeRequests.organizationId, orgs.map((org) => org.id))
      ))
      .for('update')
      .limit(1);

    if (!change) error(404, 'Änderungsantrag nicht gefunden.');
    if (change.status !== 'PENDING') {
      return fail(409, { message: 'Über diesen Antrag wurde bereits entschieden.' });
    }

    if (decision === 'APPROVED') {
      const proposed = proposedSchema.safeParse(safeParseJson(change.proposedData));
      if (!proposed.success) {
        return fail(400, { message: 'Die vorgeschlagenen Daten sind ungültig.' });
      }
      const updated = await tx.update(careRecipients).set({
        firstName: proposed.data.firstName,
        lastName: proposed.data.lastName,
        phone: proposed.data.phone || null,
        city: proposed.data.city || null,
        postalCode: proposed.data.postalCode || null,
        addressLine: proposed.data.addressLine || null
      }).where(and(
        eq(careRecipients.id, change.recipientId),
        eq(careRecipients.organizationId, change.organizationId),
        eq(careRecipients.isDeleted, false),
        eq(careRecipients.isActive, true)
      )).returning({ id: careRecipients.id });
      if (!updated.length) {
        return fail(409, { message: 'Die betreute Person ist nicht mehr aktiv.' });
      }
    }

    await tx.update(careRecipientChangeRequests).set({
      status: decision,
      reviewNote: parsed.data.reviewNote || null,
      reviewedById: userId,
      reviewedAt: new Date()
    }).where(eq(careRecipientChangeRequests.id, change.id));

    return {
      success: true,
      message: decision === 'APPROVED' ? 'Änderungen wurden genehmigt und übernommen.' : 'Änderungsantrag wurde abgelehnt.'
    };
  });
}

export const actions: Actions = {
  approve: async ({ locals, request }) => {
    if (!locals.user) error(401, 'Nicht angemeldet.');
    return decide(locals.user.id, request, 'APPROVED');
  },
  reject: async ({ locals, request }) => {
    if (!locals.user) error(401, 'Nicht angemeldet.');
    return decide(locals.user.id, request, 'REJECTED');
  }
};
