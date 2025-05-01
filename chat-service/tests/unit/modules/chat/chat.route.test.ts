import jwt from 'jsonwebtoken';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';

import { app } from '../../../../src/app';
import config from '../../../../src/config';
import * as schema from '../../../../src/db/schema';
import { db } from '../../../../src/db';
import { StatusCodes } from 'http-status-codes';
import { inArray } from 'drizzle-orm';
import { ConversationListItem } from '../../../../src/modules/chat/chat.types';

const API_PREFIX = '/api/v1/chat';
const JWT_SECRET = config.jwt.secret;
const USER_ID_1 = randomUUID();
const USER_ID_2 = randomUUID();
const USER_ID_3 = randomUUID();
let tokenUser1: string;
let tokenUser2: string;
let tokenUser3: string;

const generateTestToken = (userId: string): string => {
  if (!JWT_SECRET) throw new Error('Test JWT_SECRET is not defined');

  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '5m' });
};

describe(`Chat routes Integration Tests`, () => {
  let createdConversationId: string | null = null;

  beforeAll(() => {
    tokenUser1 = generateTestToken(USER_ID_1);
    tokenUser2 = generateTestToken(USER_ID_2);
    tokenUser3 = generateTestToken(USER_ID_3);
  });

  beforeEach(async () => {
    const response = await request(app)
      .post(`${API_PREFIX}/conversations`)
      .set('Authorization', `Bearer ${tokenUser1}`)
      .send({ participantUserId: USER_ID_2 });

    if (
      response.status === StatusCodes.CREATED ||
      response.status === StatusCodes.OK
    ) {
      createdConversationId = response.body.conversationId;
    } else {
      createdConversationId = null;
    }
  });

  afterEach(async () => {
    const testUserIds = [USER_ID_1, USER_ID_2, USER_ID_3];
    try {
      const participantsToDelete = await db
        .select({ convId: schema.participants.conversationId })
        .from(schema.participants)
        .where(inArray(schema.participants.userId, testUserIds));

      if (participantsToDelete.length > 0) {
        const convIds = [...new Set(participantsToDelete.map((p) => p.convId))];

        await db
          .delete(schema.messages)
          .where(inArray(schema.messages.conversationId, convIds));
        await db
          .delete(schema.participants)
          .where(inArray(schema.participants.conversationId, convIds));
        await db
          .delete(schema.conversations)
          .where(inArray(schema.conversations.conversationId, convIds));
      }
    } catch (error) {
      console.error('Error during test cleanup:', error);
    }

    createdConversationId = null;
  });

  describe('POST /conversations', () => {
    it('should return 401 Unauthorized if no token is provided', async () => {
      const response = await request(app)
        .post(`${API_PREFIX}/conversations`)
        .send({ participantUserId: USER_ID_2 });

      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
      expect(response.body.error).toEqual([
        StatusCodes.UNAUTHORIZED,
        'Authorization header is missing or malformed',
      ]);
    });

    it('should return 401 Unauthorized if token is invalid', async () => {
      const invalidToken = `Bearer invalid.token`;
      const response = await request(app)
        .post(`${API_PREFIX}/conversations`)
        .set('Authorization', invalidToken)
        .send({ participantsId: USER_ID_2 });

      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
      expect(response.body.error[0]).toBe(StatusCodes.UNAUTHORIZED);
      expect(response.body.error[1]).toContain(
        'Token signature or format is invalid'
      );
    });

    it('should return 422 Unprocessable Entity for invalid UUID in body', async () => {
      const response = await request(app)
        .post(`${API_PREFIX}/conversations`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ participantUserId: 'not-a-uuid' });

      expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
      expect(response.body.error[0]).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
      expect(response.body.error[1]).toContain(
        '[body.participantUserId]: Invalid UUID format'
      );
    });

    it('should return 422 Unprocessable Entity for missing participantUserId in body', async () => {
      const response = await request(app)
        .post(`${API_PREFIX}/conversations`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({});

      expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
      expect(response.body.error[0]).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
      expect(response.body.error[1]).toContain(
        '[body.participantUserId]: Required'
      );
    });

    it('should return 400 Bad Request when trying to create conversation with oneself', async () => {
      const response = await request(app)
        .post(`${API_PREFIX}/conversations`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ participantUserId: USER_ID_1 });

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.body.error).toEqual([
        StatusCodes.BAD_REQUEST,
        'Cannot start a direct conversation with yourself.',
      ]);
    });

    it('should create a new direct conversation and return 201 crated', async () => {
      const response = await request(app)
        .post(`${API_PREFIX}/conversations`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ participantUserId: USER_ID_2 });

      expect(response.status).toBe(StatusCodes.CREATED);
      expect(response.body).toHaveProperty('conversationId');
      expect(response.body).toHaveProperty('type', 'DIRECT');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');

      const conversationId = response.body.conversationId;
      const participants = await db
        .select()
        .from(schema.participants)
        .where(eq(schema.participants.conversationId, conversationId));

      expect(participants).toHaveLength(2);
      expect(participants.map((p) => p.userId).sort()).toEqual(
        [USER_ID_1, USER_ID_2].sort()
      );
    });

    it('should create a new direct conversation with an initial message and return 201 Created', async () => {
      const initialMessage = 'Hello, this is an integration test';
      const response = await request(app)
        .post(`${API_PREFIX}/conversations`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          participantUserId: USER_ID_2,
          initialMessageContent: initialMessage,
        });

      expect(response.status).toBe(StatusCodes.CREATED);
      expect(response.body).toHaveProperty('conversationId');

      const conversationId = response.body.conversationId;
      const participants = await db
        .select()
        .from(schema.participants)
        .where(eq(schema.participants.conversationId, conversationId));

      expect(participants).toHaveLength(2);

      const messages = await db
        .select()
        .from(schema.messages)
        .where(eq(schema.messages.conversationId, conversationId));

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe(initialMessage);
      expect(messages[0].senderUserId).toBe(USER_ID_1);
    });

    it('should return the existing conversation with 200 OK if calld again with same users', async () => {
      const creatResponse = await request(app)
        .post(`${API_PREFIX}/conversations`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ participantUserId: USER_ID_2 });

      expect(creatResponse.status).toBe(StatusCodes.CREATED);

      const existingConversationId = creatResponse.body.conversationId;

      const secondResponse = await request(app)
        .post(`${API_PREFIX}/conversations`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ participantUserId: USER_ID_2 });

      expect(secondResponse.status).toBe(StatusCodes.OK);
      expect(secondResponse.body).toHaveProperty(
        'conversationId',
        existingConversationId
      );
      expect(secondResponse.body).toHaveProperty('type', 'DIRECT');

      const thirdResponse = await request(app)
        .post(`${API_PREFIX}/conversations`)
        .set('Authorization', `Bearer ${tokenUser2}`)
        .send({ participantUserId: USER_ID_1 });

      expect(thirdResponse.status).toBe(StatusCodes.OK);
      expect(thirdResponse.body).toHaveProperty(
        'conversationId',
        existingConversationId
      );
    });
  });

  describe('GET /conversations', () => {
    it('should return 401 Unauthorized if no token is provided', async () => {
      const response = await request(app).get(`${API_PREFIX}/conversations`);

      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
      expect(response.body.error).toEqual([
        StatusCodes.UNAUTHORIZED,
        'Authorization header is missing or malformed',
      ]);
    });

    it('should return an empty array if the user has no conversations', async () => {
      const response = await request(app)
        .get(`${API_PREFIX}/conversations`)
        .set('Authorization', `Bearer ${tokenUser3}`);

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.error).toEqual([]);
    });

    it('should return a list of conversation for the authenticated user', async () => {
      const response = await request(app)
        .get(`${API_PREFIX}/conversations`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(response.status).toBe(StatusCodes.OK);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);

      const testConversation = response.body.find(
        (c: ConversationListItem) => c.conversationId === createdConversationId
      );

      expect(testConversation).toBeDefined();
      expect(testConversation).toHaveProperty('type', 'DIRECT');
      expect(testConversation).toHaveProperty('lastMessage', null);
      expect(testConversation).toHaveProperty('unreadcount', 0);
    });

    it('should return a conversation with last message and correct unread count', async () => {
      expect(createdConversationId).not.toBeNull();

      await db.insert(schema.messages).values({
        conversationId: createdConversationId!,
        senderUserId: USER_ID_2,
        content: 'Message 1 from User 2',
        contentType: 'TEXT',
      });

      const lastMessageContent = 'Message 2 from User 2';
      const { messageId: lastMessageId } = (
        await db
          .insert(schema.messages)
          .values({
            conversationId: createdConversationId!,
            senderUserId: USER_ID_2,
            content: lastMessageContent,
            contentType: 'TEXT',
          })
          .returning()
      )[0];

      const response = await request(app)
        .get(`${API_PREFIX}/conversations`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(response.status).toBe(StatusCodes.OK);
      const testConversation = response.body.find(
        (c: ConversationListItem) => c.conversationId === createdConversationId
      );
      expect(testConversation).toBeDefined();

      expect(testConversation.lastMessage).not.toBeNull();
      expect(testConversation.lastMessage.messageId).toBe(lastMessageId);
      expect(testConversation.lastMessage.content).toBe(lastMessageContent);
      expect(testConversation.lastMessage.senderUserId).toBe(USER_ID_2);
      expect(testConversation.unreadCount).toBe(2);

      const responseUser2 = await request(app)
        .get(`${API_PREFIX}/conversations`)
        .set('Authorization', `Bearer ${tokenUser2}`);
      expect(responseUser2.status).toBe(StatusCodes.OK);
      const testConversationUser2 = responseUser2.body.find(
        (c: ConversationListItem) => c.conversationId === createdConversationId
      );
      expect(testConversationUser2).toBeDefined();
      expect(testConversationUser2.lastMessage).not.toBeNull();
      expect(testConversationUser2.unreadCount).toBe(0);
    });
  });

  describe('GET /conversations/:conversationId/messages', () => {
    it('should return 401 Unauthorized if no token is provided', async () => {
      expect(createdConversationId).not.toBeNull();

      const response = await request(app).get(
        `${API_PREFIX}/conversations/${createdConversationId}/messages`
      );

      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    });

    it('should return 422 Unprocessable Entity for invalid conversationId format', async () => {
      const response = await request(app)
        .get(`${API_PREFIX}/conversations/some-random-uuid/messages`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
      expect(response.body.error[1]).toContain(
        '[params.conversationId]: Invalid UUID format'
      );
    });

    it('should return 403 Forbidden if user is not a participant', async () => {
      expect(createdConversationId).not.toBeNull();

      const response = await request(app)
        .get(`${API_PREFIX}/conversations/${createdConversationId}/messages`)
        .set('Authorization', `Bearer ${tokenUser3}`);

      expect(response.status).toBe(StatusCodes.FORBIDDEN);
      expect(response.body.error[1]).toContain(
        'You are not a participant in this conversation'
      );
    });

    it('should return 404 Not Found if conversation does not exist', async () => {
      const nonExistentId = randomUUID();

      const response = await request(app)
        .get(`${API_PREFIX}/conversations/${nonExistentId}/messages`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(response.status).toBe(StatusCodes.FORBIDDEN);
      expect(response.body.error[1]).toContain(
        'You are not a participant in this conversation'
      );
    });

    it('should return an empty array if conversation has no messages', async () => {
      expect(createdConversationId).not.toBeNull();

      const response = await request(app)
        .get(`${API_PREFIX}/conversations/${createdConversationId}/messages`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body).toEqual([]);
    });

    it('should return messages for the conversation, ordered oldest to newest', async () => {
      expect(createdConversationId).not.toBeNull();

      const msg1 = (
        await db
          .insert(schema.messages)
          .values({
            conversationId: createdConversationId!,
            senderUserId: USER_ID_1,
            content: 'Msg 1',
          })
          .returning()
      )[0];

      await new Promise((res) => setTimeout(res, 10));
      const msg2 = (
        await db
          .insert(schema.messages)
          .values({
            conversationId: createdConversationId!,
            senderUserId: USER_ID_2,
            content: 'Msg 2',
          })
          .returning()
      )[0];

      await new Promise((res) => setTimeout(res, 10));
      const msg3 = (
        await db
          .insert(schema.messages)
          .values({
            conversationId: createdConversationId!,
            senderUserId: USER_ID_1,
            content: 'Msg 3',
          })
          .returning()
      )[0];

      const response = await request(app)
        .get(`${API_PREFIX}/conversations/${createdConversationId}/messages`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(response.status).toBe(StatusCodes.OK);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);
      expect(response.body[0].messageId).toBe(msg1.messageId);
      expect(response.body[1].messageId).toBe(msg2.messageId);
      expect(response.body[2].messageId).toBe(msg3.messageId);
      expect(response.body[0].content).toBe('Msg 1');
      expect(response.body[1].content).toBe('Msg 2');
      expect(response.body[2].content).toBe('Msg 3');
      expect(response.body[0].contentType).toBe('TEXT');
    });

    it('should return messages respecting the limit query parameter', async () => {
      expect(createdConversationId).not.toBeNull();

      for (let i = 1; i <= 5; i++) {
        await db.insert(schema.messages).values({
          conversationId: createdConversationId!,
          senderUserId: USER_ID_1,
          content: `Msg ${i}`,
        });
        await new Promise((res) => setTimeout(res, 5));
      }

      const response = await request(app)
        .get(
          `${API_PREFIX}/conversations/${createdConversationId}/messages?limit=3`
        )
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.length).toBe(3);
      expect(response.body[0].content).toBe('Msg 3');
      expect(response.body[1].content).toBe('Msg 4');
      expect(response.body[2].content).toBe('Msg 5');
    });

    it('should return messages respecting the before cursor query parameter', async () => {
      expect(createdConversationId).not.toBeNull();

      const msg1 = (
        await db
          .insert(schema.messages)
          .values({
            conversationId: createdConversationId!,
            senderUserId: USER_ID_1,
            content: 'Msg 1',
          })
          .returning()
      )[0];

      await new Promise((res) => setTimeout(res, 10));
      const msg2 = (
        await db
          .insert(schema.messages)
          .values({
            conversationId: createdConversationId!,
            senderUserId: USER_ID_2,
            content: 'Msg 2',
          })
          .returning()
      )[0];

      await new Promise((res) => setTimeout(res, 10));
      const msg3 = (
        await db
          .insert(schema.messages)
          .values({
            conversationId: createdConversationId!,
            senderUserId: USER_ID_1,
            content: 'Msg 3',
          })
          .returning()
      )[0];

      const cursor = msg3.createdAt.toISOString();

      const response = await request(app)
        .get(
          `${API_PREFIX}/conversations/${createdConversationId}/messages?before=${encodeURIComponent(cursor)}`
        )
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(response.status).toBe(StatusCodes.OK);
      expect(response.body.length).toBe(2);
      expect(response.body[0].messageId).toBe(msg1.messageId);
      expect(response.body[1].messageId).toBe(msg2.messageId);
    });

    it('should return 422 for invalid before cursor format', async () => {
      expect(createdConversationId).not.toBeNull();
      const response = await request(app)
        .get(
          `${API_PREFIX}/conversations/${createdConversationId}/messages?before=not-a-timestamp`
        )
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
      expect(response.body.error[1]).toContain(
        '[query.before]: Invalid ISO 8601 timestamp format'
      );
    });

    it('should return 422 for invalid limit format', async () => {
      expect(createdConversationId).not.toBeNull();
      const response = await request(app)
        .get(
          `${API_PREFIX}/conversations/${createdConversationId}/messages?limit=-5`
        )
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(response.status).toBe(StatusCodes.UNPROCESSABLE_ENTITY);
      expect(response.body.error[1]).toContain(
        '[query.limit]: Limit must be a positive integer'
      );
    });
  });
});
