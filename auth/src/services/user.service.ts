import { eq } from 'drizzle-orm';

import logger from '@/config/logger';
import { db } from '@/db';
import { InsertUser, SelectUser, users } from '@/db/schema';
import { hashPassword } from '@/utils/hash';
import { ConflictError, InternalServerError } from '@/utils/errors';

type CreateUserInput = Omit<
  InsertUser,
  'id' | 'hashedPassword' | 'role' | 'createdAt' | 'updatedAt'
> & { password: string };

type CreateUserOutput = Omit<SelectUser, 'hashedPassword'>;

export async function createUser(
  userData: CreateUserInput
): Promise<CreateUserOutput> {
  const { email, username, password, acceptedTerms } = userData;

  try {
    const exitingUser = await db.query.users.findFirst({
      where: username
        ? eq(users.email, email) || eq(users.username, username)
        : eq(users.email, email),
      columns: { email: true, username: true },
    });

    if (exitingUser) {
      if (exitingUser.email === email) {
        logger.warn(`Signup attempt failed: Email ${email} already exists.`);
        throw new ConflictError('An acount with this email already exists.');
      }

      if (username && exitingUser.username === username) {
        logger.warn(
          `Signup attempt failed: Username ${username} already exists.`
        );
        throw new ConflictError('An acount with this username already exists.');
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
      'Failed to check user existence. Please try again later.'
    );
  }

  let hashedPassword: string;
  try {
    hashedPassword = await hashPassword(password);
  } catch (error) {
    logger.error({ err: Error }, `Failed to hash password for users: ${email}`);

    throw new InternalServerError(
      'Failed to process registration securely. Please try again later.'
    );
  }

  const newUser: InsertUser = {
    email,
    username: username || null,
    hashedPassword,
    acceptedTerms,
  };

  try {
    const insertResult = await db.insert(users).values(newUser);

    const createdUser = await db.query.users.findFirst({
      where: eq(users.email, email),
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
        `Failed to fetch user record immediately after insertion for email: ${email}`
      );

      throw new InternalServerError(
        'Failed to verify user creation. Please try again.'
      );
    }

    return createdUser;
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') {
      logger.warn(
        `Database duplicate entry conflict during insert for email: ${email} (Possible race condition)`
      );
      throw new ConflictError(
        'This email or username is already registered (conflict during save).'
      );
    }

    logger.error({ err: error }, `Database error inserting user: ${email}`);
    throw new InternalServerError(
      'Failed to save user registration due to a database error.'
    );
  }
}
