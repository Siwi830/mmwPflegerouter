import { env } from '$env/dynamic/private';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
if (!env.DATABASE_URL) throw new Error('DATABASE_URL missing');
const client = postgres(env.DATABASE_URL, { max: 10 });
export const db = drizzle(client);
