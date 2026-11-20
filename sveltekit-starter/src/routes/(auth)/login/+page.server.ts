
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { and, eq, inArray } from 'drizzle-orm';

import { db } from '$lib/server/db/client';
import {
  users,
  memberships,
  careRecipients
} from '$lib/server/db/schema';

import { verifyPassword } from '$lib/server/auth/password';
import { createSession } from '$lib/server/auth/session';
import { loginSchema } from '$lib/features/auth/schema';

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();

    const parsed = loginSchema.safeParse({
      email: data.get('email'),
      password: data.get('password')
    });

    if (!parsed.success) {
      return fail(400, {
        message: 'Ungültige Eingabe'
      });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(
        eq(users.email, parsed.data.email.toLowerCase())
      )
      .limit(1);

    if (
      !user ||
      !(await verifyPassword(
        parsed.data.password,
        user.passwordHash
      ))
    ) {
      return fail(400, {
        message: 'E-Mail oder Passwort falsch'
      });
    }

    // Nur freigeschaltete Benutzer dürfen sich anmelden.
    if (user.status !== 'ACTIVE') {
      return fail(403, {
        message: 'Dieses Benutzerkonto ist noch nicht freigeschaltet oder wurde gesperrt.'
      });
    }

    // Prüfen, ob eine Verwaltungsrolle vorhanden ist.
    const [administrativeMembership] = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, user.id),
          inArray(memberships.role, [
            'OWNER',
            'ADMIN',
            'COORDINATOR'
          ]),
          eq(memberships.isActive, true)
        )
      )
      .limit(1);

    // Prüfen, ob der Benutzer als betreute Person
    // mit einem Datensatz verknüpft ist.
    const [recipient] = await db
      .select({ id: careRecipients.id })
      .from(careRecipients)
      .where(
        and(
          eq(careRecipients.userId, user.id),
          eq(careRecipients.isDeleted, false),
          eq(careRecipients.isActive, true)
        )
      )
      .limit(1);

    await createSession(user.id, cookies);

    if (administrativeMembership) {
      redirect(303, '/dashboard');
    }

    if (recipient) {
      redirect(303, '/mein-bereich');
    }

    redirect(303, '/dashboard');
  }
};
