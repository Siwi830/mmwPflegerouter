import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { db } from '$lib/server/db/client';
import { users } from '$lib/server/db/schema';
import { verifyPassword } from '$lib/server/auth/password';
import { createSession } from '$lib/server/auth/session';
import { loginSchema } from '$lib/features/auth/schema';
import { careRecipients, memberships } from '$lib/server/db/schema';
import { and, eq, inArray } from 'drizzle-orm';

export const actions:Actions = { 
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
      message:
        'Dieses Benutzerkonto ist noch nicht freigeschaltet oder wurde gesperrt.'
    });
  }

  // Alle aktiven Organisationsmitgliedschaften berücksichtigen.
  // Auch Ehrenamtliche und leseberechtigte Mitglieder
  // gehören zum Organisationsdashboard.
  const [organizationMembership] = await db
    .select({
      id: memberships.id,
      role: memberships.role
    })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, user.id),
        inArray(memberships.role, [
          'OWNER',
          'ADMIN',
          'COORDINATOR',
          'VOLUNTEER',
          'VIEWER'
        ]),
        eq(memberships.isActive, true)
      )
    )
    .limit(1);

  // Prüfen, ob der Benutzer als betreute Person
  // mit einem aktiven Datensatz verknüpft ist.
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
    console.log('LOGIN DEBUG:', {
  email: user.email,
  userId: user.id,
  membership: organizationMembership,
  recipient
});
  // Session erst nach erfolgreicher Anmeldung erstellen.
  await createSession(user.id, cookies);

  // Organisationsmitgliedschaften haben Vorrang.
  if (organizationMembership) {
    redirect(303, '/dashboard');
  }

  // Betreute Personen ohne aktive Organisationsmitgliedschaft
  // gelangen in ihren persönlichen Bereich.
  if (recipient) {
    redirect(303, '/mein-bereich');
  }

  // Bisheriges Standardverhalten beibehalten.
  redirect(303, '/dashboard');

}};
