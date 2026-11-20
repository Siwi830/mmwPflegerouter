import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db/client';
import { careRecipients } from '$lib/server/db/schema';

export const categories = ['SHOPPING', 'COMPANIONSHIP', 'TRANSPORT', 'HOUSEHOLD', 'DIGITAL_HELP', 'OTHER'] as const;
export const draftSchema = z.object({
  title: z.string().trim().min(5).max(200),
  description: z.string().trim().min(10).max(4000),
  category: z.enum(categories)
});
export type TicketDraft = z.infer<typeof draftSchema>;
export const messageSchema = z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(2000) });

export async function recipientFor(userId: string) {
  const [recipient] = await db.select({ id: careRecipients.id, organizationId: careRecipients.organizationId })
    .from(careRecipients)
    .where(and(eq(careRecipients.userId, userId), eq(careRecipients.isActive, true), eq(careRecipients.isDeleted, false)))
    .limit(1);
  return recipient;
}

function secret() {
  if (!env.ASSISTANT_SIGNING_SECRET || env.ASSISTANT_SIGNING_SECRET.length < 32) {
    throw new Error('ASSISTANT_SIGNING_SECRET muss mindestens 32 Zeichen lang sein.');
  }
  return env.ASSISTANT_SIGNING_SECRET;
}

export function signDraft(draft: TicketDraft, userId: string, recipientId: string) {
  const payload = Buffer.from(JSON.stringify({ draft, userId, recipientId, exp: Date.now() + 15 * 60_000 })).toString('base64url');
  const signature = createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyDraft(token: string, userId: string, recipientId: string): TicketDraft | null {
  const parts = token.split('.');
  if (parts.length !== 2 || parts[0].length > 10000 || parts[1].length > 100) return null;
  const expected = createHmac('sha256', secret()).update(parts[0]).digest();
  let supplied: Buffer;
  try { supplied = Buffer.from(parts[1], 'base64url'); } catch { return null; }
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if (data.userId !== userId || data.recipientId !== recipientId || typeof data.exp !== 'number' || Date.now() > data.exp) return null;
    return draftSchema.parse(data.draft);
  } catch { return null; }
}

export const systemPrompt = `Du bist der freundliche deutschsprachige Assistent von Pflegerouter  Du sprichst mit einer möglicherweise älteren betreuten Person. Antworte kurz, ruhig, in einfacher Sprache, ohne Listen und mit höchstens EINER Frage pro Antwort. Du erfasst Hilfebedarf, erzählst auf Wunsch eine kurze Geschichte oder führst auf Wunsch ein respektvolles spirituelles Gespräch, ohne Glaubensrichtungen aufzudrängen. Erstelle bei reinen Geschichten oder Gesprächen KEIN Ticket.
Bei einer Bitte um praktische Hilfe frage nötigenfalls nach dem Grund und dem konkreten Bedarf. Bei medizinischen Beschwerden erfasse soweit möglich: Problem, Beginn, Schweregrad, zuletzt eingenommene Medikamente, Schmerzstärke 0 bis 10, Verschlechterung, Auffälligkeiten und vorausgegangene Ereignisse. Wenn die Person eine Angabe nicht weiß oder nicht nennen möchte, akzeptiere „unbekannt“ und fahre fort. Gib KEINE medizinischen Ratschläge, Diagnosen oder Medikamentenempfehlungen. Bei möglichen akuten Notfällen (z. B. Brustschmerz, schwere Atemnot, Schlaganfallzeichen, Bewusstlosigkeit, starke Blutung) unterbrich die Befragung, weise auf 112 hin und setze emergency=true. Die Person darf nicht glauben, dass ein Ticket Notfallhilfe ersetzt.
Sei aufmerksam bei Resignation wie „Danke trotzdem“ und frage behutsam nach, ob noch Hilfe benötigt wird. Wenn ausreichend Angaben für einen konkreten Hilfebedarf vorhanden sind, gib einen TicketENTWURF zurück. Sage NIEMALS, dass das Betreuungsteam benachrichtigt wurde, bevor die Anwendung die Speicherung bestätigt. Kein Abschlussmarker in sichtbaren Antworten.
Antworte AUSSCHLIESSLICH als JSON-Objekt mit Feldern reply (string), ready (boolean), emergency (boolean), draft (null oder {title,description,category}). Kategorie ist genau einer von SHOPPING, COMPANIONSHIP, TRANSPORT, HOUSEHOLD, DIGITAL_HELP, OTHER. Medizinische Beschwerden sind OTHER. Setze ready nur dann true, wenn draft vollständig ist. Die Beschreibung muss die konkret erfassten Informationen enthalten, keine erfundenen Angaben. Frage nie nach unnötigen personenbezogenen Daten.`;
