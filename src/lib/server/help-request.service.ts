
import { error } from '@sveltejs/kit';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '$lib/server/db/client';
import {
  helpRequests,
  memberships,
  careRecipients
} from '$lib/server/db/schema';

// Eingaben für eine neue Hilfsanfrage
export const helpRequestSchema = z.object({
  organizationId: z.string().uuid(),
  recipientId: z.string().uuid(),

  title: z.string().trim().min(2).max(200),

  description: z.string().trim().max(2000).optional(),

  category: z.enum([
    'SHOPPING',
    'COMPANIONSHIP',
    'TRANSPORT',
    'HOUSEHOLD',
    'DIGITAL_HELP',
    'OTHER'
  ])
});

type AuthUser = NonNullable<App.Locals['user']>;

function requireUser(user: App.Locals['user']): AuthUser {
  if (!user) {
    error(401, 'Nicht angemeldet');
  }

  return user;
}

async function requireMembership(
  userId: string,
  organizationId: string
) {
  const [membership] = await db
    .select({
      role: memberships.role
    })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!membership) {
    error(403, 'Kein Zugriff auf diese Organisation');
  }

  return membership;
}

export const helpRequestService = {
  // Eigene Hilfsanfragen anzeigen
  async list(user: App.Locals['user']) {
    const currentUser = requireUser(user);

    return db
      .select()
      .from(helpRequests)
      .where(
        eq(helpRequests.createdById, currentUser.id)
      )
      .orderBy(desc(helpRequests.createdAt));
  },

  // Neue Hilfsanfrage erstellen
  async create(
    user: App.Locals['user'],
    input: unknown
  ) {
    const currentUser = requireUser(user);

    const result = helpRequestSchema.safeParse(input);

    if (!result.success) {
      error(400, 'Ungültige Eingabedaten');
    }

    const data = result.data;

    const membership = await requireMembership(
      currentUser.id,
      data.organizationId
    );

    // Nur berechtigte Organisationsmitglieder
    // dürfen Hilfsanfragen erstellen.
    if (
      !['OWNER', 'ADMIN', 'COORDINATOR'].includes(
        membership.role
      )
    ) {
      error(403, 'Keine Berechtigung zum Erstellen');
    }

    // Sicherstellen, dass die ältere Person
    // zur angegebenen Organisation gehört.
    const [recipient] = await db
      .select({ id: careRecipients.id })
      .from(careRecipients)
      .where(
        and(
          eq(careRecipients.id, data.recipientId),
          eq(
            careRecipients.organizationId,
            data.organizationId
          )
        )
      )
      .limit(1);

    if (!recipient) {
      error(404, 'Hilfesuchende Person nicht gefunden');
    }

    return db
      .insert(helpRequests)
      .values({
        organizationId: data.organizationId,
        recipientId: data.recipientId,
        createdById: currentUser.id,
        title: data.title,
        description: data.description ?? null,
        category: data.category,
        status: 'OPEN'
      })
      .returning();
  }
};
