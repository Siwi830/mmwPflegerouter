import { and, eq } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db/client';
import { careRepresentations, careRecipients, memberships } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/pflegerouter-access';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function lookup(id: string) {
  if (!uuid.test(id)) error(404, 'Nicht gefunden');
  const [r] = await db.select({ representation: careRepresentations,
    recipientUserId: careRecipients.userId,
    recipientName: careRecipients.firstName, recipientSurname: careRecipients.lastName })
    .from(careRepresentations).innerJoin(careRecipients,
      and(eq(careRepresentations.recipientId, careRecipients.id),
        eq(careRepresentations.organizationId, careRecipients.organizationId)))
    .where(eq(careRepresentations.id, id)).limit(1);
  if (!r) error(404, 'Nicht gefunden');
  return r;
}
async function reviewer(userId: string, organizationId: string) {
  const [m] = await db.select({ role: memberships.role }).from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.organizationId, organizationId),
      eq(memberships.isActive, true))).limit(1);
  return m?.role === 'OWNER' || m?.role === 'ADMIN';
}
export const load: PageServerLoad = async ({ locals, params }) => {
  const user = await requireUser(locals);
  const r = await lookup(params.id);
  const canReview = await reviewer(user.id, r.representation.organizationId);
  const canConsent = r.recipientUserId === user.id && r.representation.type === 'CONSENT';
  if (!canReview && !canConsent && r.representation.representativeUserId !== user.id) error(404, 'Nicht gefunden');
  return { representation: { ...r.representation, evidenceReference: undefined, reviewNote: undefined }, recipientName: r.recipientName,
    recipientSurname: r.recipientSurname, canReview, canConsent };
};
export const actions: Actions = {
  decide: async ({ locals, params, request }) => {
    const user = await requireUser(locals);
    const r = await lookup(params.id);
    const form = await request.formData();
    const decision = String(form.get('decision') ?? '');
    if (!['approve', 'reject', 'revoke'].includes(decision)) return fail(400, { message: 'Ungültige Aktion' });
    const canReview = await reviewer(user.id, r.representation.organizationId);
    const canConsent = r.recipientUserId === user.id && r.representation.type === 'CONSENT';
    const isRepresentative = r.representation.representativeUserId === user.id;
    if (decision === 'revoke') {
      if (!canReview && !canConsent && !isRepresentative) error(403, 'Keine Berechtigung');
      if (r.representation.status !== 'ACTIVE') return fail(409, { message: 'Nicht aktiv' });
    } else {
      if (r.representation.status !== 'PENDING') return fail(409, { message: 'Bereits entschieden' });
      if (r.representation.type === 'CONSENT') {
        if (!canConsent) error(403, 'Nur die betreute Person darf zustimmen');
      } else {
        if (!canReview || isRepresentative) error(403, 'Unabhängige Organisationsprüfung erforderlich');
        if (decision === 'approve' && !String(form.get('evidenceReference') ?? '').trim())
          return fail(400, { message: 'Geprüfte Nachweisreferenz erforderlich' });
      }
    }
    const status = decision === 'approve' ? 'ACTIVE' : decision === 'reject' ? 'REJECTED' : 'REVOKED';
    const where = and(eq(careRepresentations.id, r.representation.id),
      eq(careRepresentations.status, decision === 'revoke' ? 'ACTIVE' : 'PENDING'));
    const updated = await db.update(careRepresentations).set({ status,
      approvedById: decision === 'approve' ? user.id : r.representation.approvedById,
      approvedAt: decision === 'approve' ? new Date() : r.representation.approvedAt,
      revokedAt: decision === 'revoke' ? new Date() : null,
      evidenceReference: decision === 'approve' && r.representation.type !== 'CONSENT'
        ? String(form.get('evidenceReference')).trim() : r.representation.evidenceReference,
      reviewNote: String(form.get('reviewNote') ?? '').slice(0, 2000) || null
    }).where(where).returning({ id: careRepresentations.id });
    if (!updated.length) return fail(409, { message: 'Status wurde zwischenzeitlich geändert' });
    return { success: true };
  }
};
