
import { randomBytes, createHash } from 'node:crypto';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { authSessions, users } from '$lib/server/db/schema';
import type { Cookies } from '@sveltejs/kit';

const cookieName = 'session';
const duration = 60 * 60 * 24 * 7; // 7 Tage

function digest(token: string): string {
  return createHash('sha256')
    .update(token)
    .digest('hex');
}

// Neue Session nach erfolgreichem Login erstellen
export async function createSession(
  userId: string,
  cookies: Cookies
): Promise<void> {
  const token = randomBytes(32).toString('hex');

  await db.insert(authSessions).values({
    tokenHash: digest(token),
    userId,
    expiresAt: new Date(Date.now() + duration * 1000)
  });

  cookies.set(cookieName, token, {
    path: '/',
    httpOnly: true,
    secure: !import.meta.env.DEV,
    sameSite: 'lax',
    maxAge: duration
  });
}

// Angemeldeten Benutzer ermitteln
export async function getSessionUser(token: string) {
  if (!token) return null;

  const [row] = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      status: users.status
    })
    .from(authSessions)
    .innerJoin(
      users,
      eq(authSessions.userId, users.id)
    )
    .where(
      and(
        eq(authSessions.tokenHash, digest(token)),
        gt(authSessions.expiresAt, new Date()),
        isNull(authSessions.revokedAt),
        eq(users.status, 'ACTIVE')
      )
    )
    .limit(1);

  if (!row) return null;

  return {
    ...row,
    name: `${row.firstName} ${row.lastName}`
  };
}

// Session beim Logout löschen
export async function clearSession(
  cookies: Cookies
): Promise<void> {
  const token = cookies.get(cookieName);

  if (token) {
    await db
      .delete(authSessions)
      .where(
        eq(authSessions.tokenHash, digest(token))
      );
  }

  cookies.delete(cookieName, {
    path: '/'
  });
}
