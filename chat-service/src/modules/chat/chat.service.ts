import { eq, sql } from 'drizzle-orm';

import * as schema from '../../db/schema';
import { db } from '../../db';
import {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
} from '../../shared/errors';
import { ChatRepository } from './chat.repository';
import {
  Conversation,
  ConversationId,
  ConversationListItem,
  CreateConversationResult,
  GetMessageOptions,
  Message,
  MessageDetails,
  NewMessageInput,
  Participants,
  UserId,
} from './chat.types';

export class ChatService {
  constructor(private chatRepository: ChatRepository) {}

  private async checkUserParticipation(
    userId: UserId,
    conversationId: ConversationId
  ): Promise<Participants> {
    const participant = await this.chatRepository.findParticipant(
      userId,
      conversationId
    );

    if (!participant) {
      throw new ForbiddenError(
        `You are not a participant in this conversation.`
      );
    }

    return participant;
  }

  async getUserConversation(userId: UserId): Promise<ConversationListItem[]> {
    const basicConversations =
      await this.chatRepository.findConversationByUserId(userId);
    const enrichedConversations = await Promise.all(
      basicConversations.map(async (conv): Promise<ConversationListItem> => {
        const participant = await this.chatRepository.findParticipant(
          userId,
          conv.conversationId
        );
        const lastReadTimestamp = participant?.lastReadTimestamp ?? null;

        const [lastMessage, unreadCount] = await Promise.all([
          this.chatRepository.getLastMessageForConversation(
            conv.conversationId
          ),
          this.chatRepository.getUnreadMessageCount(
            conv.conversationId,
            userId,
            lastReadTimestamp
          ),
        ]);

        return {
          ...conv,
          lastMessage,
          unreadCount,
        };
      })
    );

    return enrichedConversations;
  }

  async getMessagesForConversation(
    userId: UserId,
    conversationId: ConversationId,
    options: GetMessageOptions
  ): Promise<MessageDetails[]> {
    await this.checkUserParticipation(userId, conversationId);

    const messages = await this.chatRepository.findMessageByConversationId(
      conversationId,
      options
    );

    const messageDetails: MessageDetails[] = messages.map((msg) => ({
      ...msg,
    }));

    return messageDetails;
  }

  async createDirectConversation(
    initiatorUserId: UserId,
    participantUserId: UserId,
    initialMessageContent?: string
  ): Promise<Conversation> {
    if (initiatorUserId === participantUserId) {
      throw new BadRequestError(
        `Cannot start a direct conversation with yourself.`
      );
    }

    const conversation = await db.transaction(async (tx) => {
      await tx.query.conversations.findFirst({
        where: (conversation, { eq, and }) =>
          and(
            eq(conversation.type, 'DIRECT'),
            sql`EXISTS (SELECT 1 FROM ${schema.participants} p1 WHERE p1.conversation_id = ${conversation.conversationId} AND p1.user_id = ${initiatorUserId})`,
            sql`EXISTS (SELECT 1 FROM ${schema.participants} p2 where p2.conversation_id=${conversation.conversationId} AND p2.user_id=${participantUserId})`
          ),
      });

      const [newConversation] = await tx
        .insert(schema.conversations)
        .values({ type: 'DIRECT' })
        .returning();

      if (!newConversation) {
        throw new InternalServerError(
          `Failed to create conversation record in transcation.`
        );
      }

      const participantToInsert = [
        {
          conversationId: newConversation.conversationId,
          userId: initiatorUserId,
        },
        {
          conversationId: newConversation.conversationId,
          userId: initiatorUserId,
        },
      ];

      const insertedParticipants = await tx
        .insert(schema.participants)
        .values(participantToInsert)
        .returning();

      if (insertedParticipants.length !== 2) {
        throw new InternalServerError(
          `Failed to add participants in transaction.`
        );
      }

      if (initialMessageContent) {
        const messageToInsert = {
          conversationId: newConversation.conversationId,
          senderUserId: initiatorUserId,
          content: initialMessageContent,
          contentType: 'TEXT' as Message['contentType'],
        };

        const [insertedMessage] = await tx
          .insert(schema.messages)
          .values(messageToInsert)
          .returning();

        if (!insertedMessage) {
          throw new InternalServerError(
            `Failed to add create initial message in transcation`
          );
        }

        await tx
          .update(schema.conversations)
          .set({ updatedAt: new Date() })
          .where(
            eq(
              schema.conversations.conversationId,
              newConversation.conversationId
            )
          );
      }

      return newConversation;
    });

    return conversation;
  }

  async saveMessage(messageInput: NewMessageInput): Promise<MessageDetails> {
    const { conversationId, senderUserId, content, contentType } = messageInput;

    await this.checkUserParticipation(senderUserId, conversationId);

    const newMessage = await this.chatRepository.createMessage({
      conversationId,
      senderUserId,
      content,
      contentType,
    });

    return { ...newMessage };
  }

  async markConversationAsRead(
    userId: UserId,
    conversationId: ConversationId,
    readTimestamp?: Date | string
  ): Promise<Participants> {
    const participant = await this.checkUserParticipation(
      userId,
      conversationId
    );
    const timestampToUpdate = readTimestamp
      ? new Date(readTimestamp)
      : new Date();

    if (
      !participant.lastReadTimestamp ||
      timestampToUpdate > participant.lastReadTimestamp
    ) {
      const updatedParticipant =
        await this.chatRepository.updateParticipantReadTimestamp(
          participant.participantId,
          timestampToUpdate
        );

      if (!updatedParticipant) {
        throw new InternalServerError(
          `Failed to updated participant read timestamp.`
        );
      }
      return updatedParticipant;
    } else {
      return participant;
    }
  }

  async getConversationParticipants(
    userId: UserId,
    conversationId: ConversationId
  ): Promise<Participants[]> {
    await this.checkUserParticipation(userId, conversationId);

    const participants =
      await this.chatRepository.getConversationParticipants(conversationId);

    return participants;
  }

  async findOrCreateDirectConversation(
    initiatorUserId: UserId,
    participantUserId: UserId,
    initialMessageContent?: string
  ): Promise<CreateConversationResult> {
    if (initiatorUserId === participantUserId) {
      throw new BadRequestError(
        'Cannot start a direct conversation with yourself.'
      );
    }

    const existingConversation =
      await this.chatRepository.findDirectConversationByUserIds(
        initiatorUserId,
        participantUserId
      );

    if (existingConversation) {
      return { conversation: existingConversation, isNew: false };
    }

    const newConversation = await db.transaction(async (tx) => {
      const [createdConv] = await tx
        .insert(schema.conversations)
        .values({ type: 'DIRECT' })
        .returning();

      if (!createdConv)
        throw new InternalServerError(
          'Failed to create conversation record in transaction.'
        );

      const participantsToInsert = [
        { conversationId: createdConv.conversationId, userId: initiatorUserId },
        {
          conversationId: createdConv.conversationId,
          userId: participantUserId,
        },
      ];
      const insertedParticipants = await tx
        .insert(schema.participants)
        .values(participantsToInsert)
        .returning();

      if (insertedParticipants.length !== 2) {
        throw new InternalServerError(
          'Failed to add participants in transaction.'
        );
      }

      if (initialMessageContent) {
        const messageToInsert = {
          conversationId: createdConv.conversationId,
          senderUserId: initiatorUserId,
          content: initialMessageContent,
          contentType: 'TEXT' as Message['contentType'],
        };

        const [insertedMessage] = await tx
          .insert(schema.messages)
          .values(messageToInsert)
          .returning();

        if (!insertedMessage) {
          throw new InternalServerError(
            'Failed to create initial message in transaction.'
          );
        }

        await tx
          .update(schema.conversations)
          .set({ updatedAt: new Date() })
          .where(
            eq(schema.conversations.conversationId, createdConv.conversationId)
          );
      }

      return createdConv;
    });

    return { conversation: newConversation, isNew: true };
  }
}
