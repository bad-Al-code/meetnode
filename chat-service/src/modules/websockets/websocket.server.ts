import { WebSocketServer } from 'ws';
import { Server as HttpServer } from 'node:http';
import { unknown } from 'zod';

import { AuthenticatedWebSocket } from './websocket.types';
import logger from '../../shared/utils/logger';
import { webSocketManager } from './websocket.manager';

let wss: WebSocketServer | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;

export const initializeWebSocketServer = (httpServer: HttpServer): void => {
  wss = new WebSocketServer({ server: httpServer });

  heartbeatInterval = setInterval(() => {
    wss?.clients.forEach((wsClient) => {
      const ws = wsClient as AuthenticatedWebSocket;

      if (ws.isAlive === false) {
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping(() => {});
    });
  }, 3000);

  wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
    const ip =
      req.socket.remoteAddress ||
      req.headers['x-forwarded-for']?.[0] ||
      unknown;
    logger.info({ ip }, 'Websocket clinet connected');

    ws.isAlive = true;
    ws.isAuthenticated = false;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('close', (code: number, reason: Buffer) => {
      logger.info(
        { userId: ws.userId, code, reason: reason.toString(), ip },
        'WebSocket client disconnected'
      );
      webSocketManager.removeConnection(ws);
      if (wss?.clients.size === 0 && heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    });

    ws.on('error', (error: Error) => {
      logger.error(
        { userId: ws.userId, error: error.message, ip },
        'WebSocket client error'
      );
      webSocketManager.removeConnection(ws);
      if (
        ws.readyState !== WebSocket.CLOSING &&
        ws.readyState !== WebSocket.CLOSED
      ) {
        ws.terminate();
      }
    });

    if (!heartbeatInterval && wss?.clients.size === 1) {
      logger.info('First client connected, restarting heartbeat interval.');
      heartbeatInterval = setInterval(() => {}, 30000);
    }
  });

  wss.on('error', (error: Error) => {
    logger.error({ error: error.message }, 'WebSocket Server error');
  });
  wss.on('close', () => {
    logger.info('WebSocket Server closed.');
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  });
};

export const closeWebSocketConnections = async (): Promise<void> => {
  if (!wss) return;

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  const closePromises = Array.from(wss.clients).map((client) => {
    const ws = client as AuthenticatedWebSocket;
    return new Promise<void>((resolve) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'Server shutting down');
        const timeout = setTimeout(() => {
          logger.warn(
            { userId: ws.userId },
            'Client close timeout, terminating.'
          );
          ws.terminate();
          resolve();
        }, 2000);
        ws.once('close', () => {
          clearTimeout(timeout);
          logger.debug({ userId: ws.userId }, 'Client closed connection.');
          resolve();
        });
      } else {
        logger.debug(
          { userId: ws.userId },
          'Client already closed or closing, terminating.'
        );
        ws.terminate();
        resolve();
      }
    });
  });

  await Promise.all(closePromises);
  logger.info('Finished sending close frames to clients.');

  return new Promise((resolve, reject) => {
    wss?.close((err) => {
      if (err) {
        logger.error('Error closing WebSocket server:', err);
        reject(err);
      } else {
        logger.info('WebSocket server closed successfully.');
        wss = null;
        resolve();
      }
    });
  });
};
