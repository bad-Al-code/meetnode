import { z } from 'zod';
import { messageContentTypeEnum } from '../../db/schema';

const uuidSchema = z.string().uuid({ message: 'Invalid UUID format' });

export const getMessageSchema = z.object({
  params: z.object({
    conversationId: uuidSchema.describe(
      'The ID of the conversation to fetch messages for'
    ),
  }),
  query: z.object({
    limit: z.coerce
      .number()
      .int()
      .positive({ message: 'Limit must be a positive number' })
      .max(100, { message: 'Limit cannot exceed 100' })
      .optional()
      .default(50)
      .describe('Maximum number of message to return'),
    before: z
      .string()
      .datetime({
        offset: true,
        message: 'Invalid ISO 8601 timestamp format for "before" cursor',
      })
      .optional()
      .describe('fetch messages created before this ISO 8601 timestamp cursor'),
  }),
});

export type GetMessageParams = z.infer<typeof getMessageSchema.shape.params>;
export type GetMessageQuery = z.infer<typeof getMessageSchema.shape.query>;

export const createConversationSchema = z.object({
  body: z.object({
    participantUserId: uuidSchema.describe(
      'The user ID of the other participants'
    ),
    initialMessageContent: z
      .string()
      .min(1, { message: 'Initial message connot be empty' })
      .max(5000, { message: 'Initial message connot exceed 5000 characters' })
      .optional()
      .describe(
        'Optional initial text mesage to send when creating the conversation'
      ),
  }),
});

export type CreateConversationBody = z.infer<
  typeof createConversationSchema.shape.body
>;

export const markReadShema = z.object({
  params: z.object({
    conversationId: uuidSchema.describe(
      'The ID of the conversation to mark as read'
    ),
  }),
  body: z
    .object({
      lastReadTimestap: z
        .string()
        .datetime({
          offset: true,
          message: 'Invalid ISO 8061 timestamp format for "lastReadTimestamp"',
        })
        .optional()
        .describe('Mark message up to this timestamp as read (defaults to now'),
    })
    .optional(),
});

export type MarkReadParams = z.infer<typeof markReadShema.shape.params>;
export type MarkReadBody = z.infer<typeof markReadShema.shape.body>;

export const baseWsMessageSchema = z.object({
  type: z.string().min(1),
});

export const authWsMessageSchema = baseWsMessageSchema.extend({
  type: z.literal('auth'),
  payload: z.object({
    token: z.string().min(10).describe('The JWT authentication token'),
  }),
});

export type AuthWsMessage = z.infer<typeof authWsMessageSchema>;

export const sendWsMessageSchema = baseWsMessageSchema.extend({
  type: z.literal('sendMessage'),
  payload: z.object({
    conversationId: uuidSchema,
    content: z
      .string()
      .min(1, { message: 'Message content cannot be empty' })
      .max(5000, { message: 'Message content cannot exceed 5000 characters' }),
    contentType: z
      .enum(messageContentTypeEnum.enumValues)
      .optional()
      .default('TEXT')
      .describe('Type of message content (TEXT, IMAGE, FILE, SYSTEM)'),
  }),
});

export type SendWsMessagePayload = z.infer<
  typeof sendWsMessageSchema.shape.payload
>;

export const typingStartWsMessageSchema = baseWsMessageSchema.extend({
  type: z.literal('typingStart'),
  payload: z.object({
    conversationId: uuidSchema,
  }),
});

export const typingStopWsMessageSchema = baseWsMessageSchema.extend({
  type: z.literal('typingStop'),
  payload: z.object({
    conversationId: uuidSchema,
  }),
});

export const incomingWsMessageSchema = z.discriminatedUnion('type', [
  authWsMessageSchema,
  sendWsMessageSchema,
  typingStartWsMessageSchema,
  typingStopWsMessageSchema,
]);

export type IncomingWsMessage = z.infer<typeof incomingWsMessageSchema>;

export const wsErrorPayloadSchema = z.object({
  code: z
    .string()
    .optional()
    .describe('Optional error code (e.g., AUTH_FAILED, VALIDATION_ERROR)'),
  message: z.string().describe('Descriptive error message'),
});
export type WsErrorPayload = z.infer<typeof wsErrorPayloadSchema>;

export const authResultWsSchema = z.object({
  type: z.enum(['authSuccess', 'authError']),
  payload: wsErrorPayloadSchema.optional(),
});

export const newMessageWsPayloadSchema = z.object({
  messageId: uuidSchema,
  conversationId: uuidSchema,
  senderUserId: uuidSchema,
  contentType: z.enum(messageContentTypeEnum.enumValues),
  content: z.string(),
  createdAt: z.string().datetime({ offset: true }),
});

export type NewMessageWsPayload = z.infer<typeof newMessageWsPayloadSchema>;

export const newMessageUpdateWsSchema = z.object({
  type: z.literal('newMessage'),
  payload: newMessageWsPayloadSchema,
});

export const typingUpdateWsSchema = z.object({
  type: z.enum(['typingStarted', 'typingStopped']),
  payload: z.object({
    conversationId: uuidSchema,
    userId: uuidSchema,
  }),
});
