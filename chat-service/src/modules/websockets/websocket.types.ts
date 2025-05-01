import WebSocket from 'ws';
import { UserId } from '../chat/chat.types';

export interface AuthenticatedWebSocket extends WebSocket {
  isAlive?: boolean;
  isAuthenticated?: boolean;
  userId: UserId;
}

export interface BroadcastPayload {
  type: string;
  payload: any;
  senderUserId?: UserId;
  conversationId?: string;
}

export interface WebSocketOutgoingMessage<T = any> {
  type: string;
  payload?: T;
}
