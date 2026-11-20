import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { db } from '$lib/server/db/client';
import { helpRequests, auditEvents } from '$lib/server/db/schema';
import { recipientFor, verifyDraft } from '$lib/server/assistenz/core';

const schema = z.object({ draftToken: z.string().min(10).max(12000), confirmed: z.literal(true) });
export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) error(401, 'Bitte anmelden.');
  const recipient = await recipientFor(locals.user.id);
  if (!recipient) error(403, 'Kein aktives Profil als betreute Person.');
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) error(400, 'Bitte bestätigen Sie die Hilfsanfrage.');
  const draft = verifyDraft(parsed.data.draftToken, locals.user.id, recipient.id);
  if (!draft) error(400, 'Der Entwurf ist abgelaufen. Bitte erstellen Sie einen neuen.');
  const [ticket] = await db.transaction(async tx => {
    const inserted = await tx.insert(helpRequests).values({
      organizationId: recipient.organizationId, recipientId: recipient.id,
      createdById: locals.user!.id, title: draft.title,
      description: draft.description, category: draft.category, status: 'OPEN'
    }).returning({ id: helpRequests.id });
    await tx.insert(auditEvents).values({ organizationId: recipient.organizationId,
      actorId: locals.user!.id, action: 'ASSISTANT_HELP_REQUEST_CREATED', entityType: 'helpRequest', entityId: inserted[0].id });
    return inserted;
  });
  return json({ success: true, ticketId: ticket.id, message: 'Ihre Hilfsanfrage wurde gespeichert und ist für Ihre Organisation sichtbar.' }, { status: 201 });
};
