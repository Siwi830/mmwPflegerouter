import { and, eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { db } from '$lib/server/db/client';
import { careRepresentations, careRecipients } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/pflegerouter-access';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const actions: Actions = {
  default: async ({ locals, request }) => {
    const user = await requireUser(locals);
    const form = await request.formData();
    const recipientId = String(form.get('recipientId') ?? '').trim();
    const type = String(form.get('type') ?? '');
    if (!uuid.test(recipientId) || !['CONSENT','POWER_OF_ATTORNEY','LEGAL_REPRESENTATION'].includes(type))
      return fail(400, { message: 'Bitte gültige Angaben machen.' });
    const [recipient] = await db.select({ id: careRecipients.id, organizationId: careRecipients.organizationId,
      userId: careRecipients.userId }).from(careRecipients)
      .where(and(eq(careRecipients.id, recipientId), eq(careRecipients.isActive, true),
        eq(careRecipients.isDeleted, false))).limit(1);
    // Keine Details über fremde IDs preisgeben.
    if (!recipient || recipient.userId === user.id)
      return fail(400, { message: 'Antrag konnte nicht erstellt werden.' });
    if (type === 'CONSENT' && !recipient.userId)
      return fail(400, { message: 'Für eine Zustimmung ist ein Benutzerkonto der betreuten Person nötig.' });
    const [created] = await db.insert(careRepresentations).values({
      organizationId: recipient.organizationId, recipientId,
      representativeUserId: user.id, requestedById: user.id,
      type: type as 'CONSENT' | 'POWER_OF_ATTORNEY' | 'LEGAL_REPRESENTATION',
      status: 'PENDING', canView: form.has('canView'),
      canManageRequests: form.has('canManageRequests'),
      canManageAppointments: form.has('canManageAppointments'),
      canEditProfile: form.has('canEditProfile')
    }).returning({ id: careRepresentations.id });
    redirect(303, `/vertretungen/${created.id}`);
  }
};
