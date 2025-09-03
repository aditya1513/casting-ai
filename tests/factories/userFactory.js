"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserFactory = void 0;
const faker_1 = require("@faker-js/faker");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class UserFactory {
    static async create(options = {}) {
        const password = faker_1.faker.internet.password({ length: 12 });
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const userData = {
            email: faker_1.faker.internet.email().toLowerCase(),
            password: hashedPassword,
            firstName: faker_1.faker.person.firstName(),
            lastName: faker_1.faker.person.lastName(),
            role: options.role || 'ACTOR',
            verified: options.verified ?? true,
            twoFactorEnabled: options.twoFactorEnabled ?? false,
            profilePicture: faker_1.faker.image.avatar(),
            phoneNumber: faker_1.faker.phone.number('+91##########'),
            createdAt: new Date(),
            updatedAt: new Date(),
            ...options.customData
        };
        const user = await prisma.user.create({
            data: userData
        });
        return {
            ...user,
            plainPassword: password
        };
    }
    static async createMany(count, options = {}) {
        const users = [];
        for (let i = 0; i < count; i++) {
            const user = await this.create(options);
            users.push(user);
        }
        return users;
    }
    static async createWithProfile(options = {}) {
        const user = await this.create(options);
        let profileData = {
            userId: user.id,
            bio: faker_1.faker.person.bio(),
            location: faker_1.faker.location.city() + ', ' + faker_1.faker.location.country(),
            website: faker_1.faker.internet.url(),
            socialLinks: {
                linkedin: faker_1.faker.internet.url(),
                twitter: faker_1.faker.internet.url(),
                instagram: faker_1.faker.internet.url()
            }
        };
        if (user.role === 'ACTOR') {
            profileData = {
                ...profileData,
                height: faker_1.faker.number.int({ min: 150, max: 200 }),
                weight: faker_1.faker.number.int({ min: 45, max: 100 }),
                age: faker_1.faker.number.int({ min: 18, max: 65 }),
                languages: ['Hindi', 'English', 'Marathi'].slice(0, faker_1.faker.number.int({ min: 1, max: 3 })),
                skills: ['Acting', 'Dancing', 'Singing'].slice(0, faker_1.faker.number.int({ min: 1, max: 3 })),
                experience: faker_1.faker.number.int({ min: 0, max: 20 }) + ' years',
                unionMembership: faker_1.faker.datatype.boolean(),
                availability: {
                    fromDate: faker_1.faker.date.future(),
                    toDate: faker_1.faker.date.future({ years: 1 })
                }
            };
        }
        else if (user.role === 'CASTING_DIRECTOR') {
            profileData = {
                ...profileData,
                company: faker_1.faker.company.name(),
                position: 'Senior Casting Director',
                yearsOfExperience: faker_1.faker.number.int({ min: 5, max: 25 }),
                specializations: ['TV Series', 'Films', 'Web Series'].slice(0, faker_1.faker.number.int({ min: 1, max: 3 })),
                notableProjects: Array.from({ length: 3 }, () => ({
                    title: faker_1.faker.lorem.words(3),
                    year: faker_1.faker.date.past({ years: 5 }).getFullYear(),
                    role: 'Casting Director'
                }))
            };
        }
        else if (user.role === 'PRODUCER') {
            profileData = {
                ...profileData,
                productionCompany: faker_1.faker.company.name(),
                position: 'Executive Producer',
                yearsInIndustry: faker_1.faker.number.int({ min: 10, max: 30 }),
                genres: ['Drama', 'Comedy', 'Action', 'Thriller'].slice(0, faker_1.faker.number.int({ min: 2, max: 4 })),
                budget: faker_1.faker.helpers.arrayElement(['Low', 'Medium', 'High', 'Premium']),
                currentProjects: faker_1.faker.number.int({ min: 1, max: 5 })
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
    static async createWithSession(options = {}) {
        const user = await this.create(options);
        const sessionToken = faker_1.faker.string.uuid();
        const session = await prisma.session.create({
            data: {
                userId: user.id,
                token: sessionToken,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                ipAddress: faker_1.faker.internet.ip(),
                userAgent: faker_1.faker.internet.userAgent()
            }
        });
        return {
            user: { ...user, plainPassword: user.plainPassword },
            session,
            sessionToken
        };
    }
    static async createWithOAuth(provider, options = {}) {
        const user = await this.create({ ...options, password: null });
        const oauthAccount = await prisma.oAuthAccount.create({
            data: {
                userId: user.id,
                provider: provider,
                providerAccountId: faker_1.faker.string.uuid(),
                accessToken: faker_1.faker.string.alphanumeric(40),
                refreshToken: faker_1.faker.string.alphanumeric(40),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
        });
        return {
            user,
            oauthAccount
        };
    }
    static generateMockUserData(options = {}) {
        return {
            email: faker_1.faker.internet.email().toLowerCase(),
            password: faker_1.faker.internet.password({ length: 12 }),
            firstName: faker_1.faker.person.firstName(),
            lastName: faker_1.faker.person.lastName(),
            role: options.role || 'ACTOR',
            phoneNumber: faker_1.faker.phone.number('+91##########'),
            ...options.customData
        };
    }
    static async cleanup(userId) {
        if (userId) {
            await prisma.user.delete({ where: { id: userId } });
        }
        else {
            await prisma.user.deleteMany({
                where: {
                    email: { contains: '@example' }
                }
            });
        }
    }
}
exports.UserFactory = UserFactory;
//# sourceMappingURL=userFactory.js.map