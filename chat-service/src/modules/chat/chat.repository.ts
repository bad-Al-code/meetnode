import { count, or, desc, eq, and, lt, isNull, gt, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import * as schema from '../../db/schema';
import { db } from '../../db';
import {
  Conversation,
  ConversationId,
  GetMessageOptions,
  Message,
  Participants,
  UserId,
} from './chat.types';

export class ChatRepository {
  async findParticipant(
    userId: UserId,
    conversationId: ConversationId
  ): Promise<Participants | null> {
    const result = await db
      .select()
      .from(schema.participants)
      .where(
        and(
          eq(schema.participants.userId, userId),
          eq(schema.participants.conversationId, conversationId)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async findConversationByUserId(userId: UserId): Promise<Conversation[]> {
    const results = await db
      .select({
        conversationId: schema.conversations.conversationId,
        type: schema.conversations.type,
        createdAt: schema.conversations.createdAt,
        updatedAt: schema.conversations.updatedAt,
      })
      .from(schema.conversations)
      .innerJoin(
        schema.participants,
        eq(
          schema.conversations.conversationId,
          schema.participants.conversationId
        )
      )
      .where(eq(schema.participants.userId, userId))
      .orderBy(desc(schema.conversations.updatedAt));

    return results;
  }

  async findDirectConversationByUserIds(
    userId1: UserId,
    userId2: UserId
  ): Promise<Conversation | null> {
    const p1 = alias(schema.participants, 'p1');
    const p2 = alias(schema.participants, 'p2');

    const result = await db
      .select({
        conversationId: schema.conversations.conversationId,
        type: schema.conversations.type,
        createdAt: schema.conversations.createdAt,
        updatedAt: schema.conversations.updatedAt,
      })
      .from(schema.conversations)
      .innerJoin(p1, eq(schema.conversations.conversationId, p1.conversationId))
      .innerJoin(p2, eq(schema.conversations.conversationId, p2.conversationId))
      .where(
        and(
          eq(schema.conversations.type, 'DIRECT'),
          or(eq(p1.userId, userId1), eq(p1.userId, userId2)),
          or(eq(p2.userId, userId1), eq(p2.userId, userId2)),
          sql`${p1.userId} != ${p2.userId}`,
          sql`(SELECT count(*) FROM ${schema.participants} WHERE ${schema.participants.conversationId} = ${schema.conversations.conversationId}) = 2`
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async findMessageByConversationId(
    conversationId: ConversationId,
    options: GetMessageOptions
  ): Promise<Message[]> {
    const { limit, cursor } = options;

    const query = db
      .select()
      .from(schema.messages)
      .where(
        and(
          eq(schema.messages.conversationId, conversationId),
          cursor ? lt(schema.messages.createdAt, new Date(cursor)) : undefined,
          isNull(schema.messages.deletedAt)
        )
      )
      .orderBy(desc(schema.messages.createdAt))
      .limit(limit);

    const messages = await query;

    return messages.reverse();
  }

  async createConversation(
    type: Conversation['type'] = 'DIRECT'
  ): Promise<Conversation> {
    const [newConversation] = await db
      .insert(schema.conversations)
      .values({ type })
      .returning();

    if (!newConversation) {
      throw new Error('Failed to crete conversation record.');
    }

    return newConversation;
  }

  async addParticipant(
    conversationId: ConversationId,
    userId: UserId
  ): Promise<Participants> {
    const [newParticipants] = await db
      .insert(schema.participants)
      .values({ conversationId, userId })
      .returning();

    if (!newParticipants) {
      throw new Error('Failed tp add participant to conversation.');
    }

    return newParticipants;
  }

  async addParticipants(
    conversationId: ConversationId,
    userIds: UserId[]
  ): Promise<Participants[]> {
    if (userIds.length === 0) return [];

    const valuesToInsert = userIds.map((userId) => ({
      conversationId,
      userId,
    }));
    const newParticipants = await db.transaction(async (tx) => {
      return await tx
        .insert(schema.participants)
        .values(valuesToInsert)
        .returning();
    });

    if (newParticipants.length !== userIds.length) {
      throw new Error('Failed to add all participants.');
    }

    return newParticipants;
  }

  async createMessage(messageData: {
    conversationId: ConversationId;
    senderUserId: UserId;
    content: string;
    contentType: Message['contentType'];
  }): Promise<Message> {
    const [newMessage] = await db
      .insert(schema.messages)
      .values(messageData)
      .returning();

    if (!newMessage) {
      throw new Error('Failed to create message record.');
    }
    return newMessage;
  }

  async updateParticipantReadTimestamp(
    participantId: Participants['participantId'],
    timestamp: Date
  ): Promise<Participants | null> {
    const [updatedParticipant] = await db
      .update(schema.participants)
      .set({ lastReadTimestamp: timestamp })
      .where(eq(schema.participants.participantId, participantId))
      .returning();

    return updatedParticipant ?? null;
  }

  async getConversationParticipants(
    conversationId: ConversationId
  ): Promise<Participants[]> {
    return db
      .select()
      .from(schema.participants)
      .where(eq(schema.participants.conversationId, conversationId));
  }

  async getLastMessageForConversation(
    conversationId: ConversationId
  ): Promise<Message | null> {
    const [lastMessage] = await db
      .select()
      .from(schema.messages)
      .where(
        and(
          eq(schema.messages.conversationId, conversationId),
          isNull(schema.messages.deletedAt)
        )
      )
      .orderBy(desc(schema.messages.createdAt))
      .limit(1);

    return lastMessage ?? null;
  }

  async getUnreadMessageCount(
    conversationId: ConversationId,
    userId: UserId,
    lastReadTimestamp: Date | null
  ): Promise<number> {
    const unreadCondition = lastReadTimestamp
      ? gt(schema.messages.createdAt, lastReadTimestamp)
      : sql`TRUE`;

    const result = await db
      .select({ count: count(schema.messages.messageId) })
      .from(schema.messages)
      .where(
        and(
          eq(schema.messages.conversationId, conversationId),
          sql`${schema.messages.senderUserId}!==${userId}`,
          isNull(schema.messages.deletedAt),
          unreadCondition
        )
      );

    return Number(result[0].count ?? 0);
  }
}
