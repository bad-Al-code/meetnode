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

const API_PREFIX = '/api/v1/chat';
const JWT_SECRET = config.jwt.secret;
const USER_ID_1 = randomUUID();
const USER_ID_2 = randomUUID();
const USER_ID_3 = randomUUID();
let tokenUser1: string;
let tokenUser2: string;

const generateTestToken = (userId: string): string => {
  if (!JWT_SECRET) throw new Error('Test JWT_SECRET is not defined');

  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '5m' });
};

describe(`Chat routes Integration Tests`, () => {
  beforeAll(() => {
    tokenUser1 = generateTestToken(USER_ID_1);
    tokenUser2 = generateTestToken(USER_ID_2);
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
});
