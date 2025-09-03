/**
 * Social Authentication Service
 * Handles OAuth authentication with Google, GitHub, and other providers
 */

import { prisma } from '../config/database';
import { CacheManager } from '../config/redis';
import {
  generateAccessToken,
  generateRefreshToken,
  generateSessionId,
} from '../utils/jwt';
import {
  AppError,
  AuthenticationError,
  ConflictError,
  ValidationError,
} from '../utils/errors';
import { logger } from '../utils/logger';
import { UserRole, AuthProvider } from '@prisma/client';

interface SocialProfile {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  provider: AuthProvider;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  profile?: any;
}

interface SocialAuthResponse {
  user: {
    id: string;
    email: string;
    role: UserRole;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    isEmailVerified: boolean;
    socialAccounts: Array<{
      provider: AuthProvider;
      isLinked: boolean;
    }>;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  isNewUser: boolean;
}

export class SocialAuthService {
  /**
   * Authenticate or register user via social provider
   */
  async authenticateWithProvider(
    profile: SocialProfile,
    role: UserRole = UserRole.ACTOR
  ): Promise<SocialAuthResponse> {
    try {
      // Check if social account already exists
      const existingSocialAccount = await prisma.socialAccount.findUnique({
        where: {
          provider_providerUserId: {
            provider: profile.provider,
            providerUserId: profile.id,
          },
        },
        include: {
          user: {
            include: {
              socialAccounts: {
                select: {
                  provider: true,
                  isLinked: true,
                },
              },
            },
          },
        },
      });

      if (existingSocialAccount?.user) {
        // User exists, update social account and login
        await prisma.socialAccount.update({
          where: {
            id: existingSocialAccount.id,
          },
          data: {
            accessToken: profile.accessToken,
            refreshToken: profile.refreshToken,
            tokenExpiry: profile.tokenExpiry,
            lastUsed: new Date(),
            profile: profile.profile,
          },
        });

        // Update user last login
        await prisma.user.update({
          where: { id: existingSocialAccount.user.id },
          data: {
            lastLoginAt: new Date(),
            failedLoginAttempts: 0,
            accountLockedUntil: null,
          },
        });

        // Generate tokens
        const sessionId = generateSessionId();
        const accessToken = generateAccessToken({
          userId: existingSocialAccount.user.id,
          email: existingSocialAccount.user.email,
          role: existingSocialAccount.user.role,
          sessionId,
        });
        const refreshToken = generateRefreshToken({
          userId: existingSocialAccount.user.id,
          sessionId,
        });

        // Cache session
        await CacheManager.setSession(sessionId, {
          userId: existingSocialAccount.user.id,
          email: existingSocialAccount.user.email,
          role: existingSocialAccount.user.role,
        });

        // Create audit log
        await prisma.auditLog.create({
          data: {
            userId: existingSocialAccount.user.id,
            action: 'social_login',
            resource: 'user',
            resourceId: existingSocialAccount.user.id,
            status: 'success',
            metadata: {
              provider: profile.provider,
            },
          },
        });

        logger.info('Social login successful', {
          userId: existingSocialAccount.user.id,
          provider: profile.provider,
        });

        return {
          user: {
            id: existingSocialAccount.user.id,
            email: existingSocialAccount.user.email,
            role: existingSocialAccount.user.role,
            firstName: existingSocialAccount.user.firstName || undefined,
            lastName: existingSocialAccount.user.lastName || undefined,
            avatar: existingSocialAccount.user.avatar || undefined,
            isEmailVerified: existingSocialAccount.user.isEmailVerified,
            socialAccounts: existingSocialAccount.user.socialAccounts,
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: 3600,
          },
          isNewUser: false,
        };
      }

      // Check if email already exists with different provider
      const existingUser = profile.email
        ? await prisma.user.findUnique({
            where: { email: profile.email },
            include: {
              socialAccounts: {
                select: {
                  provider: true,
                  isLinked: true,
                },
              },
            },
          })
        : null;

      if (existingUser) {
        // Link social account to existing user
        await prisma.socialAccount.create({
          data: {
            userId: existingUser.id,
            provider: profile.provider,
            providerUserId: profile.id,
            email: profile.email,
            name: profile.name,
            avatar: profile.avatar,
            accessToken: profile.accessToken,
            refreshToken: profile.refreshToken,
            tokenExpiry: profile.tokenExpiry,
            profile: profile.profile,
            lastUsed: new Date(),
          },
        });

        // Update user profile if missing data
        const updateData: any = {
          lastLoginAt: new Date(),
          isEmailVerified: true, // Trust social provider email verification
          failedLoginAttempts: 0,
          accountLockedUntil: null,
        };

        if (!existingUser.firstName && profile.firstName) {
          updateData.firstName = profile.firstName;
        }
        if (!existingUser.lastName && profile.lastName) {
          updateData.lastName = profile.lastName;
        }
        if (!existingUser.avatar && profile.avatar) {
          updateData.avatar = profile.avatar;
        }

        await prisma.user.update({
          where: { id: existingUser.id },
          data: updateData,
        });

        // Generate tokens
        const sessionId = generateSessionId();
        const accessToken = generateAccessToken({
          userId: existingUser.id,
          email: existingUser.email,
          role: existingUser.role,
          sessionId,
        });
        const refreshToken = generateRefreshToken({
          userId: existingUser.id,
          sessionId,
        });

        // Cache session
        await CacheManager.setSession(sessionId, {
          userId: existingUser.id,
          email: existingUser.email,
          role: existingUser.role,
        });

        // Create audit log
        await prisma.auditLog.create({
          data: {
            userId: existingUser.id,
            action: 'social_account_linked',
            resource: 'user',
            resourceId: existingUser.id,
            status: 'success',
            metadata: {
              provider: profile.provider,
            },
          },
        });

        logger.info('Social account linked to existing user', {
          userId: existingUser.id,
          provider: profile.provider,
        });

        return {
          user: {
            id: existingUser.id,
            email: existingUser.email,
            role: existingUser.role,
            firstName: updateData.firstName || existingUser.firstName || undefined,
            lastName: updateData.lastName || existingUser.lastName || undefined,
            avatar: updateData.avatar || existingUser.avatar || undefined,
            isEmailVerified: true,
            socialAccounts: [
              ...existingUser.socialAccounts,
              {
                provider: profile.provider,
                isLinked: true,
              },
            ],
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: 3600,
          },
          isNewUser: false,
        };
      }

      // Create new user with social account
      const newUser = await prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            email: profile.email || `${profile.id}@${profile.provider.toLowerCase()}.local`,
            role,
            firstName: profile.firstName,
            lastName: profile.lastName,
            avatar: profile.avatar,
            isEmailVerified: !!profile.email, // Trust social provider email
            lastLoginAt: new Date(),
            socialAccounts: {
              create: {
                provider: profile.provider,
                providerUserId: profile.id,
                email: profile.email,
                name: profile.name,
                avatar: profile.avatar,
                accessToken: profile.accessToken,
                refreshToken: profile.refreshToken,
                tokenExpiry: profile.tokenExpiry,
                profile: profile.profile,
                lastUsed: new Date(),
              },
            },
          },
          include: {
            socialAccounts: {
              select: {
                provider: true,
                isLinked: true,
              },
            },
          },
        });

        // Create role-specific profile
        switch (role) {
          case UserRole.ACTOR:
            await tx.actor.create({
              data: {
                userId: user.id,
                stageName: profile.name || 'New Actor',
              },
            });
            break;
          case UserRole.CASTING_DIRECTOR:
            await tx.castingDirector.create({
              data: {
                userId: user.id,
                company: 'Independent',
              },
            });
            break;
          case UserRole.PRODUCER:
            await tx.producer.create({
              data: {
                userId: user.id,
                company: 'Independent',
              },
            });
            break;
        }

        return user;
      });

      // Generate tokens
      const sessionId = generateSessionId();
      const accessToken = generateAccessToken({
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
        sessionId,
      });
      const refreshToken = generateRefreshToken({
        userId: newUser.id,
        sessionId,
      });

      // Cache session
      await CacheManager.setSession(sessionId, {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: newUser.id,
          action: 'social_registration',
          resource: 'user',
          resourceId: newUser.id,
          status: 'success',
          metadata: {
            provider: profile.provider,
          },
        },
      });

      logger.info('New user registered via social provider', {
        userId: newUser.id,
        provider: profile.provider,
      });

      return {
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          firstName: newUser.firstName || undefined,
          lastName: newUser.lastName || undefined,
          avatar: newUser.avatar || undefined,
          isEmailVerified: newUser.isEmailVerified,
          socialAccounts: newUser.socialAccounts,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 3600,
        },
        isNewUser: true,
      };
    } catch (error) {
      logger.error('Social authentication failed', error);
      throw new AppError('Social authentication failed', 500);
    }
  }

  /**
   * Link social account to existing user
   */
  async linkSocialAccount(
    userId: string,
    profile: SocialProfile
  ): Promise<void> {
    // Check if already linked
    const existingLink = await prisma.socialAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: profile.provider,
          providerUserId: profile.id,
        },
      },
    });

    if (existingLink) {
      if (existingLink.userId === userId) {
        throw new ConflictError('Social account already linked to your profile');
      } else {
        throw new ConflictError('Social account is linked to another user');
      }
    }

    // Check if user already has this provider linked
    const userProviderLink = await prisma.socialAccount.findFirst({
      where: {
        userId,
        provider: profile.provider,
      },
    });

    if (userProviderLink) {
      throw new ConflictError(`You already have a ${profile.provider} account linked`);
    }

    // Link the account
    await prisma.socialAccount.create({
      data: {
        userId,
        provider: profile.provider,
        providerUserId: profile.id,
        email: profile.email,
        name: profile.name,
        avatar: profile.avatar,
        accessToken: profile.accessToken,
        refreshToken: profile.refreshToken,
        tokenExpiry: profile.tokenExpiry,
        profile: profile.profile,
        lastUsed: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'social_account_linked',
        resource: 'social_account',
        status: 'success',
        metadata: {
          provider: profile.provider,
        },
      },
    });

    logger.info('Social account linked', {
      userId,
      provider: profile.provider,
    });
  }

  /**
   * Unlink social account from user
   */
  async unlinkSocialAccount(
    userId: string,
    provider: AuthProvider
  ): Promise<void> {
    // Check if user has password set
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        password: true,
        socialAccounts: true,
      },
    });

    if (!user) {
      throw new ValidationError('User not found');
    }

    // Prevent unlinking if it's the only auth method
    if (!user.password && user.socialAccounts.length <= 1) {
      throw new ValidationError(
        'Cannot unlink the only authentication method. Please set a password first.'
      );
    }

    // Find and delete the social account
    const socialAccount = await prisma.socialAccount.findFirst({
      where: {
        userId,
        provider,
      },
    });

    if (!socialAccount) {
      throw new ValidationError('Social account not linked');
    }

    await prisma.socialAccount.delete({
      where: {
        id: socialAccount.id,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'social_account_unlinked',
        resource: 'social_account',
        status: 'success',
        metadata: {
          provider,
        },
      },
    });

    logger.info('Social account unlinked', {
      userId,
      provider,
    });
  }

  /**
   * Get user's linked social accounts
   */
  async getLinkedAccounts(userId: string) {
    const accounts = await prisma.socialAccount.findMany({
      where: {
        userId,
        isLinked: true,
      },
      select: {
        provider: true,
        email: true,
        name: true,
        avatar: true,
        linkedAt: true,
        lastUsed: true,
      },
    });

    return accounts;
  }

  /**
   * Refresh social provider tokens
   */
  async refreshProviderTokens(
    userId: string,
    provider: AuthProvider,
    newTokens: {
      accessToken: string;
      refreshToken?: string;
      expiresIn?: number;
    }
  ): Promise<void> {
    const tokenExpiry = newTokens.expiresIn
      ? new Date(Date.now() + newTokens.expiresIn * 1000)
      : undefined;

    await prisma.socialAccount.updateMany({
      where: {
        userId,
        provider,
      },
      data: {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        tokenExpiry,
      },
    });

    logger.info('Social provider tokens refreshed', {
      userId,
      provider,
    });
  }
}

export const socialAuthService = new SocialAuthService();