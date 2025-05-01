import { InferSelectModel } from 'drizzle-orm';

import { conversations, messages, participants } from '../../db/schema';

export type Conversation = InferSelectModel<typeof conversations>;
export type Participants = InferSelectModel<typeof participants>;
export type Message = InferSelectModel<typeof messages>;

export type UserId = string;
export type ConversationId = string;
export type MessageId = string;

export interface ConversationListItem {
  conversationId: ConversationId;
  type: Conversation['type'];
  createdAt: Date;
  updatedAt: Date;
  lastMessage: Message | null;
  unreadCount: number;
}

export interface NewMessageInput {
  conversationId: ConversationId;
  senderUserId: UserId;
  content: string;
  contentType: Message['contentType'];
}

export interface MessageDetails extends Message {}

export interface GetMessageOptions {
  limit: number;
  cursor?: Date | string;
}
