
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { eq } from 'drizzle-orm';

import { db } from '$lib/server/db/client';

import {
  users,
  organizations,
  memberships,
  organizationOperations
} from '$lib/server/db/schema';

import { hashPassword } from '$lib/server/auth/password';
import { createSession } from '$lib/server/auth/session';
import { registerSchema } from '$lib/features/auth/schema';

export const actions: Actions = {
  default: async ({ request, cookies }) => {

    // 1. Formulardaten einlesen
    const formData = await request.formData();

    // 2. Eingaben validieren
    const parsed = registerSchema.safeParse({
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      email: formData.get('email'),
      password: formData.get('password'),
      accountType: formData.get('accountType'),
      organizationName: formData.get('organizationName') ?? ''
    });

    if (!parsed.success) {
      return fail(400, {
        message:
          'Bitte überprüfe deine Angaben. ' +
          'Das Passwort muss mindestens 12 Zeichen enthalten.'
      });
    }

    const data = parsed.data;

    // 3. Organisationsname überprüfen
    if (
      data.accountType === 'ORGANIZATION' &&
      !data.organizationName.trim()
    ) {
      return fail(400, {
        message: 'Bitte gib den Namen deiner Organisation ein.'
      });
    }

    // 4. E-Mail-Adresse normalisieren
    const email = data.email.trim().toLowerCase();

    // 5. Prüfen, ob die E-Mail bereits vorhanden ist
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      return fail(409, {
        message: 'Diese E-Mail-Adresse ist bereits registriert.'
      });
    }

    // 6. Passwort sicher verschlüsseln
    const passwordHash = await hashPassword(data.password);

    let userId: string;

    try {
      // 7. Benutzer, Organisation und Mitgliedschaft
      // gemeinsam in einer Transaktion erstellen
      const result = await db.transaction(async (tx) => {

        // Benutzer erstellen
        const [newUser] = await tx
          .insert(users)
          .values({
            firstName: data.firstName,
            lastName: data.lastName,
            email,
            passwordHash,

            // Nur für die lokale Entwicklung.
            // Später E-Mail-Verifizierung ergänzen.
            status: 'ACTIVE'
          })
          .returning({
            id: users.id
          });

        // Namen des Verwaltungsbereichs festlegen
        const workspaceName =
          data.accountType === 'ORGANIZATION'
            ? data.organizationName.trim()
            : `Privatbereich ${data.firstName} ${data.lastName}`;

        // Organisation oder Privatbereich erstellen
        const [newOrganization] = await tx
          .insert(organizations)
          .values({
            name: workspaceName,
            type: data.accountType === 'ORGANIZATION' ? 'NONPROFIT' : 'COMMUNITY'
          })
          .returning({
            id: organizations.id
          });

        // Organisationsart gesondert speichern; private Bereiche bleiben ohne Betriebsart.
        if (data.accountType === 'ORGANIZATION') {
          await tx.insert(organizationOperations).values({
            organizationId: newOrganization.id,
            kind: 'VOLUNTEER_ORG',
            volunteersEnabled: true
          });
        }

        // Benutzer als Eigentümer zuordnen
        await tx
          .insert(memberships)
          .values({
            userId: newUser.id,
            organizationId: newOrganization.id,
            role: 'OWNER'
          });

        return {
          userId: newUser.id,
          organizationId: newOrganization.id
        };
      });

      userId = result.userId;

    } catch (e) {
      console.error('Fehler bei der Registrierung:', e);

      // PostgreSQL: Unique Constraint
      const code =
        typeof e === 'object' &&
        e !== null &&
        'code' in e
          ? e.code
          : typeof e === 'object' &&
              e !== null &&
              'cause' in e &&
              typeof e.cause === 'object' &&
              e.cause !== null &&
              'code' in e.cause
            ? e.cause.code
            : undefined;

      if (code === '23505') {
        return fail(409, {
          message: 'Registrierung nicht möglich. Bitte überprüfe deine Angaben.'
        });
      }

      return fail(500, {
        message: 'Die Registrierung konnte nicht abgeschlossen werden.'
      });
    }

    // 8. Benutzer anmelden
    await createSession(userId, cookies);

    // 9. Dashboard öffnen
    redirect(303, '/dashboard');
  }
};
