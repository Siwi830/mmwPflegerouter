import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { z } from 'zod';
import { draftSchema, messageSchema, recipientFor, signDraft, systemPrompt } from '$lib/server/assistenz/core';

const inputSchema = z.object({ messages: z.array(messageSchema).min(1).max(24) });
const outputSchema = z.object({ reply: z.string().min(1).max(1500), ready: z.boolean(), emergency: z.boolean(), draft: draftSchema.nullable() });
import { mockResponse } from '$lib/server/assistenz/mock';

const urgent = /(?:brustschmerz|brustschmerzen|starke atemnot|keine luft|schlaganfall|bewusstlos|starke blutung|suizid|umbringen|nicht mehr leben)/i;

export const POST: RequestHandler = async ({ request, locals, fetch }) => {
  if (!locals.user) error(401, 'Bitte anmelden.');
  const recipient = await recipientFor(locals.user.id);
  if (!recipient) error(403, 'Kein aktives Profil als betreute Person.');
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.messages.at(-1)?.role !== 'user') error(400, 'Ungültiger Gesprächsverlauf.');
  const messages = parsed.data.messages;
  const latest = messages.at(-1)!.content;
  // Konservativer Sicherheits-Fallback; die KI prüft zusätzlich den gesamten Kontext.
  if (urgent.test(latest)) return json({ reply: 'Das könnte ein Notfall sein. Bitte rufen Sie jetzt 112 an oder bitten Sie jemanden, für Sie anzurufen. Ein Ticket ersetzt keine Notfallhilfe.', emergency: true, ready: false, draft: null, draftToken: null });
  if (env.ASSISTANT_MOCK_MODE === 'true' || !env.OPENAI_API_KEY) {
    const result = mockResponse(messages);
    return json({ ...result, draftToken: result.draft ? signDraft(result.draft, locals.user.id, recipient.id) : null });
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: controller.signal,
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0.2, response_format: { type: 'json_object' }, messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ] })
    });
    if (!response.ok) { throw new Error(`OpenAI HTTP ${response.status}`); }
    const raw = await response.json();
    const result = outputSchema.safeParse(JSON.parse(raw.choices?.[0]?.message?.content ?? 'null'));
    if (!result.success) throw new Error('Ungültige OpenAI-Antwort');
    const { reply, emergency, draft, ready } = result.data;
    if (emergency) return json({ reply: 'Das könnte ein Notfall sein. Bitte rufen Sie jetzt 112 an oder bitten Sie jemanden, für Sie anzurufen. Ein Ticket ersetzt keine Notfallhilfe.', emergency: true, ready: false, draft: null, draftToken: null });
    return json({ reply, emergency: false, ready: ready && !!draft, draft: ready ? draft : null,
      draftToken: ready && draft ? signDraft(draft, locals.user.id, recipient.id) : null });
  } catch (cause) {
    console.error('Assistentenfehler, Demo-Fallback aktiv:', cause instanceof Error ? cause.message : 'Unbekannt');
    const result = mockResponse(messages);
    return json({ ...result, draftToken: result.draft ? signDraft(result.draft, locals.user.id, recipient.id) : null });
  } finally { clearTimeout(timeout); }
};
