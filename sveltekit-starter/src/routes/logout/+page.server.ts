import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { clearSession } from '$lib/server/auth/session';
export const actions:Actions = { default:async ({cookies}) => {await clearSession(cookies);redirect(303,'/login');} };
