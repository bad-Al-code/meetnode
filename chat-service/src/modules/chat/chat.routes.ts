import { StatusCodes } from 'http-status-codes';
import { Request, Response, Router } from 'express';

import { ChatRepository } from './chat.repository';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { authenticatJWT } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  createConversationSchema,
  getMessageSchema,
  markReadShema,
} from './chat.schemas';

const chatRepository = new ChatRepository();
const chatService = new ChatService(chatRepository);
const chatController = new ChatController(chatService);

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.status(StatusCodes.OK).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'chat-module',
  });
});

router.get('/conversations', authenticatJWT, chatController.getConversation);

router.post(
  '/conversations',
  authenticatJWT,
  validate(createConversationSchema),
  chatController.createConversation
);

router.post(
  '/conversations/:conversationId/read',
  authenticatJWT,
  validate(markReadShema),
  chatController.markConversationAsRead
);

router.get(
  '/conversations/:conversationId/messages',
  authenticatJWT,
  validate(getMessageSchema),
  chatController.getMessages
);

export { router as chatRouter };
