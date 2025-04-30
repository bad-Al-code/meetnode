import { sql } from 'drizzle-orm';
import {
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const conversationTypeEnum = pgEnum('conversation_type', [
  'DIRECT',
  'GROUP',
]);

export const messageContentTypeEnum = pgEnum('message_content_type', [
  'TEXT',
  'IMAGE',
  'FILE',
  'SYSTEM',
]);

export const conversations = pgTable(
  'conversations',
  {
    conversationId: uuid('conversation_id')
      .primaryKey()
      .default(sql`uuid_generate_v4()`),
    type: conversationTypeEnum('type').notNull().default('DIRECT'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('idx_conversations_updated_at').on(table.updatedAt.desc())]
);

export const participants = pgTable(
  'participants',
  {
    participantId: uuid('participant_id')
      .primaryKey()
      .default(sql`uuid_generate_v4()`),
    conversationId: uuid('conversation_id').notNull(),
    userId: uuid('user_id').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    lastReadTimestamp: timestamp('last_read_timestamp', {
      withTimezone: true,
      mode: 'date',
    }),
  },
  (table) => [
    foreignKey({
      columns: [table.conversationId],
      foreignColumns: [conversations.conversationId],
      name: 'participants_conversation_id_fk',
    }).onDelete('cascade'),

    unique('participants_uq').on(table.conversationId, table.userId),

    uniqueIndex('idx_participants_user_id').on(table.userId),
    index('idx_participants_conversation_id').on(table.conversationId),
  ]
);

export const messages = pgTable(
  'messages',
  {
    messageId: uuid('message_id')
      .primaryKey()
      .default(sql`uuid_generate_v4()`),
    conversationId: uuid('conversation_id').notNull(),
    senderUserId: uuid('sender_user_id').notNull(),
    contentType: messageContentTypeEnum('content_type')
      .notNull()
      .default('TEXT'),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    foreignKey({
      columns: [table.conversationId],
      foreignColumns: [conversations.conversationId],
      name: 'messages_conversation_id_fk',
    }).onDelete('cascade'),

    index('idx_messages_conversation_id_created_at').on(
      table.conversationId,
      table.createdAt.asc()
    ),
    index('idx_messages_sender_user_id').on(table.senderUserId),
  ]
);
