import { sql } from 'drizzle-orm';
import {
  mysqlTable,
  varchar,
  text,
  mysqlEnum,
  boolean,
  timestamp,
  index,
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
    hashedPassword: text('hashed_password').notNull(),

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
  ]
);

export type SelectUser = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
