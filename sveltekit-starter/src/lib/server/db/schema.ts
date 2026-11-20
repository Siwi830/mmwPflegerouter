import { sql } from 'drizzle-orm';
import { pgTable, pgEnum, uuid, varchar, text, timestamp, boolean, integer, uniqueIndex, index, check } from 'drizzle-orm/pg-core';

export const organizationType = pgEnum('OrganizationType', ['NONPROFIT', 'CARE_PROVIDER', 'MUNICIPALITY', 'COMMUNITY']);
export const membershipRole = pgEnum('MembershipRole', ['OWNER', 'ADMIN', 'COORDINATOR', 'VOLUNTEER', 'VIEWER']);
export const accountStatus = pgEnum('AccountStatus', ['ACTIVE', 'PENDING', 'SUSPENDED']);
export const requestCategory = pgEnum('RequestCategory', ['SHOPPING', 'COMPANIONSHIP', 'TRANSPORT', 'HOUSEHOLD', 'DIGITAL_HELP', 'OTHER']);
export const requestStatus = pgEnum('RequestStatus', ['OPEN', 'MATCHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
export const matchStatus = pgEnum('MatchStatus', ['PROPOSED', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'COMPLETED']);
export const appointmentStatus = pgEnum('AppointmentStatus', ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']);
export const notificationType = pgEnum('NotificationType', ['REQUEST_CREATED', 'MATCH_PROPOSED', 'MATCH_ACCEPTED', 'APPOINTMENT_REMINDER', 'GENERAL']);
export const availabilityWeekday = pgEnum('AvailabilityWeekday', ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']);
export const organizationKindEnum = pgEnum(
  'organization_kind',
  ['ORGANIZATION', 'PRIVATE']
);

// Names use snake_case for a new database. This is NOT a migration of Prisma's existing tables.
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 320 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 40 }),
  status: accountStatus('status').default('PENDING').notNull(),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, t => [index('users_status_idx').on(t.status)]);

export const authSessions = pgTable('auth_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  tokenHash: text('token_hash').notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, t => [index('auth_sessions_user_expiry_idx').on(t.userId, t.expiresAt)]);

export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  type: organizationType('type').default('COMMUNITY').notNull(),
  contactEmail: varchar('contact_email', { length: 320 }),
  kind: organizationKindEnum('kind')
  .notNull()
  .default('ORGANIZATION'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, t => [index('organizations_name_idx').on(t.name)]);

export const memberships = pgTable('memberships', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: membershipRole('role').default('VIEWER').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [uniqueIndex('memberships_org_user_uq').on(t.organizationId, t.userId), index('memberships_user_idx').on(t.userId)]);

export const careRecipients = pgTable('care_recipients', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 40 }),
  city: varchar('city', { length: 120 }),
  postalCode: varchar('postal_code', { length: 20 }),
  addressLine: varchar('address_line', { length: 250 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, t => [index('care_recipients_org_last_name_idx').on(t.organizationId, t.lastName)]);

export const recipientContacts = pgTable('recipient_contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  recipientId: uuid('recipient_id').notNull().references(() => careRecipients.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  relationship: varchar('relationship', { length: 60 }).notNull(),
}, t => [uniqueIndex('recipient_contacts_recipient_user_uq').on(t.recipientId, t.userId), index('recipient_contacts_user_idx').on(t.userId)]);

export const volunteerProfiles = pgTable('volunteer_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  bio: varchar('bio', { length: 1000 }),
  city: varchar('city', { length: 120 }),
  postalCode: varchar('postal_code', { length: 20 }),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  active: boolean('active').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, t => [index('volunteer_profiles_active_city_idx').on(t.active, t.city)]);

export const availabilities = pgTable('availabilities', {
  id: uuid('id').defaultRandom().primaryKey(),
  volunteerId: uuid('volunteer_id').notNull().references(() => volunteerProfiles.id, { onDelete: 'cascade' }),
  weekday: availabilityWeekday('weekday').notNull(),
  startMinute: integer('start_minute').notNull(),
  endMinute: integer('end_minute').notNull(),
  timeZone: varchar('time_zone', { length: 80 }).default('Europe/Berlin').notNull(),
}, t => [index('availabilities_volunteer_weekday_idx').on(t.volunteerId, t.weekday), check('availabilities_minutes_chk', sql`${t.startMinute} >= 0 AND ${t.startMinute} < ${t.endMinute} AND ${t.endMinute} <= 1440`)]);

export const helpRequests = pgTable('help_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  recipientId: uuid('recipient_id').notNull().references(() => careRecipients.id, { onDelete: 'restrict' }),
  createdById: uuid('created_by_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  category: requestCategory('category').notNull(),
  status: requestStatus('status').default('OPEN').notNull(),
  preferredAt: timestamp('preferred_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, t => [index('help_requests_org_status_created_idx').on(t.organizationId, t.status, t.createdAt), index('help_requests_recipient_created_idx').on(t.recipientId, t.createdAt)]);

export const helpMatches = pgTable('help_matches', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  requestId: uuid('request_id').notNull().references(() => helpRequests.id, { onDelete: 'restrict' }),
  volunteerId: uuid('volunteer_id').notNull().references(() => volunteerProfiles.id, { onDelete: 'restrict' }),
  status: matchStatus('status').default('PROPOSED').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, t => [uniqueIndex('help_matches_request_volunteer_uq').on(t.requestId, t.volunteerId), index('help_matches_org_status_idx').on(t.organizationId, t.status), index('help_matches_volunteer_status_idx').on(t.volunteerId, t.status)]);

export const appointments = pgTable('appointments', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  recipientId: uuid('recipient_id').notNull().references(() => careRecipients.id, { onDelete: 'restrict' }),
  volunteerId: uuid('volunteer_id').references(() => volunteerProfiles.id, { onDelete: 'set null' }),
  requestId: uuid('request_id').references(() => helpRequests.id, { onDelete: 'set null' }),
  matchId: uuid('match_id').references(() => helpMatches.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 200 }).notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  status: appointmentStatus('status').default('SCHEDULED').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, t => [index('appointments_org_start_idx').on(t.organizationId, t.startsAt), index('appointments_volunteer_start_idx').on(t.volunteerId, t.startsAt), check('appointments_time_chk', sql`${t.endsAt} > ${t.startsAt}`)]);

export const careNotes = pgTable('care_notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  recipientId: uuid('recipient_id').notNull().references(() => careRecipients.id, { onDelete: 'restrict' }),
  authorId: uuid('author_id').notNull(), // Original Prisma model intentionally has no FK to User
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [index('care_notes_org_recipient_created_idx').on(t.organizationId, t.recipientId, t.createdAt)]);

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: notificationType('type').notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [index('notifications_user_read_created_idx').on(t.userId, t.readAt, t.createdAt)]);

export const auditEvents = pgTable('audit_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'restrict' }),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  entityId: varchar('entity_id', { length: 100 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [index('audit_events_org_created_idx').on(t.organizationId, t.createdAt)]);
