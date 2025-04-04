import { randomBytes } from 'node:crypto';
import pinoHttp from 'pino-http';
import { Express } from 'express';

import logger from '@/config/logger';

export function setupLogging(app: Express): void {
  app.use(
    pinoHttp({
      logger: logger,
      serializers: {
        req(req) {
          return {
            id: req.id,
            method: req.method,
            url: req.url,
          };
        },
        res(res) {
          return {
            statusCode: res.statusCode,
          };
        },
        err(err) {
          return {
            type: err.type,
            message: err.message,
          };
        },
      },
      customLogLevel: function (req, res, err) {
        if (res.statusCode >= 400 && res.statusCode < 500) {
          return 'warn';
        }
        if (res.statusCode >= 500 || err) {
          return 'error';
        }
        if (res.statusCode >= 300 && res.statusCode < 400) {
          return 'silent';
        }
        return 'info';
      },
      genReqId: function (req, res) {
        const existingId = req.id ?? req.headers['x-request-id'];
        if (existingId) return existingId;

        const id = randomBytes(8).toString('hex');
        res.header('x-Request-Id', id);
        return id;
      },
    })
  );
}
