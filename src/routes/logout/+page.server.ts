import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { clearSession } from '$lib/server/auth/session';

export const load: PageServerLoad = async ({ cookies }) => {
  await clearSession(cookies);

  redirect(303, '/login');
};