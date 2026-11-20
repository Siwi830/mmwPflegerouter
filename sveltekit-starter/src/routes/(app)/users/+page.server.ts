import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/client';
import { users } from '$lib/server/db/schema';
export const load:PageServerLoad = async ({locals}) => {
  if (!locals.user) error(401,'Nicht angemeldet');
  if (locals.user.role !== 'admin') error(403,'Kein Zugriff');
  return {users:await db.select({id:users.id,name:users.name,email:users.email,role:users.role}).from(users)};
};
