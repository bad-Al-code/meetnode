import WebSocket from 'ws';
import { UserId } from '../modules/chat/chat.types';

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
