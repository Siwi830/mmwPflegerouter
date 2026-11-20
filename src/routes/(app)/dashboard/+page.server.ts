import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

import {
  and,
  asc,
  eq,
  isNull,
  or,
  sql
} from 'drizzle-orm';

import { db } from '$lib/server/db/client';
import { TENANT_COOKIE, resolveActiveOrganization } from '$lib/server/tenant';

import {
  memberships,
  organizations,
  careRecipients,
  helpRequests,
  careRecipientChangeRequests,
  appointments,
  volunteerRecords
} from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals, cookies }) => {
  const user = locals.user;

  if (!user) {
    redirect(303, '/login');
  }

  // --------------------------------------------------
  // 1. Aktive Organisation und Rollen serverseitig prüfen
  // --------------------------------------------------

  // Ein Cookie ist nur eine Auswahl, niemals eine Berechtigung.
  // resolveActiveOrganization prüft die aktive Mitgliedschaft in der DB.
  const { activeOrganization } = await resolveActiveOrganization(
    user.id,
    cookies.get(TENANT_COOKIE)
  );

  if (!activeOrganization) {
    redirect(303, '/mein-bereich');
  }

  const organizationId = activeOrganization.organizationId;
  const role = activeOrganization.role;

  const canViewAdminStats = role === 'OWNER' || role === 'ADMIN';
  const canReviewChanges =
    role === 'OWNER' || role === 'ADMIN' || role === 'COORDINATOR';

  // --------------------------------------------------
  // 2. Sichtbarkeit von Tickets in genau diesem Mandanten
  // --------------------------------------------------

  const ticketVisibility = and(
    eq(helpRequests.organizationId, organizationId),
    canReviewChanges
      ? sql`true`
      : or(
          and(
            eq(helpRequests.status, 'OPEN'),
            isNull(helpRequests.assignedUserId)
          ),
          eq(helpRequests.assignedUserId, user.id)
        )
  );

  // --------------------------------------------------
  // 3. Offene Änderungsanträge
  // --------------------------------------------------

  let pendingChanges = 0;

  if (canReviewChanges) {
    const [result] = await db
      .select({
        count: sql<number>`count(*)::int`
      })
      .from(careRecipientChangeRequests)
      .where(
        and(
          eq(careRecipientChangeRequests.organizationId, organizationId),
          eq(
            careRecipientChangeRequests.status,
            'PENDING'
          )
        )
      );

    pendingChanges = result?.count ?? 0;
  }

  // --------------------------------------------------
  // 4. Prioritätssortierung
  // --------------------------------------------------

  const priorityRank = sql<number>`
    case ${helpRequests.priority}
      when 'EMERGENCY' then 0
      when 'URGENT' then 1
      when 'NORMAL' then 2
      when 'WISH' then 3
      else 4
    end
  `;

  // --------------------------------------------------
  // 5. Ticketübersicht und Prioritätszähler
  // --------------------------------------------------

  const [requestOverview, recentRequests, myRequests] =
    await Promise.all([
      db
        .select({
          openRequests: sql<number>`
            count(*) filter (
              where ${helpRequests.status} = 'OPEN'
            )::int
          `,
          emergency: sql<number>`
            count(*) filter (
              where ${helpRequests.priority} = 'EMERGENCY'
              and ${helpRequests.status} = 'OPEN'
            )::int
          `,
          urgent: sql<number>`
            count(*) filter (
              where ${helpRequests.priority} = 'URGENT'
              and ${helpRequests.status} = 'OPEN'
            )::int
          `,
          normal: sql<number>`
            count(*) filter (
              where ${helpRequests.priority} = 'NORMAL'
              and ${helpRequests.status} = 'OPEN'
            )::int
          `,
          wish: sql<number>`
            count(*) filter (
              where ${helpRequests.priority} = 'WISH'
              and ${helpRequests.status} = 'OPEN'
            )::int
          `
        })
        .from(helpRequests)
        .where(ticketVisibility),

      // Alle für diesen Benutzer sichtbaren Tickets.
      // Keine Begrenzung auf 12, damit die Filterung
      // nach Priorität vollständig funktioniert.
      db
        .select({
          id: helpRequests.id,
          title: helpRequests.title,
          category: helpRequests.category,
          priority: helpRequests.priority,
          status: helpRequests.status,
          assignedUserId: helpRequests.assignedUserId,
          createdAt: helpRequests.createdAt,
          organizationName: organizations.name,
          recipientFirstName: careRecipients.firstName,
          recipientLastName: careRecipients.lastName
        })
        .from(helpRequests)
        .innerJoin(
          organizations,
          eq(
            helpRequests.organizationId,
            organizations.id
          )
        )
        .innerJoin(
          careRecipients,
          and(
            eq(helpRequests.recipientId, careRecipients.id),
            eq(careRecipients.organizationId, organizationId)
          )
        )
        .where(ticketVisibility)
        .orderBy(
          sql`
            case
              when ${helpRequests.status} = 'OPEN'
              then 0
              else 1
            end
          `,
          priorityRank,
          asc(helpRequests.createdAt)
        ),

      // Persönliche Aufgaben des angemeldeten Benutzers.
      db
        .select({
          id: helpRequests.id,
          title: helpRequests.title,
          category: helpRequests.category,
          priority: helpRequests.priority,
          status: helpRequests.status,
          createdAt: helpRequests.createdAt,
          organizationName: organizations.name,
          recipientFirstName: careRecipients.firstName,
          recipientLastName: careRecipients.lastName
        })
        .from(helpRequests)
        .innerJoin(
          organizations,
          eq(
            helpRequests.organizationId,
            organizations.id
          )
        )
        .innerJoin(
          careRecipients,
          and(
            eq(helpRequests.recipientId, careRecipients.id),
            eq(careRecipients.organizationId, organizationId)
          )
        )
        .where(
          and(
            eq(helpRequests.organizationId, organizationId),
            eq(helpRequests.assignedUserId, user.id)
          )
        )
        .orderBy(
          priorityRank,
          asc(helpRequests.createdAt)
        )
    ]);

  // --------------------------------------------------
  // 6. Verwaltungskennzahlen
  // --------------------------------------------------

  let recipientsCount = 0;
  let volunteersCount = 0;
  let upcomingAppointmentsCount = 0;

  if (canViewAdminStats) {
    const [
      recipientsResult,
      volunteersResult,
      appointmentsResult
    ] = await Promise.all([
      db
        .select({
          count: sql<number>`count(*)::int`
        })
        .from(careRecipients)
        .where(
          and(
            eq(careRecipients.organizationId, organizationId),
            eq(careRecipients.isDeleted, false),
            eq(careRecipients.isActive, true)
          )
        ),

      db
        .select({
          count: sql<number>`count(*)::int`
        })
        .from(volunteerRecords)
        .where(
          eq(volunteerRecords.organizationId, organizationId)
        ),

      db
        .select({
          count: sql<number>`count(*)::int`
        })
        .from(appointments)
        .where(
          and(
            eq(appointments.organizationId, organizationId),
            eq(appointments.status, 'SCHEDULED'),
            sql`${appointments.startsAt} >= now()`
          )
        )
    ]);

    recipientsCount = recipientsResult[0]?.count ?? 0;
    volunteersCount = volunteersResult[0]?.count ?? 0;
    upcomingAppointmentsCount =
      appointmentsResult[0]?.count ?? 0;
  }

  // --------------------------------------------------
  // 7. Nächste Termine
  // --------------------------------------------------

  // Nur OWNER/ADMIN erhalten die Terminliste. Für andere Rollen
  // erst nach gesicherter Teilnehmer-/Aufgabenzuordnung freigeben.

  const upcomingAppointments = canViewAdminStats
    ? await db
        .select({
          id: appointments.id,
          startsAt: appointments.startsAt,
          status: appointments.status,
          organizationId: appointments.organizationId
        })
        .from(appointments)
        .where(
          and(
            eq(appointments.organizationId, organizationId),
            eq(appointments.status, 'SCHEDULED'),
            sql`${appointments.startsAt} >= now()`
          )
        )
        .orderBy(asc(appointments.startsAt))
        .limit(10)
    : [];

  // --------------------------------------------------
  // 8. Daten an Svelte übergeben
  // --------------------------------------------------

  const overview = requestOverview[0];

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      pendingChanges,
      canReviewChanges
    },

    // Kompatibel mit der bestehenden Dashboard-Oberfläche:
    // ausschließlich die aktuell ausgewählte Organisation.
    organizations: [activeOrganization],

    canViewAdminStats,
    canReviewChanges,
    pendingChanges,

    stats: {
      openRequests: overview?.openRequests ?? 0,
      recipients: recipientsCount,
      volunteers: volunteersCount,
      upcomingAppointments: upcomingAppointmentsCount
    },

    requestPriorities: {
      emergency: overview?.emergency ?? 0,
      urgent: overview?.urgent ?? 0,
      normal: overview?.normal ?? 0,
      wish: overview?.wish ?? 0
    },

    recentRequests,
    myRequests,
    upcomingAppointments
  };
};