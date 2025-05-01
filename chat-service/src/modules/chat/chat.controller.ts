import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { ChatService } from './chat.service';
import {
  CreateConversationBody,
  GetMessageParams,
  GetMessageQuery,
  MarkReadBody,
  MarkReadParams,
} from './chat.schemas';
import { UserId } from './chat.types';

export class ChatController {
  constructor(private chatService: ChatService) {}

  getConversation = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    const conversations = await this.chatService.getUserConversation(userId);

    res.status(StatusCodes.OK).json(conversations);
  };

  getMessages = async (
    req: Request<GetMessageParams>,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.userId as UserId;
    const params = req.validatedData?.params as GetMessageParams;
    const query = req.validatedData?.query as GetMessageQuery;
    const { conversationId } = params;
    const { limit, before } = query;

    const messages = await this.chatService.getMessagesForConversation(
      userId,
      conversationId,
      { limit, cursor: before }
    );

    res.status(StatusCodes.OK).json(messages);
  };

  createConversation = async (
    req: Request<any, any, CreateConversationBody>,
    res: Response
  ): Promise<void> => {
    const initiatorUserId = req.user!.userId as UserId;
    const body = req.validatedData?.body as CreateConversationBody;
    const { participantUserId, initialMessageContent } = body;

    const conversation = await this.chatService.createDirectConversation(
      initiatorUserId,
      participantUserId,
      initialMessageContent
    );

    res.status(StatusCodes.CREATED).json(conversation);
  };

  markConversationAsRead = async (
    req: Request<MarkReadParams, any, MarkReadBody | undefined>,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.userId;
    const params = req.validatedData?.params as MarkReadParams;
    const body = req.validatedData?.query as MarkReadBody;

    const { conversationId } = params;
    const timestamp = body?.lastReadTimestap;

    const updatedParticipant = await this.chatService.markConversationAsRead(
      userId,
      conversationId,
      timestamp
    );

    res.status(StatusCodes.OK).json({
      success: true,
      lastReadTimestamp: updatedParticipant.lastReadTimestamp,
    });
  };
}
