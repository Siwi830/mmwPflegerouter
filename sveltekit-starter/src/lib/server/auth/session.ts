import { randomBytes, createHash } from 'node:crypto';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { authauthSessions, users } from '$lib/server/db/schema';
import type { Cookies } from '@sveltejs/kit';
const cookieName = 'session';
const duration = 60 * 60 * 24 * 7;
function digest(token:string) { return createHash('sha256').update(token).digest('hex'); }
export async function createSession(userId:string, cookies:Cookies) {
  const token = randomBytes(32).toString('hex');
  await db.insert(authauthSessions).values({tokenHash:digest(token),userId,expiresAt:new Date(Date.now()+duration*1000)});
  cookies.set(cookieName,token,{path:'/',httpOnly:true,secure:!import.meta.env.DEV,sameSite:'lax',maxAge:duration});
}
export async function getSessionUser(token:string) {
  const [row] = await db.select({id:users.id,name:users.name,email:users.email,role:users.role})
    .from(authauthSessions).innerJoin(users,eq(authauthSessions.userId,users.id))
    .where(and(eq(authauthSessions.tokenHash,digest(token)),gt(authauthSessions.expiresAt,new Date()))).limit(1);
  return row ?? null;
}
export async function clearSession(cookies:Cookies) {
  const token = cookies.get(cookieName);
  if (token) await db.delete(authauthSessions).where(eq(authauthSessions.tokenHash,digest(token)));
  cookies.delete(cookieName,{path:'/'});
}
