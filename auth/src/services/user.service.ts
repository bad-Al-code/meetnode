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

interface GitHubUserData {
  id: number;
  login: string;
  name?: string | null;
  email: string;
  avatar_url?: string;
}

export async function findOrCreateUserForGithub(
  githubUser: GitHubUserData
): Promise<SelectUser> {
  const providerId: (typeof oauthProviders)[number] = 'github';
  const providerUserId = String(githubUser.id);
  const verifiedEmail = githubUser.email;

  try {
    const user = await db.transaction(async (tx) => {
      const existingOAuthAccount = await tx.query.oauthAccounts.findFirst({
        where: and(
          eq(oauthAccounts.providerId, providerId),
          eq(oauthAccounts.providerUserId, providerUserId)
        ),
        with: {
          user: true,
        },
      });

      if (existingOAuthAccount?.user) {
        if (!existingOAuthAccount.user) {
          logger.error(
            `OAuth account ${existingOAuthAccount.providerUserId} found but related user data is missing.`
          );

          throw new InternalServerError(
            'Failed to retrieve user details for linked GitHub account.'
          );
        }
        return existingOAuthAccount.user;
      }

      const existingUserByEmail = await tx.query.users.findFirst({
        where: eq(users.email, verifiedEmail),
      });

      if (existingUserByEmail) {
        await tx.insert(oauthAccounts).values({
          providerId: providerId,
          providerUserId: providerUserId,
          userId: existingUserByEmail.id,
        });

        return existingUserByEmail;
      }

      const newUserInput: InsertUser = {
        email: verifiedEmail,
        username: githubUser.login,
        hashedPassword: null,
        role: 'user',
        acceptedTerms: true,
      };

      let finalUsername = newUserInput.username;
      try {
        await tx.insert(users).values(newUserInput);
      } catch (insertError: any) {
        if (
          insertError.code === 'ER_DUP_ENTRY' &&
          insertError.message.includes('users.username')
        ) {
          logger.warn(
            `Username conflict for ${newUserInput.username}. Appending random suffix.`
          );

          finalUsername = `${newUserInput.username}_${randomBytes(4).toString('hex')}`;
          newUserInput.username = finalUsername;

          await tx.insert(users).values(newUserInput);
        } else {
          throw insertError;
        }
      }

      const newlyCreatedUser = await tx.query.users.findFirst({
        where: eq(users.email, verifiedEmail),
      });

      if (!newlyCreatedUser) {
        throw new InternalServerError(
          'Failed to verify new user creation during GitHub signup.'
        );
      }

      await tx.insert(oauthAccounts).values({
        providerId: providerId,
        providerUserId: providerUserId,
        userId: newlyCreatedUser.id,
      });

      logger.info(
        `Successfully linked GitHub account ${providerUserId} to new user ${newlyCreatedUser.id}`
      );
      return newlyCreatedUser;
    });

    return user;
  } catch (error: any) {
    logger.error(
      { err: error },
      `Error in findOrCreateUserForGithub for GitHub ID: ${providerUserId}`
    );
    // Handle specific errors like ConflictError if necessary, otherwise wrap as InternalServerError
    if (error instanceof BaseError) {
      // Includes ConflictError, BadRequestError etc.
      throw error; // Re-throw known errors
    }
    throw new InternalServerError(
      'Failed to process GitHub user association due to a database error.'
    );
  }
}
