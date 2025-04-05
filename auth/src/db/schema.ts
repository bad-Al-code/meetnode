import { relations, sql } from 'drizzle-orm';
import {
  mysqlTable,
  varchar,
  text,
  mysqlEnum,
  boolean,
  timestamp,
  index,
  primaryKey,
  uniqueIndex,
} from 'drizzle-orm/mysql-core';
import { randomUUID } from 'node:crypto';

export const roles = ['user', 'admin'] as const;

export const users = mysqlTable(
  'users',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    username: varchar('username', { length: 50 }).unique(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    hashedPassword: text('hashed_password'),

    role: mysqlEnum('role', roles).notNull().default(roles[0]),
    acceptedTerms: boolean('accepted_terms').notNull().default(false),

    createdAt: timestamp('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow(),
  },
  (table) => [
    index('email_idx').on(table.email),
    index('role_idx').on(table.role),
    index('username_idx').on(table.username),
  ]
);

export const oauthProviders = ['github', 'google'] as const;

export const oauthAccounts = mysqlTable(
  'oauth_accounts',
  {
    providerId: mysqlEnum('provider_id', oauthProviders).notNull(),
    providerUserId: varchar('provider_user_id', { length: 255 }).notNull(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    scopes: text('scopes'),

    createdAt: timestamp('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow(),
  },
  (table) => [
    primaryKey({ columns: [table.providerId, table.providerUserId] }),
    index('oauth_user_id_idx').on(table.userId),
    uniqueIndex('oauth_user_provider_uk').on(table.userId, table.providerId),
  ]
);

export type SelectUser = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type SelectOAuthAccount = typeof oauthAccounts.$inferSelect;
export type InsertOAuthAccount = typeof oauthAccounts.$inferInsert;

export const userRelations = relations(users, ({ many }) => ({
  oauthAccounts: many(oauthAccounts),
}));

export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
  user: one(users, {
    fields: [oauthAccounts.userId],
    references: [users.id],
  }),
}));
