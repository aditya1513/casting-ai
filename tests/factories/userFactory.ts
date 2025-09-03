import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface UserFactoryOptions {
  role?: 'ACTOR' | 'CASTING_DIRECTOR' | 'PRODUCER' | 'AGENT' | 'ADMIN';
  verified?: boolean;
  twoFactorEnabled?: boolean;
  customData?: Record<string, any>;
}

export class UserFactory {
  static async create(options: UserFactoryOptions = {}) {
    const password = faker.internet.password({ length: 12 });
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const userData = {
      email: faker.internet.email().toLowerCase(),
      password: hashedPassword,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      role: options.role || 'ACTOR',
      verified: options.verified ?? true,
      twoFactorEnabled: options.twoFactorEnabled ?? false,
      profilePicture: faker.image.avatar(),
      phoneNumber: faker.phone.number('+91##########'),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...options.customData
    };

    const user = await prisma.user.create({
      data: userData
    });

    return {
      ...user,
      plainPassword: password // Return plain password for testing
    };
  }

  static async createMany(count: number, options: UserFactoryOptions = {}) {
    const users = [];
    for (let i = 0; i < count; i++) {
      const user = await this.create(options);
      users.push(user);
    }
    return users;
  }

  static async createWithProfile(options: UserFactoryOptions = {}) {
    const user = await this.create(options);
    
    let profileData: any = {
      userId: user.id,
      bio: faker.person.bio(),
      location: faker.location.city() + ', ' + faker.location.country(),
      website: faker.internet.url(),
      socialLinks: {
        linkedin: faker.internet.url(),
        twitter: faker.internet.url(),
        instagram: faker.internet.url()
      }
    };

    // Add role-specific profile data
    if (user.role === 'ACTOR') {
      profileData = {
        ...profileData,
        height: faker.number.int({ min: 150, max: 200 }),
        weight: faker.number.int({ min: 45, max: 100 }),
        age: faker.number.int({ min: 18, max: 65 }),
        languages: ['Hindi', 'English', 'Marathi'].slice(0, faker.number.int({ min: 1, max: 3 })),
        skills: ['Acting', 'Dancing', 'Singing'].slice(0, faker.number.int({ min: 1, max: 3 })),
        experience: faker.number.int({ min: 0, max: 20 }) + ' years',
        unionMembership: faker.datatype.boolean(),
        availability: {
          fromDate: faker.date.future(),
          toDate: faker.date.future({ years: 1 })
        }
      };
    } else if (user.role === 'CASTING_DIRECTOR') {
      profileData = {
        ...profileData,
        company: faker.company.name(),
        position: 'Senior Casting Director',
        yearsOfExperience: faker.number.int({ min: 5, max: 25 }),
        specializations: ['TV Series', 'Films', 'Web Series'].slice(0, faker.number.int({ min: 1, max: 3 })),
        notableProjects: Array.from({ length: 3 }, () => ({
          title: faker.lorem.words(3),
          year: faker.date.past({ years: 5 }).getFullYear(),
          role: 'Casting Director'
        }))
      };
    } else if (user.role === 'PRODUCER') {
      profileData = {
        ...profileData,
        productionCompany: faker.company.name(),
        position: 'Executive Producer',
        yearsInIndustry: faker.number.int({ min: 10, max: 30 }),
        genres: ['Drama', 'Comedy', 'Action', 'Thriller'].slice(0, faker.number.int({ min: 2, max: 4 })),
        budget: faker.helpers.arrayElement(['Low', 'Medium', 'High', 'Premium']),
        currentProjects: faker.number.int({ min: 1, max: 5 })
      };
    }

    const profile = await prisma.profile.create({
      data: profileData
    });

    return {
      user: { ...user, plainPassword: user.plainPassword },
      profile
    };
  }

  static async createWithSession(options: UserFactoryOptions = {}) {
    const user = await this.create(options);
    const sessionToken = faker.string.uuid();
    
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        ipAddress: faker.internet.ip(),
        userAgent: faker.internet.userAgent()
      }
    });

    return {
      user: { ...user, plainPassword: user.plainPassword },
      session,
      sessionToken
    };
  }

  static async createWithOAuth(provider: 'google' | 'github', options: UserFactoryOptions = {}) {
    const user = await this.create({ ...options, password: null });
    
    const oauthAccount = await prisma.oAuthAccount.create({
      data: {
        userId: user.id,
        provider: provider,
        providerAccountId: faker.string.uuid(),
        accessToken: faker.string.alphanumeric(40),
        refreshToken: faker.string.alphanumeric(40),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }
    });

    return {
      user,
      oauthAccount
    };
  }

  static generateMockUserData(options: UserFactoryOptions = {}) {
    return {
      email: faker.internet.email().toLowerCase(),
      password: faker.internet.password({ length: 12 }),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      role: options.role || 'ACTOR',
      phoneNumber: faker.phone.number('+91##########'),
      ...options.customData
    };
  }

  static async cleanup(userId?: string) {
    if (userId) {
      await prisma.user.delete({ where: { id: userId } });
    } else {
      // Clean all test users (be careful with this in production!)
      await prisma.user.deleteMany({
        where: {
          email: { contains: '@example' }
        }
      });
    }
  }
}