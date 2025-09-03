"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectFactory = void 0;
const faker_1 = require("@faker-js/faker");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class ProjectFactory {
    static async create(options = {}) {
        const projectData = {
            title: faker_1.faker.lorem.words(3),
            description: faker_1.faker.lorem.paragraphs(2),
            type: options.type || faker_1.faker.helpers.arrayElement(['FILM', 'TV_SERIES', 'WEB_SERIES']),
            genre: faker_1.faker.helpers.arrayElements(['Drama', 'Comedy', 'Action', 'Thriller', 'Romance'], 2),
            budget: faker_1.faker.number.int({ min: 1000000, max: 100000000 }),
            startDate: faker_1.faker.date.future(),
            endDate: faker_1.faker.date.future({ years: 1 }),
            status: options.status || 'CASTING',
            producerId: options.producerId || faker_1.faker.string.uuid(),
            productionCompany: faker_1.faker.company.name(),
            shootingLocations: [
                faker_1.faker.location.city() + ', Maharashtra',
                faker_1.faker.location.city() + ', Gujarat'
            ],
            languages: ['Hindi', 'English'],
            synopsis: faker_1.faker.lorem.paragraphs(3),
            targetAudience: faker_1.faker.helpers.arrayElement(['General', '18+', 'Family', 'Youth']),
            distributionPlatform: faker_1.faker.helpers.arrayElements(['Netflix', 'Amazon Prime', 'Disney+ Hotstar', 'Theatre'], 2),
            createdAt: new Date(),
            updatedAt: new Date(),
            ...options.customData
        };
        return await prisma.project.create({
            data: projectData
        });
    }
    static async createWithRoles(options = {}) {
        const project = await this.create(options);
        const roles = await Promise.all(Array.from({ length: faker_1.faker.number.int({ min: 3, max: 8 }) }, async () => {
            return await prisma.role.create({
                data: {
                    projectId: project.id,
                    title: faker_1.faker.person.jobTitle(),
                    description: faker_1.faker.lorem.paragraph(),
                    characterName: faker_1.faker.person.firstName(),
                    roleType: faker_1.faker.helpers.arrayElement(['LEAD', 'SUPPORTING', 'CAMEO', 'EXTRA']),
                    gender: faker_1.faker.helpers.arrayElement(['MALE', 'FEMALE', 'ANY']),
                    ageRange: {
                        min: faker_1.faker.number.int({ min: 18, max: 30 }),
                        max: faker_1.faker.number.int({ min: 31, max: 65 })
                    },
                    ethnicityPreference: faker_1.faker.helpers.arrayElement(['Any', 'Indian', 'Caucasian', 'Asian']),
                    languageRequirements: ['Hindi', 'English'],
                    compensation: {
                        type: faker_1.faker.helpers.arrayElement(['PAID', 'UNPAID', 'DEFERRED']),
                        amount: faker_1.faker.number.int({ min: 10000, max: 1000000 }),
                        currency: 'INR'
                    },
                    shootingDates: {
                        start: faker_1.faker.date.future(),
                        end: faker_1.faker.date.future({ years: 1 })
                    },
                    auditionDeadline: faker_1.faker.date.future({ years: 0.5 }),
                    status: 'OPEN'
                }
            });
        }));
        return {
            project,
            roles
        };
    }
    static async createWithAuditions(options = {}) {
        const { project, roles } = await this.createWithRoles(options);
        const auditions = [];
        for (const role of roles) {
            const auditionCount = faker_1.faker.number.int({ min: 5, max: 15 });
            for (let i = 0; i < auditionCount; i++) {
                const audition = await prisma.audition.create({
                    data: {
                        roleId: role.id,
                        actorId: options.actorIds?.[i] || faker_1.faker.string.uuid(),
                        projectId: project.id,
                        scheduledDate: faker_1.faker.date.future({ years: 0.25 }),
                        timeSlot: faker_1.faker.helpers.arrayElement(['09:00-10:00', '10:00-11:00', '14:00-15:00', '16:00-17:00']),
                        location: faker_1.faker.location.streetAddress() + ', Mumbai',
                        type: faker_1.faker.helpers.arrayElement(['IN_PERSON', 'VIRTUAL', 'SELF_TAPE']),
                        status: faker_1.faker.helpers.arrayElement(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
                        notes: faker_1.faker.lorem.sentence(),
                        videoUrl: faker_1.faker.helpers.maybe(() => faker_1.faker.internet.url(), { probability: 0.3 }),
                        rating: faker_1.faker.helpers.maybe(() => faker_1.faker.number.int({ min: 1, max: 5 }), { probability: 0.5 }),
                        feedback: faker_1.faker.helpers.maybe(() => faker_1.faker.lorem.paragraph(), { probability: 0.5 })
                    }
                });
                auditions.push(audition);
            }
        }
        return {
            project,
            roles,
            auditions
        };
    }
    static async createMany(count, options = {}) {
        const projects = [];
        for (let i = 0; i < count; i++) {
            const project = await this.create(options);
            projects.push(project);
        }
        return projects;
    }
    static generateMockProjectData(options = {}) {
        return {
            title: faker_1.faker.lorem.words(3),
            description: faker_1.faker.lorem.paragraphs(2),
            type: options.type || faker_1.faker.helpers.arrayElement(['FILM', 'TV_SERIES', 'WEB_SERIES']),
            genre: faker_1.faker.helpers.arrayElements(['Drama', 'Comedy', 'Action', 'Thriller'], 2),
            budget: faker_1.faker.number.int({ min: 1000000, max: 100000000 }),
            startDate: faker_1.faker.date.future().toISOString(),
            endDate: faker_1.faker.date.future({ years: 1 }).toISOString(),
            status: options.status || 'CASTING',
            productionCompany: faker_1.faker.company.name(),
            shootingLocations: [faker_1.faker.location.city()],
            languages: ['Hindi', 'English'],
            ...options.customData
        };
    }
    static async cleanup(projectId) {
        if (projectId) {
            await prisma.project.delete({ where: { id: projectId } });
        }
        else {
            await prisma.project.deleteMany({
                where: {
                    title: { contains: 'Test' }
                }
            });
        }
    }
}
exports.ProjectFactory = ProjectFactory;
//# sourceMappingURL=projectFactory.js.map