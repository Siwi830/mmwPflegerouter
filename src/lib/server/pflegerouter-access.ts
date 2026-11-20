import { and, eq, gt, isNull, or } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import type { Cookies } from '@sveltejs/kit';
import { db } from '$lib/server/db/client';
import { careRecipients, careRepresentations, memberships, organizationOperations, organizations } from '$lib/server/db/schema';
import { TENANT_COOKIE, resolveActiveOrganization } from '$lib/server/tenant';

type LocalUser = NonNullable<App.Locals['user']>;
export type PflegerouterView = 'self' | 'other' | 'volunteer' | 'business';
export const MANAGERS = ['OWNER', 'ADMIN', 'COORDINATOR'] as const;

export async function requireUser(locals: App.Locals): Promise<LocalUser> {
  if (!locals.user) redirect(303, '/login');
  return locals.user;
}

export async function getOrganizationContext(user: LocalUser, cookies: Cookies) {
  const resolved = await resolveActiveOrganization(user.id, cookies.get(TENANT_COOKIE));
  const active = resolved.activeOrganization;
  if (!active) return { active: null, organizations: resolved.organizations, operation: null };
  const [operation] = await db.select().from(organizationOperations)
    .where(eq(organizationOperations.organizationId, active.organizationId)).limit(1);
  return { active, organizations: resolved.organizations, operation: operation ?? null };
}

export async function getSelfRecipients(userId: string) {
  return db.select({ id: careRecipients.id, organizationId: careRecipients.organizationId,
    firstName: careRecipients.firstName, lastName: careRecipients.lastName })
    .from(careRecipients).where(and(eq(careRecipients.userId, userId),
      eq(careRecipients.isDeleted, false), eq(careRecipients.isActive, true)));
}

export async function getRepresentedRecipients(userId: string) {
  return db.select({ id: careRecipients.id, organizationId: careRecipients.organizationId,
    firstName: careRecipients.firstName, lastName: careRecipients.lastName,
    representationId: careRepresentations.id, type: careRepresentations.type,
    canView: careRepresentations.canView,
    canManageRequests: careRepresentations.canManageRequests,
    canManageAppointments: careRepresentations.canManageAppointments })
    .from(careRepresentations)
    .innerJoin(careRecipients, eq(careRepresentations.recipientId, careRecipients.id))
    .where(and(eq(careRepresentations.representativeUserId, userId),
      eq(careRepresentations.status, 'ACTIVE'),
      eq(careRepresentations.canView, true),
      or(isNull(careRepresentations.expiresAt), gt(careRepresentations.expiresAt, new Date())),
      eq(careRecipients.isDeleted, false), eq(careRecipients.isActive, true),
      eq(careRepresentations.organizationId, careRecipients.organizationId)));
}

export async function requireRecipientPermission(
  userId: string, recipientId: string, permission: 'view' | 'requests' | 'appointments' | 'profile'
) {
  const [recipient] = await db.select({ id: careRecipients.id, organizationId: careRecipients.organizationId,
    userId: careRecipients.userId }).from(careRecipients)
    .where(and(eq(careRecipients.id, recipientId), eq(careRecipients.isDeleted, false),
      eq(careRecipients.isActive, true))).limit(1);
  if (!recipient) error(404, 'Person nicht gefunden');
  if (recipient.userId === userId) return recipient;
  const [representation] = await db.select().from(careRepresentations)
    .where(and(eq(careRepresentations.recipientId, recipientId),
      eq(careRepresentations.organizationId, recipient.organizationId),
      eq(careRepresentations.representativeUserId, userId),
      eq(careRepresentations.status, 'ACTIVE'),
      or(isNull(careRepresentations.expiresAt), gt(careRepresentations.expiresAt, new Date()))))
    .limit(1);
  const allowed = representation && ({ view: representation.canView,
    requests: representation.canManageRequests, appointments: representation.canManageAppointments,
    profile: representation.canEditProfile })[permission];
  if (!allowed) error(403, 'Keine Berechtigung für diese Person');
  return recipient;
}

export async function requireView(view: string, user: LocalUser, cookies: Cookies) {
  if (!['self', 'other', 'volunteer', 'business'].includes(view)) error(404, 'Ansicht unbekannt');
  if (view === 'self') {
    const recipients = await getSelfRecipients(user.id);
    return { view: 'self' as const, recipients, active: null };
  }
  if (view === 'other') {
    const recipients = await getRepresentedRecipients(user.id);
    return { view: 'other' as const, recipients, active: null };
  }
  const ctx = await getOrganizationContext(user, cookies);
  if (!ctx.active || !ctx.operation) error(403, 'Keine konfigurierte aktive Organisation');
  const expected = view === 'business' ? 'BUSINESS' : 'VOLUNTEER_ORG';
  if (ctx.operation.kind !== expected) error(403, 'Diese Ansicht ist für die Organisation nicht freigeschaltet');
  return { view: view as 'volunteer' | 'business', recipients: [], active: ctx.active,
    volunteersEnabled: ctx.operation.volunteersEnabled };
}
