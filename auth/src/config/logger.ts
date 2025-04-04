import pino, { DestinationStream, LoggerOptions } from 'pino';

import { env } from './env';

const options: LoggerOptions = {
  level: env.NODE_ENV === 'prod' ? 'info' : 'debug',
};

let destination: DestinationStream | undefined;

if (env.NODE_ENV !== 'prod') {
  options.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      levelFirst: true,
      transalateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  };
} else {
  destination = pino.destination(process.stdout.fd);
}

const logger = destination ? pino(options, destination) : pino(options);

logger.info(`Logger initialized with level: ${options.level}`);

export default logger;
