import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { and, asc, desc, eq, gte } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db/client';
import {
  appointments, careRecipients, careRecipientChangeRequests,
  helpRequests, organizations
} from '$lib/server/db/schema';

const correctionSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(40),
  city: z.string().trim().max(120),
  postalCode: z.string().trim().max(20),
  addressLine: z.string().trim().max(250)
});

async function ownRecipient(userId: string) {
  const [recipient] = await db.select().from(careRecipients).where(and(
    eq(careRecipients.userId, userId),
    eq(careRecipients.isDeleted, false),
    eq(careRecipients.isActive, true)
  )).limit(1);
  return recipient;
}

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(303, '/login');
  const recipient = await ownRecipient(locals.user.id);
  if (!recipient) error(403, 'Kein aktives Profil als betreute Person zugeordnet.');

  const [org, requests, dates, changes] = await Promise.all([
    db.select({ id: organizations.id, name: organizations.name, contactEmail: organizations.contactEmail })
      .from(organizations).where(eq(organizations.id, recipient.organizationId)).limit(1),
    db.select({ id: helpRequests.id, title: helpRequests.title, status: helpRequests.status,
      category: helpRequests.category, createdAt: helpRequests.createdAt })
      .from(helpRequests).where(and(eq(helpRequests.recipientId, recipient.id),
        eq(helpRequests.organizationId, recipient.organizationId)))
      .orderBy(desc(helpRequests.createdAt)).limit(20),
    db.select({ id: appointments.id, title: appointments.title, status: appointments.status,
      startsAt: appointments.startsAt, endsAt: appointments.endsAt })
      .from(appointments).where(and(eq(appointments.recipientId, recipient.id),
        eq(appointments.organizationId, recipient.organizationId),
        gte(appointments.startsAt, new Date())))
      .orderBy(asc(appointments.startsAt)).limit(20),
    db.select({ id: careRecipientChangeRequests.id, status: careRecipientChangeRequests.status,
      proposedData: careRecipientChangeRequests.proposedData,
      reviewNote: careRecipientChangeRequests.reviewNote,
      createdAt: careRecipientChangeRequests.createdAt })
      .from(careRecipientChangeRequests)
      .where(and(eq(careRecipientChangeRequests.recipientId, recipient.id),
        eq(careRecipientChangeRequests.requestedById, locals.user.id)))
      .orderBy(desc(careRecipientChangeRequests.createdAt)).limit(10)
  ]);

  return {
    recipient: { firstName: recipient.firstName, lastName: recipient.lastName,
      email: recipient.email, phone: recipient.phone, city: recipient.city,
      postalCode: recipient.postalCode, addressLine: recipient.addressLine },
    organization: org[0] ?? null,
    requests,
    appointments: dates,
    changes
  };
};

export const actions: Actions = {
  proposeChange: async ({ locals, request }) => {
    if (!locals.user) error(401, 'Nicht angemeldet.');
    const recipient = await ownRecipient(locals.user.id);
    if (!recipient) error(403, 'Kein aktives Profil zugeordnet.');
    const form = await request.formData();
    const parsed = correctionSchema.safeParse(Object.fromEntries(
      ['firstName', 'lastName', 'phone', 'city', 'postalCode', 'addressLine']
        .map(key => [key, String(form.get(key) ?? '')])
    ));
    if (!parsed.success) return fail(400, { message: 'Bitte alle Angaben prüfen.' });

    const current = {
      firstName: recipient.firstName, lastName: recipient.lastName,
      phone: recipient.phone ?? '', city: recipient.city ?? '',
      postalCode: recipient.postalCode ?? '', addressLine: recipient.addressLine ?? ''
    };
    if (JSON.stringify(current) === JSON.stringify(parsed.data)) {
      return fail(400, { message: 'Es wurden keine Änderungen vorgenommen.' });
    }
    const [pending] = await db.select({ id: careRecipientChangeRequests.id })
      .from(careRecipientChangeRequests).where(and(
        eq(careRecipientChangeRequests.recipientId, recipient.id),
        eq(careRecipientChangeRequests.status, 'PENDING')
      )).limit(1);
    if (pending) return fail(409, { message: 'Eine Änderung wartet bereits auf Freigabe.' });

    await db.insert(careRecipientChangeRequests).values({
      recipientId: recipient.id,
      organizationId: recipient.organizationId,
      requestedById: locals.user.id,
      proposedData: JSON.stringify(parsed.data)
    });
    return { success: true, message: 'Änderungsvorschlag eingereicht. Ihre Organisation prüft ihn.' };
  }
};
