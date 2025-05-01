import { Participants, UserId } from '../modules/chat/chat.types';
import { AuthenticatedWebSocket, BroadcastPayload } from './ws.types';
import logger from '../shared/utils/logger';

class WebSocketManager {
  private readonly clients: Map<UserId, Set<AuthenticatedWebSocket>>;

  constructor() {
    this.clients = new Map<UserId, Set<AuthenticatedWebSocket>>();
  }

  addConnection(ws: AuthenticatedWebSocket): void {
    const userId = ws.userId;
    let userConnection = this.clients.get(userId);

    if (!userConnection) {
      userConnection = new Set<AuthenticatedWebSocket>();
      this.clients.set(userId, userConnection);
    }

    userConnection.add(ws);
  }

  removeConnection(ws: AuthenticatedWebSocket): void {
    const userId = ws.userId;
    const userConnection = this.clients.get(userId);

    if (userConnection) {
      userConnection.delete(ws);

      if (userConnection.size === 0) {
        this.clients.delete(userId);
      }
    } else {
      logger.warn(
        { userId },
        'Attempted to remove connection for user not found in manager.'
      );
    }
  }

  getConnections(userId: UserId): Set<AuthenticatedWebSocket> {
    return this.clients.get(userId) || new Set<AuthenticatedWebSocket>();
  }

  isUserOnline(userId: UserId): boolean {
    return this.clients.has(userId);
  }

  sendMessageToUser(userId: UserId, payload: BroadcastPayload): void {
    const connection = this.getConnections(userId);

    if (connection.size > 0) {
      const message = JSON.stringify(payload);

      connection.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        } else {
          this.removeConnection(ws);
        }
      });
    } else {
      logger.trace(
        { userId, type: payload.type },
        'User not online, message not sent.'
      );
    }
  }

  broadcastToConversation(
    participants: Participants[],
    payload: BroadcastPayload,
    excludeSenderId?: UserId
  ): void {
    if (!participants || participants.length === 0) {
      return;
    }

    const message = JSON.stringify(payload);
    let onlineRecipientCount = 0;

    logger.debug(
      {
        conversationId: participants[0]?.conversationId,
        type: payload.type,
        excludeSenderId,
        participantCount: participants.length,
      },
      'Broadcasting message to conversation participants'
    );

    participants.forEach((participant) => {
      const recipientUserId = participant.userId;

      if (excludeSenderId && recipientUserId === excludeSenderId) {
        return;
      }

      const connection = this.getConnections(recipientUserId);
      if (connection.size > 0) {
        onlineRecipientCount++;
        connection.forEach((ws) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
          } else {
            this.removeConnection(ws);
          }
        });
      }
    });
  }

  broadcastToAll(payload: BroadcastPayload, excludeSenderId?: UserId): void {
    const message = JSON.stringify(payload);
    let sentCount = 0;

    this.clients.forEach((connections, userId) => {
      if (excludeSenderId && userId === excludeSenderId) {
        return;
      }

      connections.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
          sentCount++;
        }
      });
    });
  }
}

export const webSocketManager = new WebSocketManager();
