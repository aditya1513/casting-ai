import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ProjectFactoryOptions {
  producerId?: string;
  status?: 'DRAFT' | 'ACTIVE' | 'CASTING' | 'IN_PRODUCTION' | 'COMPLETED' | 'CANCELLED';
  type?: 'FILM' | 'TV_SERIES' | 'WEB_SERIES' | 'COMMERCIAL' | 'THEATRE';
  customData?: Record<string, any>;
}

export class ProjectFactory {
  static async create(options: ProjectFactoryOptions = {}) {
    const projectData = {
      title: faker.lorem.words(3),
      description: faker.lorem.paragraphs(2),
      type: options.type || faker.helpers.arrayElement(['FILM', 'TV_SERIES', 'WEB_SERIES']),
      genre: faker.helpers.arrayElements(['Drama', 'Comedy', 'Action', 'Thriller', 'Romance'], 2),
      budget: faker.number.int({ min: 1000000, max: 100000000 }),
      startDate: faker.date.future(),
      endDate: faker.date.future({ years: 1 }),
      status: options.status || 'CASTING',
      producerId: options.producerId || faker.string.uuid(),
      productionCompany: faker.company.name(),
      shootingLocations: [
        faker.location.city() + ', Maharashtra',
        faker.location.city() + ', Gujarat'
      ],
      languages: ['Hindi', 'English'],
      synopsis: faker.lorem.paragraphs(3),
      targetAudience: faker.helpers.arrayElement(['General', '18+', 'Family', 'Youth']),
      distributionPlatform: faker.helpers.arrayElements(['Netflix', 'Amazon Prime', 'Disney+ Hotstar', 'Theatre'], 2),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...options.customData
    };

    return await prisma.project.create({
      data: projectData
    });
  }

  static async createWithRoles(options: ProjectFactoryOptions = {}) {
    const project = await this.create(options);
    
    const roles = await Promise.all(
      Array.from({ length: faker.number.int({ min: 3, max: 8 }) }, async () => {
        return await prisma.role.create({
          data: {
            projectId: project.id,
            title: faker.person.jobTitle(),
            description: faker.lorem.paragraph(),
            characterName: faker.person.firstName(),
            roleType: faker.helpers.arrayElement(['LEAD', 'SUPPORTING', 'CAMEO', 'EXTRA']),
            gender: faker.helpers.arrayElement(['MALE', 'FEMALE', 'ANY']),
            ageRange: {
              min: faker.number.int({ min: 18, max: 30 }),
              max: faker.number.int({ min: 31, max: 65 })
            },
            ethnicityPreference: faker.helpers.arrayElement(['Any', 'Indian', 'Caucasian', 'Asian']),
            languageRequirements: ['Hindi', 'English'],
            compensation: {
              type: faker.helpers.arrayElement(['PAID', 'UNPAID', 'DEFERRED']),
              amount: faker.number.int({ min: 10000, max: 1000000 }),
              currency: 'INR'
            },
            shootingDates: {
              start: faker.date.future(),
              end: faker.date.future({ years: 1 })
            },
            auditionDeadline: faker.date.future({ years: 0.5 }),
            status: 'OPEN'
          }
        });
      })
    );

    return {
      project,
      roles
    };
  }

  static async createWithAuditions(options: ProjectFactoryOptions & { actorIds?: string[] } = {}) {
    const { project, roles } = await this.createWithRoles(options);
    
    const auditions = [];
    for (const role of roles) {
      const auditionCount = faker.number.int({ min: 5, max: 15 });
      for (let i = 0; i < auditionCount; i++) {
        const audition = await prisma.audition.create({
          data: {
            roleId: role.id,
            actorId: options.actorIds?.[i] || faker.string.uuid(),
            projectId: project.id,
            scheduledDate: faker.date.future({ years: 0.25 }),
            timeSlot: faker.helpers.arrayElement(['09:00-10:00', '10:00-11:00', '14:00-15:00', '16:00-17:00']),
            location: faker.location.streetAddress() + ', Mumbai',
            type: faker.helpers.arrayElement(['IN_PERSON', 'VIRTUAL', 'SELF_TAPE']),
            status: faker.helpers.arrayElement(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
            notes: faker.lorem.sentence(),
            videoUrl: faker.helpers.maybe(() => faker.internet.url(), { probability: 0.3 }),
            rating: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 5 }), { probability: 0.5 }),
            feedback: faker.helpers.maybe(() => faker.lorem.paragraph(), { probability: 0.5 })
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

  static async createMany(count: number, options: ProjectFactoryOptions = {}) {
    const projects = [];
    for (let i = 0; i < count; i++) {
      const project = await this.create(options);
      projects.push(project);
    }
    return projects;
  }

  static generateMockProjectData(options: ProjectFactoryOptions = {}) {
    return {
      title: faker.lorem.words(3),
      description: faker.lorem.paragraphs(2),
      type: options.type || faker.helpers.arrayElement(['FILM', 'TV_SERIES', 'WEB_SERIES']),
      genre: faker.helpers.arrayElements(['Drama', 'Comedy', 'Action', 'Thriller'], 2),
      budget: faker.number.int({ min: 1000000, max: 100000000 }),
      startDate: faker.date.future().toISOString(),
      endDate: faker.date.future({ years: 1 }).toISOString(),
      status: options.status || 'CASTING',
      productionCompany: faker.company.name(),
      shootingLocations: [faker.location.city()],
      languages: ['Hindi', 'English'],
      ...options.customData
    };
  }

  static async cleanup(projectId?: string) {
    if (projectId) {
      await prisma.project.delete({ where: { id: projectId } });
    } else {
      // Clean all test projects
      await prisma.project.deleteMany({
        where: {
          title: { contains: 'Test' }
        }
      });
    }
  }
}