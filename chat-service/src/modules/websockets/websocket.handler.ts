import { z, ZodError } from 'zod';

import { authService } from '../auth/auth.service';
import { ChatService } from '../chat/chat.service';
import { webSocketManager } from './websocket.manager';
import {
  AuthenticatedWebSocket,
  BroadcastPayload,
  WebSocketOutgoingMessage,
} from './websocket.types';
import logger from '../../shared/utils/logger';
import {
  incomingWsMessageSchema,
  wsErrorPayloadSchema,
} from '../chat/chat.schemas';
import { ApiError, UnauthorizedError } from '../../shared/errors';
import { ChatRepository } from '../chat/chat.repository';

const AUTH_TIMEOUT_MS = 10000;

export class WebSocketHandler {
  private readonly authService: typeof authService;
  private readonly chatService: ChatService;
  private readonly webSocketManager: typeof webSocketManager;
  private readonly authTimeouts: Map<AuthenticatedWebSocket, NodeJS.Timeout>;

  constructor() {
    this.authService = authService;
    this.chatService = new ChatService(new ChatRepository());
    this.webSocketManager = webSocketManager;
    this.authTimeouts = new Map();
  }

  handleConnection(ws: AuthenticatedWebSocket): void {
    ws.on('message', (message: Buffer | string) => {
      this.handleMessage(ws, message);
    });

    ws.on('close', () => {
      this.handleDisconnect(ws);
    });

    ws.on('error', (error: Error) => {
      logger.error(
        { userId: ws.userId, error: error.message },
        'Websocket client error in handler scope.'
      );
    });

    this.startAuthenticationTimeout(ws);
  }

  handleDisconnect(ws: AuthenticatedWebSocket): void {
    this.clearAuthenticationTimeout(ws);
    this.webSocketManager.removeConnection(ws);
  }

  async handleMessage(
    ws: AuthenticatedWebSocket,
    message: Buffer | string
  ): Promise<void> {
    let parsedMessage: any;

    try {
      parsedMessage = JSON.parse(message.toString());
    } catch (error) {
      this.sendError(ws, 'Invalid message format: Expected JSON');
      return;
    }

    const validationResult = incomingWsMessageSchema.safeParse(parsedMessage);

    if (!validationResult.success) {
      const formattedError = this.formatZodError(validationResult.error);
      this.sendError(
        ws,
        `Invalid mesasge payload: ${formattedError}`,
        'VALIDATION_ERROR'
      );

      return;
    }

    const validatedMessage = validationResult.data;
    try {
      if (!ws.isAuthenticated) {
        if (validatedMessage.type === 'auth') {
          await this.handleAuthentication(ws, validatedMessage.payload.token);
        } else {
          this.sendError(
            ws,
            'Authentication require. Please send { type: "auth", payload: { token: "..."}} first.',
            'AUTH_REQUIRED'
          );

          ws.terminate();
        }
      } else {
        switch (validatedMessage.type) {
          case 'sendMessage':
            await this.handleSendMessage(ws, validatedMessage.payload);
            break;
          case 'typingStart':
            await this.handleTyping(
              ws,
              validatedMessage.payload.conversationId,
              'typingStarted'
            );
            break;
          case 'typingStop':
            await this.handleTyping(
              ws,
              validatedMessage.payload.conversationId,
              'typingStopped'
            );
            break;
          default:
            this.sendError(
              ws,
              `Unhandled message type: ${(validatedMessage as any).type}`
            );
        }
      }
    } catch (error: any) {
      if (error instanceof ApiError) {
        this.sendError(ws, error.message, error.constructor.name);
      } else {
        this.sendError(
          ws,
          'An internal server error occurred while processing your request.',
          'INVALIDATION_SERVER_ERROR'
        );
      }
    }
  }

  private async handleAuthentication(
    ws: AuthenticatedWebSocket,
    token: string
  ): Promise<void> {
    try {
      const payload = this.authService.verifyToken(token);
      ws.userId = payload.userId;
      ws.isAuthenticated = true;

      this.clearAuthenticationTimeout(ws);
      this.webSocketManager.addConnection(ws);

      this.send(ws, { type: 'authSuccess' });
    } catch (error: any) {
      const message =
        error instanceof UnauthorizedError
          ? error.message
          : 'Authentication failed.';
      this.sendError(ws, message, 'AUTH_FAILED');
      this.clearAuthenticationTimeout(ws);

      ws.terminate();
    }
  }

  private async handleSendMessage(
    ws: AuthenticatedWebSocket,
    payload: any
  ): Promise<void> {
    const { conversationId, content, contentType } = payload;
    const senderUserId = ws.userId;

    const savedMessage = await this.chatService.saveMessage({
      conversationId,
      senderUserId,
      content,
      contentType,
    });
    const participants = await this.chatService.getConversationParticipants(
      senderUserId,
      conversationId
    );
    const broadcastPayload: BroadcastPayload = {
      type: 'newMessage',
      payload: {
        messageId: savedMessage.messageId,
        conversationId: savedMessage.conversationId,
        senderUserId: savedMessage.senderUserId,
        contentType: savedMessage.contentType,
        content: savedMessage.content,
        createdAt: savedMessage.createdAt.toISOString(),
      } as any,
      senderUserId: senderUserId,
      conversationId: conversationId,
    };

    this.webSocketManager.broadcastToConversation(
      participants,
      broadcastPayload,
      senderUserId
    );
  }

  private async handleTyping(
    ws: AuthenticatedWebSocket,
    conversationId: string,
    type: 'typingStarted' | 'typingStopped'
  ): Promise<void> {
    const userId = ws.userId;
    const participants = await this.chatService.getConversationParticipants(
      userId,
      conversationId
    );
    const broadcastPayload: BroadcastPayload = {
      type,
      payload: { conversationId, userId },
    };

    this.webSocketManager.broadcastToConversation(
      participants,
      broadcastPayload,
      userId
    );
  }

  private clearAuthenticationTimeout(ws: AuthenticatedWebSocket): void {
    const timeout = this.authTimeouts.get(ws);
    if (timeout) {
      clearTimeout(timeout);
      this.authTimeouts.delete(ws);
    }
  }

  private startAuthenticationTimeout(ws: AuthenticatedWebSocket): void {
    const timeout = setTimeout(() => {
      if (!ws.isAuthenticated) {
        this.sendError(ws, 'Authentication timeout.', 'AUTH_TIMEOUT');
        ws.terminate();
      }

      this.authTimeouts.delete(ws);
    }, AUTH_TIMEOUT_MS);

    this.authTimeouts.set(ws, timeout);
  }

  private sendError(
    ws: AuthenticatedWebSocket,
    message: string,
    code?: string
  ): void {
    const errorPayload: WebSocketOutgoingMessage = {
      type: 'error',
      payload: {
        code: code || 'UNKNOWN_ERROR',
        message: message,
      } satisfies z.infer<typeof wsErrorPayloadSchema>,
    };

    this.send(ws, errorPayload);
  }

  private send<T>(
    ws: AuthenticatedWebSocket,
    message: WebSocketOutgoingMessage<T>
  ): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
        logger.trace(
          { userId: ws.userId, type: message.type },
          'Send Websocket message'
        );
      } catch (error: any) {
        logger.warn(
          { userId: ws.userId, error: error.message },
          'Failed to stringify or send Websocket message'
        );
      }
    } else {
      logger.warn(
        { userId: ws.userId, type: message.type },
        'Attempted to send message to non-open WebSocket.'
      );

      this.handleDisconnect(ws);
    }
  }

  private formatZodError(error: ZodError): string {
    return error.errors
      .map((issue) => `[${issue.path.join('.') || 'field'}]: ${issue.message}`)
      .join('; ');
  }
}

export const webSocketHandler = new WebSocketHandler();
