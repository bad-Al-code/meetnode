import { randomBytes } from 'node:crypto';
import { and, eq, or } from 'drizzle-orm';

import logger from '@/config/logger';
import { db } from '@/db';
import {
  InsertUser,
  oauthAccounts,
  oauthProviders,
  SelectUser,
  users,
} from '@/db/schema';
import { hashPassword } from '@/utils/hash';
import { BaseError, ConflictError, InternalServerError } from '@/utils/errors';

type CreateUserInput = Omit<
  InsertUser,
  'id' | 'hashedPassword' | 'role' | 'createdAt' | 'updatedAt'
> & { password: string };

type CreateUserOutput = Omit<SelectUser, 'hashedPassword'>;

export async function checkExistingUser(
  email: string,
  username?: string | null
): Promise<void> {
  try {
    const whereCondition = username
      ? or(eq(users.email, email), eq(users.username, username))
      : eq(users.email, email);

    const existingUser = await db.query.users.findFirst({
      where: whereCondition,
      columns: { email: true, username: true },
    });

    if (existingUser) {
      let conflictField = '';
      if (existingUser.email === email) {
        conflictField = 'email';
      } else if (username && existingUser.username === username) {
        conflictField = 'username';
      }

      if (conflictField) {
        const message = `An account with this ${conflictField} already exists.`;
        logger.warn(
          `User creation conflict for ${email}: ${conflictField} '${
            conflictField === 'email' ? email : username
          }' already exists.`
        );
        throw new ConflictError(message);
      }
    }
  } catch (error) {
    if (error instanceof ConflictError) {
      throw error;
    }

    logger.error(
      { err: error },
      `Database error checking user existence for email: ${email}`
    );
    throw new InternalServerError(
      'Failed to check user details due to a server issue. Please try again later.'
    );
  }
}

export async function getHashedPassword(
  password: string,
  email: string
): Promise<string> {
  try {
    return await hashPassword(password);
  } catch (error) {
    logger.error({ err: error }, `Failed to hash password for user: ${email}`);
    throw new InternalServerError(
      'Failed to securely process registration. Please try again later.'
    );
  }
}

export async function insertNewUser(
  newUserInput: InsertUser
): Promise<CreateUserOutput> {
  try {
    const insertResult = await db.insert(users).values(newUserInput);

    const createdUser = await db.query.users.findFirst({
      where: eq(users.email, newUserInput.email),
      columns: {
        id: true,
        email: true,
        username: true,
        role: true,
        acceptedTerms: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!createdUser) {
      logger.error(
        `Failed to fetch user record immediately after insertion for email: ${newUserInput.email}`
      );

      throw new InternalServerError(
        'Failed to verify user creation. Please try again.'
      );
    }

    return createdUser;
  } catch (error: any) {
    if (error.code === '23505' || error.code === 'ER_DUP_ENTRY') {
      logger.warn(
        {
          err: { code: error.code, message: error.message },
          email: newUserInput.email,
          username: newUserInput.username,
        },
        `Database unique constraint violation during user creation.`
      );
      throw new ConflictError(
        'This email or username is already registered (conflict detected during save).'
      );
    }

    logger.error(
      { err: error },
      `Database error inserting user: ${newUserInput.email}`
    );
    throw new InternalServerError(
      'Failed to save user registration due to a database error.'
    );
  }
}

export async function createUser(
  userData: CreateUserInput
): Promise<CreateUserOutput> {
  const { email, username, password, acceptedTerms } = userData;

  await checkExistingUser(email, username);

  const hashedPassword = await getHashedPassword(password, email);

  const newUser: InsertUser = {
    email,
    username: username || null,
    hashedPassword,
    acceptedTerms,
  };

  const createdUser = await insertNewUser(newUser);

  return createdUser;
}

export async function findUserByEmail(
  email: string
): Promise<SelectUser | null> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      logger.debug(`User not found with emai: ${email}`);
      return null;
    }

    return user;
  } catch (error) {
    logger.error(
      { err: error },
      `Database error finding user by email: ${email}`
    );

    throw new InternalServerError(
      'Failed to retrieve user data due to a database error.'
    );
  }
}
