
import { fail, redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { and, eq, desc, inArray } from 'drizzle-orm';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';

import { db } from '$lib/server/db/client';

import {
  users,
  memberships,
  organizations,
  careRecipients,
  recipientRelatives,
  accountInvitations
} from '$lib/server/db/schema';

import { sendActivationEmail } from '$lib/server/email';
import { env } from '$env/dynamic/private';

const allowedRoles = ['OWNER', 'ADMIN', 'COORDINATOR'] as const;

const optionalText = (max: number) =>
  z.string().trim().max(max).default('');

const emailSchema = z.union([
  z.string().trim().toLowerCase().pipe(z.email()),
  z.literal('')
]);

const relativeSchema = z.object({
  id: z.uuid().optional(),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: emailSchema,
  phone: optionalText(40)
});

const personFields = z.object({
  organizationId: z.uuid(),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: emailSchema,
  phone: optionalText(40),
  addressLine: optionalText(250),
  postalCode: optionalText(20),
  city: optionalText(120),
  relatives: z.array(relativeSchema).max(20)
});

const createSchema = personFields.extend({
  createAccess: z.boolean()
}).refine(
  (data) => !data.createAccess || Boolean(data.email),
  { message: 'Für einen Zugang ist eine E-Mail-Adresse erforderlich.' }
);

const updateSchema = personFields.extend({
  personId: z.uuid(),
  isActive: z.boolean()
});

const personIdSchema = z.object({
  personId: z.uuid(),
  organizationId: z.uuid()
});

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function parseRelatives(form: FormData) {
  try {
    return JSON.parse(String(form.get('relatives') ?? '[]')) as unknown;
  } catch {
    return null;
  }
}

function readPersonFields(form: FormData) {
  return {
    organizationId: form.get('organizationId'),
    firstName: form.get('firstName'),
    lastName: form.get('lastName'),
    email: form.get('email') ?? '',
    phone: form.get('phone') ?? '',
    addressLine: form.get('addressLine') ?? '',
    postalCode: form.get('postalCode') ?? '',
    city: form.get('city') ?? '',
    relatives: parseRelatives(form)
  };
}

async function requireMembership(
  userId: string,
  organizationId: string
) {
  const [membership] = await db
    .select({ role: memberships.role })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.organizationId, organizationId)
      )
    )
    .limit(1);

  if (
    !membership ||
    !allowedRoles.some((role) => role === membership.role)
  ) {
    error(403, 'Keine Berechtigung für diese Organisation');
  }
}

async function requirePerson(
  userId: string,
  organizationId: string,
  personId: string
) {
  await requireMembership(userId, organizationId);

  const [person] = await db
    .select({
      id: careRecipients.id,
      userId: careRecipients.userId
    })
    .from(careRecipients)
    .where(
      and(
        eq(careRecipients.id, personId),
        eq(careRecipients.organizationId, organizationId),
        eq(careRecipients.isDeleted, false)
      )
    )
    .limit(1);

  if (!person) {
    error(404, 'Person nicht gefunden');
  }

  return person;
}

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    redirect(303, '/login');
  }

  const myOrganizations = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      role: memberships.role
    })
    .from(memberships)
    .innerJoin(
      organizations,
      eq(memberships.organizationId, organizations.id)
    )
    .where(eq(memberships.userId, locals.user.id));

  const editableOrganizations = myOrganizations.filter(
    (org) => allowedRoles.some((role) => role === org.role)
  );

  const organizationIds = editableOrganizations.map(
    (org) => org.id
  );

  if (organizationIds.length === 0) {
    return { organizations: [], persons: [] };
  }

  const persons = await db
    .select({
      id: careRecipients.id,
      firstName: careRecipients.firstName,
      lastName: careRecipients.lastName,
      email: careRecipients.email,
      phone: careRecipients.phone,
      addressLine: careRecipients.addressLine,
      postalCode: careRecipients.postalCode,
      city: careRecipients.city,
      organizationId: careRecipients.organizationId,
      organizationName: organizations.name,
      userId: careRecipients.userId,
      isActive: careRecipients.isActive,
      isDeleted: careRecipients.isDeleted
    })
    .from(careRecipients)
    .innerJoin(
      organizations,
      eq(careRecipients.organizationId, organizations.id)
    )
    .where(
      and(
        inArray(careRecipients.organizationId, organizationIds),
        eq(careRecipients.isDeleted, false)
      )
    )
    .orderBy(desc(careRecipients.createdAt));

  const personIds = persons.map((person) => person.id);

  const relatives = personIds.length
    ? await db
        .select()
        .from(recipientRelatives)
        .where(inArray(recipientRelatives.recipientId, personIds))
    : [];

  return {
    organizations: editableOrganizations,
    persons: persons.map((person) => ({
      ...person,
      relatives: relatives.filter(
        (relative) => relative.recipientId === person.id
      )
    }))
  };
};

export const actions: Actions = {
  create: async ({ request, locals, url }) => {
    if (!locals.user) {
      error(401, 'Nicht angemeldet');
    }

    const form = await request.formData();

    const parsed = createSchema.safeParse({
      ...readPersonFields(form),
      createAccess: form.get('createAccess') === 'on'
    });

    if (!parsed.success) {
      return fail(400, {
        message: parsed.error.issues[0]?.message ??
          'Bitte Angaben überprüfen.'
      });
    }

    const data = parsed.data;

    await requireMembership(locals.user.id, data.organizationId);

    const email = data.email;
    const token = data.createAccess
      ? randomBytes(32).toString('hex')
      : null;

    if (data.createAccess) {
      const [existingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        return fail(409, {
          message: 'Für diese E-Mail-Adresse existiert bereits ein Konto.'
        });
      }
    }

    try {
      await db.transaction(async (tx) => {
        let userId: string | null = null;

        if (data.createAccess && token) {
          const [newUser] = await tx
            .insert(users)
            .values({
              email,
              firstName: data.firstName,
              lastName: data.lastName,
              passwordHash: 'INVITED_NO_PASSWORD',
              phone: data.phone || null,
              status: 'PENDING'
            })
            .returning({ id: users.id });

          userId = newUser.id;

          await tx.insert(accountInvitations).values({
            userId,
            tokenHash: hashToken(token),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
          });
        }

        const [person] = await tx
          .insert(careRecipients)
          .values({
            organizationId: data.organizationId,
            userId,
            firstName: data.firstName,
            lastName: data.lastName,
            email: email || null,
            phone: data.phone || null,
            addressLine: data.addressLine || null,
            postalCode: data.postalCode || null,
            city: data.city || null,
            isActive: true,
            isDeleted: false
          })
          .returning({ id: careRecipients.id });

        if (data.relatives.length) {
          await tx.insert(recipientRelatives).values(
            data.relatives.map((relative) => ({
              recipientId: person.id,
              firstName: relative.firstName,
              lastName: relative.lastName,
              email: relative.email || null,
              phone: relative.phone || null
            }))
          );
        }
      });
    } catch (err) {
      console.error('Person konnte nicht erstellt werden:', err);

      return fail(500, {
        message: 'Person konnte nicht gespeichert werden.'
      });
    }

    if (token) {
      const baseUrl = env.PUBLIC_APP_URL || url.origin;
      const activationUrl = new URL(
        `/activate?token=${encodeURIComponent(token)}`,
        baseUrl
      ).toString();

      try {
        await sendActivationEmail({
          to: email,
          firstName: data.firstName,
          activationUrl
        });

        return {
          success: true,
          message: 'Person gespeichert. Einladungs-E-Mail versendet.'
        };
      } catch (err) {
        console.error('Einladungs-E-Mail konnte nicht versendet werden: ', activationUrl);

        return {
          success: true,
          message:
            'Person gespeichert, aber die Einladungs-E-Mail konnte ' +
            'nicht versendet werden. Bitte SMTP-Einstellungen prüfen.'
        };
      }
    }

    return {
      success: true,
      message: 'Person wurde erfolgreich gespeichert.'
    };
  },

  update: async ({ request, locals }) => {
    if (!locals.user) {
      error(401, 'Nicht angemeldet');
    }

    const form = await request.formData();

    const parsed = updateSchema.safeParse({
      ...readPersonFields(form),
      personId: form.get('personId'),
      isActive: form.get('isActive') === 'on'
    });

    if (!parsed.success) {
      return fail(400, {
        message: parsed.error.issues[0]?.message ??
          'Bitte Angaben überprüfen.'
      });
    }

    const data = parsed.data;

    const person = await requirePerson(
      locals.user.id,
      data.organizationId,
      data.personId
    );

    try {
      await db.transaction(async (tx) => {
        await tx
          .update(careRecipients)
          .set({
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email || null,
            phone: data.phone || null,
            addressLine: data.addressLine || null,
            postalCode: data.postalCode || null,
            city: data.city || null,
            isActive: data.isActive
          })
          .where(
            and(
              eq(careRecipients.id, data.personId),
              eq(careRecipients.organizationId, data.organizationId),
              eq(careRecipients.isDeleted, false)
            )
          );

        // Vorhandene Angehörige aktualisieren,
        // neue Angehörige ergänzen.
        const existingRelatives = await tx
          .select({ id: recipientRelatives.id })
          .from(recipientRelatives)
          .where(eq(recipientRelatives.recipientId, data.personId));

        const existingIds = new Set(
          existingRelatives.map((relative) => relative.id)
        );

        const submittedIds = new Set(
          data.relatives
            .map((relative) => relative.id)
            .filter((id): id is string => Boolean(id))
        );

        // Nicht mehr aufgeführte Angehörige entfernen.
        // Hinweis: Für Angehörige gilt hier noch kein Soft Delete.
        // Diese Operation betrifft nur die Zuordnungstabelle.
        for (const relative of existingRelatives) {
          if (!submittedIds.has(relative.id)) {
            await tx
              .delete(recipientRelatives)
              .where(
                and(
                  eq(recipientRelatives.id, relative.id),
                  eq(recipientRelatives.recipientId, data.personId)
                )
              );
          }
        }

        for (const relative of data.relatives) {
          if (relative.id) {
            if (!existingIds.has(relative.id)) {
              throw new Error('Ungültige Angehörigen-ID');
            }

            await tx
              .update(recipientRelatives)
              .set({
                firstName: relative.firstName,
                lastName: relative.lastName,
                email: relative.email || null,
                phone: relative.phone || null
              })
              .where(
                and(
                  eq(recipientRelatives.id, relative.id),
                  eq(recipientRelatives.recipientId, data.personId)
                )
              );
          } else {
            await tx.insert(recipientRelatives).values({
              recipientId: data.personId,
              firstName: relative.firstName,
              lastName: relative.lastName,
              email: relative.email || null,
              phone: relative.phone || null
            });
          }
        }

        // Benutzerkonto bei Bedarf deaktivieren.
        // Nur wenn es nicht anderweitig benötigt wird.
        if (person.userId && !data.isActive) {
          const otherRecipients = await tx
            .select({ id: careRecipients.id })
            .from(careRecipients)
            .where(
              and(
                eq(careRecipients.userId, person.userId),
                eq(careRecipients.isDeleted, false)
              )
            );

          if (otherRecipients.length === 1) {
            await tx
              .update(users)
              .set({ status: 'SUSPENDED' })
              .where(eq(users.id, person.userId));
          }
        }
      });

      return {
        success: true,
        message: 'Änderungen wurden gespeichert.'
      };
    } catch (err) {
      console.error('Person konnte nicht aktualisiert werden:', err);

      return fail(500, {
        message: 'Änderungen konnten nicht gespeichert werden.'
      });
    }
  },

  setActive: async ({ request, locals }) => {
    if (!locals.user) {
      error(401, 'Nicht angemeldet');
    }

    const form = await request.formData();

    const parsed = personIdSchema.safeParse({
      personId: form.get('personId'),
      organizationId: form.get('organizationId')
    });

    if (!parsed.success) {
      return fail(400, { message: 'Ungültige Person.' });
    }

    const person = await requirePerson(
      locals.user.id,
      parsed.data.organizationId,
      parsed.data.personId
    );

    const active = form.get('active') === 'true';

    await db
      .update(careRecipients)
      .set({ isActive: active })
      .where(
        and(
          eq(careRecipients.id, parsed.data.personId),
          eq(careRecipients.organizationId, parsed.data.organizationId),
          eq(careRecipients.isDeleted, false)
        )
      );

    return {
      success: true,
      message: active
        ? 'Person wurde aktiviert.'
        : 'Person wurde deaktiviert.'
    };
  },

  delete: async ({ request, locals }) => {
    if (!locals.user) {
      error(401, 'Nicht angemeldet');
    }

    const form = await request.formData();

    const parsed = personIdSchema.safeParse({
      personId: form.get('personId'),
      organizationId: form.get('organizationId')
    });

    if (!parsed.success) {
      return fail(400, { message: 'Ungültige Person.' });
    }

    await requirePerson(
      locals.user.id,
      parsed.data.organizationId,
      parsed.data.personId
    );

    await db
      .update(careRecipients)
      .set({
        isActive: false,
        isDeleted: true,
        deletedAt: new Date()
      })
      .where(
        and(
          eq(careRecipients.id, parsed.data.personId),
          eq(careRecipients.organizationId, parsed.data.organizationId),
          eq(careRecipients.isDeleted, false)
        )
      );

    return {
      success: true,
      message: 'Person wurde gelöscht (Soft Delete).'
    };
  }
};
