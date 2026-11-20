import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db/client';
import { accountInvitations, memberships, organizations, users, volunteerRecords } from '$lib/server/db/schema';
import { sendActivationEmail } from '$lib/server/email';


const roles = ['OWNER', 'ADMIN', 'COORDINATOR'] as const;
const emailField = z.union([z.literal(''), z.email()]);
const fields = z.object({
  organizationId: z.uuid(),
  firstName: z.string().trim().min(1, 'Vorname fehlt.').max(100),
  lastName: z.string().trim().min(1, 'Nachname fehlt.').max(100),
  email: emailField,
  phone: z.string().trim().max(40)
});
const idFields = z.object({ id: z.uuid(), organizationId: z.uuid() });
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const formString = (form: FormData, name: string) => String(form.get(name) ?? '').trim();
const readFields = (form: FormData) => ({
  organizationId: formString(form, 'organizationId'),
  firstName: formString(form, 'firstName'),
  lastName: formString(form, 'lastName'),
  email: formString(form, 'email').toLowerCase(),
  phone: formString(form, 'phone')
});
const parseError = (result: { error: z.ZodError }) =>
  fail(400, { message: result.error.issues[0]?.message ?? 'Ungültige Angaben.' });

async function authorize(userId: string, organizationId: string) {
  const [member] = await db.select({ role: memberships.role }).from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.organizationId, organizationId))).limit(1);
  if (!member || !roles.some(role => role === member.role)) error(403, 'Keine Berechtigung.');
}
async function getRecord(userId: string, organizationId: string, id: string) {
  await authorize(userId, organizationId);
  const [record] = await db.select().from(volunteerRecords).where(and(
    eq(volunteerRecords.id, id), eq(volunteerRecords.organizationId, organizationId),
    eq(volunteerRecords.isDeleted, false)
  )).limit(1);
  if (!record) error(404, 'Ehrenamtliche Person nicht gefunden.');
  return record;
}

// Einladungen werden nur für neue Benutzerkonten erstellt.
// Bestehende Konten werden aus Sicherheitsgründen NICHT automatisch verknüpft.
async function provisionInvitation(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], input: {
  email: string; firstName: string; lastName: string; phone: string; organizationId: string;
}) {
  const [existing] = await tx.select({ id: users.id }).from(users)
    .where(eq(users.email, input.email)).limit(1);
  if (existing) throw new Error('EMAIL_EXISTS');
  const token = randomBytes(32).toString('hex');
  const [user] = await tx.insert(users).values({
    email: input.email, firstName: input.firstName, lastName: input.lastName,
    phone: input.phone || null, passwordHash: 'INVITED_NO_PASSWORD', status: 'PENDING'
  }).returning({ id: users.id });
  await tx.insert(memberships).values({
    organizationId: input.organizationId, userId: user.id, role: 'VOLUNTEER'
  });
  await tx.insert(accountInvitations).values({
    userId: user.id, tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  });
  return { userId: user.id, token };
}

async function invitationResult(token: string, email: string, firstName: string, origin: string) {
  // PUBLIC_APP_URL muss für echte E-Mails auf die öffentliche HTTPS-Adresse zeigen.
  const activationUrl = new URL(`/activate?token=${encodeURIComponent(token)}`,
    env.PUBLIC_APP_URL || origin).toString();
  try {
    await sendActivationEmail({ to: email, firstName, activationUrl });
    return { success: true, message: 'Gespeichert. Einladung per E-Mail versendet.', activationUrl };
  } catch (cause) {
    console.error('Einladungs-E-Mail fehlgeschlagen:', cause);
    return { success: true, message: 'Gespeichert, aber E-Mail-Versand fehlgeschlagen. Testlink unten verwenden.', activationUrl };
  }
}

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(303, '/login');
  const membershipsFound = await db.select({
    id: organizations.id, name: organizations.name, role: memberships.role
  }).from(memberships).innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(eq(memberships.userId, locals.user.id));
  const editable = membershipsFound.filter(m => roles.some(role => role === m.role));
  if (!editable.length) return { organizations: [], volunteers: [] };
  const volunteers = await db.select({
    id: volunteerRecords.id, organizationId: volunteerRecords.organizationId,
    organizationName: organizations.name, userId: volunteerRecords.userId,
    firstName: volunteerRecords.firstName, lastName: volunteerRecords.lastName,
    email: volunteerRecords.email, phone: volunteerRecords.phone,
    isActive: volunteerRecords.isActive
  }).from(volunteerRecords)
    .innerJoin(organizations, eq(volunteerRecords.organizationId, organizations.id))
    .where(and(inArray(volunteerRecords.organizationId, editable.map(o => o.id)),
      eq(volunteerRecords.isDeleted, false)))
    .orderBy(desc(volunteerRecords.createdAt));
  return { organizations: editable, volunteers };
};

export const actions: Actions = {
 create: async ({ request, locals, url }) => {
  if (!locals.user) {
    error(401, 'Nicht angemeldet.');
  }

  const form = await request.formData();
  const parsed = fields.safeParse(readFields(form));

  if (!parsed.success) {
    return parseError(parsed);
  }

  const data = parsed.data;
  const invite = form.get('createAccess') === 'on';

  if (invite && !data.email) {
    return fail(400, {
      message: 'Für den Zugang ist eine E-Mail-Adresse erforderlich.'
    });
  }

  await authorize(locals.user.id, data.organizationId);

  let token: string | undefined;

  try {
    await db.transaction(async (tx) => {
      let userId: string | null = null;

      // Benutzerkonto und Einladung erstellen
      if (invite) {
        const invitation = await provisionInvitation(tx, data);

        userId = invitation.userId;
        token = invitation.token;
      }

      // Ehrenamtlichen-Datensatz speichern
      await tx.insert(volunteerRecords).values({
        organizationId: data.organizationId,
        userId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || null,
        phone: data.phone || null
      });

      // NEU: Organisationsmitgliedschaft anlegen
      if (userId) {
        await tx
          .insert(memberships)
          .values({
            organizationId: data.organizationId,
            userId,
            role: 'VOLUNTEER',
            isActive: true
          })
          .onConflictDoNothing();
      }
    });
  } catch (cause) {
    if (
      cause instanceof Error &&
      cause.message === 'EMAIL_EXISTS'
    ) {
      return fail(409, {
        message:
          'Diese E-Mail gehört bereits zu einem Benutzerkonto. Bitte separat zuordnen.'
      });
    }

    console.error(cause);

    return fail(500, {
      message: 'Speichern fehlgeschlagen.'
    });
  }

  if (token) {
    return invitationResult(
      token,
      data.email,
      data.firstName,
      url.origin
    );
  }

  return {
    success: true,
    message: 'Ehrenamtliche Person gespeichert.'
  };
},
  update: async ({ request, locals }) => {
    if (!locals.user) error(401, 'Nicht angemeldet.');
    const form = await request.formData();
    const parsed = fields.extend({ id: z.uuid() }).safeParse({
      ...readFields(form), id: formString(form, 'id')
    });
    if (!parsed.success) return parseError(parsed);
    const data = parsed.data;
    const record = await getRecord(locals.user.id, data.organizationId, data.id);
    if (record.userId && data.email !== (record.email ?? '')) {
      return fail(400, { message: 'Die E-Mail eines verknüpften Benutzerkontos kann hier nicht geändert werden.' });
    }
    await db.update(volunteerRecords).set({
      firstName: data.firstName, lastName: data.lastName,
      email: data.email || null, phone: data.phone || null
    }).where(and(eq(volunteerRecords.id, data.id),
      eq(volunteerRecords.organizationId, data.organizationId),
      eq(volunteerRecords.isDeleted, false)));
    return { success: true, message: 'Änderungen gespeichert.' };
  },
  setActive: async ({ request, locals }) => {
    if (!locals.user) error(401, 'Nicht angemeldet.');
    const form = await request.formData();
    const parsed = idFields.safeParse({ id: formString(form, 'id'), organizationId: formString(form, 'organizationId') });
    if (!parsed.success) return parseError(parsed);
    const record = await getRecord(locals.user.id, parsed.data.organizationId, parsed.data.id);
    const active = form.get('active') === 'true';
    await db.transaction(async tx => {
      await tx.update(volunteerRecords).set({ isActive: active }).where(eq(volunteerRecords.id, record.id));
      // VOLUNTEER-Zugriff auf diese Organisation wird nur über die Mitgliedschaft gesteuert.
      // Keine globale Sperrung von users.status (Konto könnte anderswo verwendet werden).
      // Mitgliedschaft bleibt zur Nachvollziehbarkeit bestehen; Zugriffsprüfung muss
      // volunteerRecords.isActive für VOLUNTEER berücksichtigen.
    });
    return { success: true, message: active ? 'Ehrenamtliche Person aktiviert.' : 'Ehrenamtliche Person deaktiviert.' };
  },
  delete: async ({ request, locals }) => {
    if (!locals.user) error(401, 'Nicht angemeldet.');
    const form = await request.formData();
    const parsed = idFields.safeParse({ id: formString(form, 'id'), organizationId: formString(form, 'organizationId') });
    if (!parsed.success) return parseError(parsed);
    const record = await getRecord(locals.user.id, parsed.data.organizationId, parsed.data.id);
    await db.update(volunteerRecords).set({ isDeleted: true, isActive: false, deletedAt: new Date() })
      .where(eq(volunteerRecords.id, record.id));
    return { success: true, message: 'Ehrenamtliche Person als gelöscht markiert.' };
  },
  invite: async ({ request, locals, url }) => {
    if (!locals.user) error(401, 'Nicht angemeldet.');
    const form = await request.formData();
    const parsed = idFields.safeParse({ id: formString(form, 'id'), organizationId: formString(form, 'organizationId') });
    if (!parsed.success) return parseError(parsed);
    const record = await getRecord(locals.user.id, parsed.data.organizationId, parsed.data.id);
    if (!record.isActive) return fail(400, { message: 'Bitte zuerst aktivieren.' });
    if (record.userId) return fail(409, { message: 'Benutzerkonto ist bereits verknüpft.' });
    if (!record.email) return fail(400, { message: 'Bitte zuerst eine E-Mail-Adresse hinterlegen.' });
    let token: string;
    try {
      token = await db.transaction(async tx => {
        const invitation = await provisionInvitation(tx, {
          email: record.email!, firstName: record.firstName, lastName: record.lastName,
          phone: record.phone ?? '', organizationId: record.organizationId
        });
        const updated = await tx.update(volunteerRecords).set({ userId: invitation.userId })
          .where(and(eq(volunteerRecords.id, record.id), isNull(volunteerRecords.userId)))
          .returning({ id: volunteerRecords.id });
        if (!updated.length) throw new Error('ALREADY_LINKED');
        return invitation.token;
      });
    } catch (cause) {
      if (cause instanceof Error && cause.message === 'EMAIL_EXISTS')
        return fail(409, { message: 'Für diese E-Mail-Adresse gibt es bereits ein Konto.' });
      console.error(cause);
      return fail(500, { message: 'Einladung konnte nicht erstellt werden.' });
    }
    return invitationResult(token, record.email, record.firstName, url.origin);
  }
};
