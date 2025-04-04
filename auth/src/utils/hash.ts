import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

import logger from '@/config/logger';

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;
const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  try {
    const salt = randomBytes(SALT_LENGTH);
    const hashBuffer = (await scryptAsync(
      password,
      salt,
      KEY_LENGTH
    )) as Buffer;

    return `${salt.toString('hex')}.${hashBuffer.toString('hex')}`;
  } catch (error) {
    logger.error('Error hashing password: ', error);
    throw new Error('Could not hash password.');
  }
}

export async function verifyPassword(
  storedPassword: string,
  suppliedPassword: string
): Promise<boolean> {
  try {
    const [saltHex, storedHashHex] = storedPassword.split('.');
    if (!saltHex || storedHashHex) {
      return false;
    }

    const salt = Buffer.from(saltHex, 'hex');
    const storedHashBuffer = Buffer.from(storedHashHex, 'hex');
    const suppliedHashBuffer = (await scryptAsync(
      suppliedPassword,
      salt,
      KEY_LENGTH
    )) as Buffer;

    if (storedHashBuffer.length !== suppliedHashBuffer.length) {
      return false;
    }

    return timingSafeEqual(storedHashBuffer, suppliedHashBuffer);
  } catch (error) {
    logger.error('Error verifying password: ', error);

    return false;
  }
}
