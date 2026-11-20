
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { createHash } from 'node:crypto';

import { db } from '$lib/server/db/client';
import {
  users,
  accountInvitations
} from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth/password';

function digest(token: string) {
  return createHash('sha256')
    .update(token)
    .digest('hex');
}

export const load: PageServerLoad = async ({ url }) => {
  const token = url.searchParams.get('token') ?? '';

  return { token };
};

export const actions: Actions = {
  default: async ({ request }) => {
    const form = await request.formData();

    const token = String(form.get('token') ?? '');
    const password = String(form.get('password') ?? '');
    const passwordRepeat = String(
      form.get('passwordRepeat') ?? ''
    );

    if (
      !/^[a-f0-9]{64}$/.test(token) ||
      password.length < 12 ||
      password.length > 128 ||
      password !== passwordRepeat
    ) {
      return fail(400, {
        message: 'Bitte die Angaben überprüfen.'
      });
    }

    const passwordHash = await hashPassword(password);

    const activated = await db.transaction(async (tx) => {
      const [invitation] = await tx
        .update(accountInvitations)
        .set({ usedAt: new Date() })
        .where(
          and(
            eq(accountInvitations.tokenHash, digest(token)),
            isNull(accountInvitations.usedAt),
            gt(accountInvitations.expiresAt, new Date())
          )
        )
        .returning({
          userId: accountInvitations.userId
        });

      if (!invitation) return false;

      await tx
        .update(users)
        .set({
          passwordHash,
          status: 'ACTIVE',
          emailVerifiedAt: new Date()
        })
        .where(
          and(
            eq(users.id, invitation.userId),
            eq(users.status, 'PENDING')
          )
        );

      return true;
    });

    if (!activated) {
      return fail(400, {
        message: 'Dieser Aktivierungslink ist ungültig oder abgelaufen.'
      });
    }

    redirect(303, '/login');
  }
};
