/**
 * Database Seed Script
 * Seeds the database with initial data for development and testing
 */

import { PrismaClient, UserRole, Gender, ProjectStatus, ProjectType, AuthProvider } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// Helper function to generate random Indian names
const generateIndianName = () => {
  const firstNames = {
    male: ['Arjun', 'Raj', 'Vikram', 'Aditya', 'Rohit', 'Karan', 'Sahil', 'Nikhil', 'Varun', 'Akash'],
    female: ['Priya', 'Ananya', 'Kavya', 'Shruti', 'Neha', 'Pooja', 'Divya', 'Aishwarya', 'Deepika', 'Alia']
  };
  
  const lastNames = ['Sharma', 'Verma', 'Patel', 'Kumar', 'Singh', 'Gupta', 'Mehta', 'Joshi', 'Kapoor', 'Khan'];
  
  const gender = faker.helpers.arrayElement(['male', 'female']);
  const firstName = faker.helpers.arrayElement(firstNames[gender]);
  const lastName = faker.helpers.arrayElement(lastNames);
  
  return { firstName, lastName, gender: gender === 'male' ? Gender.MALE : Gender.FEMALE };
};

// Helper function to generate Mumbai locations
const generateMumbaiLocation = () => {
  const areas = ['Andheri', 'Bandra', 'Juhu', 'Versova', 'Goregaon', 'Malad', 'Powai', 'Lokhandwala', 'Khar', 'Santacruz'];
  const states = ['Maharashtra'];
  
  return {
    city: faker.helpers.arrayElement(areas) + ', Mumbai',
    state: faker.helpers.arrayElement(states),
  };
};

async function seedUsers() {
  console.log('🌱 Seeding users...');
  
  const hashedPassword = await bcrypt.hash('Test@123', 12);
  
  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@castmatch.com' },
    update: {},
    create: {
      email: 'admin@castmatch.com',
      password: hashedPassword,
      role: UserRole.ADMIN,
      firstName: 'Admin',
      lastName: 'CastMatch',
      isEmailVerified: true,
      isActive: true,
      username: 'admin',
    },
  });
  
  console.log('✅ Admin user created:', admin.email);
  
  // Create test casting director with social auth
  const castingDirector = await prisma.user.upsert({
    where: { email: 'karan.johar@dharma.com' },
    update: {},
    create: {
      email: 'karan.johar@dharma.com',
      password: hashedPassword,
      role: UserRole.CASTING_DIRECTOR,
      firstName: 'Karan',
      lastName: 'Johar',
      isEmailVerified: true,
      isActive: true,
      username: 'karanjohar',
      avatar: faker.image.avatar(),
      bio: 'Renowned filmmaker and casting director with over 20 years of experience in Bollywood.',
      castingDirector: {
        create: {
          firstName: 'Karan',
          lastName: 'Johar',
          companyName: 'Dharma Productions',
          designation: 'Chief Casting Director',
          bio: 'Leading the casting department at Dharma Productions',
          yearsOfExperience: 20,
          specializations: ['Lead Roles', 'Supporting Roles', 'Newcomers'],
          isVerified: true,
          rating: 4.8,
          totalReviews: 156,
        },
      },
      socialAccounts: {
        create: {
          provider: AuthProvider.GOOGLE,
          providerUserId: 'google_karan_123',
          email: 'karan.johar@dharma.com',
          name: 'Karan Johar',
          avatar: faker.image.avatar(),
          isLinked: true,
        },
      },
    },
  });
  
  console.log('✅ Casting Director created:', castingDirector.email);
  
  // Create test producer
  const producer = await prisma.user.upsert({
    where: { email: 'rohit.shetty@rohitshettyproductions.com' },
    update: {},
    create: {
      email: 'rohit.shetty@rohitshettyproductions.com',
      password: hashedPassword,
      role: UserRole.PRODUCER,
      firstName: 'Rohit',
      lastName: 'Shetty',
      isEmailVerified: true,
      isActive: true,
      username: 'rohitshetty',
      avatar: faker.image.avatar(),
      producer: {
        create: {
          firstName: 'Rohit',
          lastName: 'Shetty',
          productionHouse: 'Rohit Shetty Productions',
          designation: 'Producer & Director',
          bio: 'Known for high-octane action films and comedy entertainers',
          isVerified: true,
        },
      },
    },
  });
  
  console.log('✅ Producer created:', producer.email);
  
  // Create test actors
  const actors = [];
  for (let i = 0; i < 10; i++) {
    const { firstName, lastName, gender } = generateIndianName();
    const { city, state } = generateMumbaiLocation();
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@gmail.com`;
    
    const actor = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        password: hashedPassword,
        role: UserRole.ACTOR,
        firstName,
        lastName,
        isEmailVerified: faker.datatype.boolean(),
        isActive: true,
        username: `${firstName.toLowerCase()}${lastName.toLowerCase()}${i}`,
        avatar: faker.image.avatar(),
        phone: `+919${faker.string.numeric(9)}`,
        actor: {
          create: {
            firstName,
            lastName,
            displayName: `${firstName} ${lastName}`,
            dateOfBirth: faker.date.between({ from: '1985-01-01', to: '2005-01-01' }),
            gender,
            height: faker.number.int({ min: 150, max: 190 }),
            weight: faker.number.int({ min: 45, max: 90 }),
            languages: faker.helpers.arrayElements(['Hindi', 'English', 'Marathi', 'Gujarati', 'Tamil'], { min: 2, max: 4 }),
            city,
            state,
            bio: faker.lorem.paragraph(),
            experience: {
              years: faker.number.int({ min: 0, max: 15 }),
              projects: faker.number.int({ min: 0, max: 50 }),
            },
            skills: faker.helpers.arrayElements([
              'Method Acting', 'Dance', 'Singing', 'Martial Arts', 'Comedy',
              'Drama', 'Action', 'Romance', 'Emotional Scenes', 'Stunts'
            ], { min: 3, max: 6 }),
            profileImageUrl: faker.image.avatar(),
            portfolioUrls: [faker.internet.url(), faker.internet.url()],
            isVerified: faker.datatype.boolean(),
            rating: faker.number.float({ min: 3.0, max: 5.0, fractionDigits: 1 }),
            totalReviews: faker.number.int({ min: 0, max: 100 }),
          },
        },
        talent: {
          create: {
            firstName,
            lastName,
            dateOfBirth: faker.date.between({ from: '1985-01-01', to: '2005-01-01' }),
            gender,
            email,
            primaryPhone: `+919${faker.string.numeric(9)}`,
            currentCity: city,
            currentState: state,
            height: faker.number.int({ min: 150, max: 190 }),
            weight: faker.number.int({ min: 45, max: 90 }),
            languages: faker.helpers.arrayElements(['Hindi', 'English', 'Marathi', 'Gujarati', 'Tamil'], { min: 2, max: 4 }),
            actingSkills: faker.helpers.arrayElements([
              'Method Acting', 'Stanislavski', 'Meisner Technique', 'Improvisation'
            ], { min: 1, max: 3 }),
            danceSkills: faker.helpers.arrayElements([
              'Classical', 'Contemporary', 'Hip-Hop', 'Bollywood', 'Kathak'
            ], { min: 0, max: 3 }),
            yearsOfExperience: faker.number.int({ min: 0, max: 15 }),
            profileImageUrl: faker.image.avatar(),
            bio: faker.lorem.paragraph(),
            isVerified: faker.datatype.boolean(),
            rating: faker.number.float({ min: 3.0, max: 5.0, fractionDigits: 1 }),
            totalReviews: faker.number.int({ min: 0, max: 100 }),
          },
        },
      },
    });
    
    actors.push(actor);
  }
  
  console.log(`✅ ${actors.length} actors created`);
  
  return { admin, castingDirector, producer, actors };
}

async function seedProjects(castingDirectorId: string, producerId: string) {
  console.log('🌱 Seeding projects...');
  
  const projects = [];
  const projectTitles = [
    'Mumbai Dreams', 'The Last Monsoon', 'Streets of Bandra', 'Midnight at Marine Drive',
    'Love in Lokhandwala', 'The Dharavi Story', 'Gateway of India', 'Bollywood Nights'
  ];
  
  for (const title of projectTitles) {
    const project = await prisma.project.create({
      data: {
        title,
        description: faker.lorem.paragraphs(2),
        type: faker.helpers.arrayElement(Object.values(ProjectType)),
        genre: faker.helpers.arrayElements(['Drama', 'Romance', 'Action', 'Comedy', 'Thriller'], { min: 1, max: 3 }),
        languages: faker.helpers.arrayElements(['Hindi', 'English'], { min: 1, max: 2 }),
        status: faker.helpers.arrayElement(Object.values(ProjectStatus)),
        productionHouse: faker.company.name(),
        castingDirectorId,
        producerId,
        castingStartDate: faker.date.future(),
        castingEndDate: faker.date.future({ years: 1 }),
        shootingStartDate: faker.date.future({ years: 1 }),
        shootingEndDate: faker.date.future({ years: 2 }),
        shootingLocations: faker.helpers.arrayElements(['Mumbai', 'Delhi', 'Goa', 'Pune'], { min: 1, max: 3 }),
        totalBudget: faker.number.int({ min: 10000000, max: 500000000 }),
        isPublic: true,
        totalRoles: faker.number.int({ min: 5, max: 20 }),
        // Create associated roles/characters
        roles: {
          create: Array.from({ length: faker.number.int({ min: 3, max: 8 }) }, () => ({
            name: faker.person.jobTitle(),
            description: faker.lorem.paragraph(),
            characterAge: `${faker.number.int({ min: 18, max: 60 })}-${faker.number.int({ min: 25, max: 65 })}`,
            gender: faker.helpers.arrayElement([Gender.MALE, Gender.FEMALE, Gender.OTHER]),
            requiredSkills: faker.helpers.arrayElements(['Acting', 'Dancing', 'Singing', 'Action'], { min: 1, max: 3 }),
            languages: faker.helpers.arrayElements(['Hindi', 'English', 'Marathi'], { min: 1, max: 2 }),
            compensation: faker.number.int({ min: 50000, max: 1000000 }),
            compensationType: faker.helpers.arrayElement(['per_day', 'per_project']),
            numberOfDays: faker.number.int({ min: 10, max: 60 }),
            isLead: faker.datatype.boolean(),
            status: 'open',
          })),
        },
      },
    });
    
    projects.push(project);
  }
  
  console.log(`✅ ${projects.length} projects created`);
  
  return projects;
}

async function seedAuditLogs(userId: string) {
  console.log('🌱 Seeding audit logs...');
  
  const actions = ['login', 'logout', 'password_change', 'profile_update', '2fa_enabled'];
  const logs = [];
  
  for (let i = 0; i < 20; i++) {
    const log = await prisma.auditLog.create({
      data: {
        userId,
        action: faker.helpers.arrayElement(actions),
        resource: 'user',
        resourceId: userId,
        status: faker.helpers.arrayElement(['success', 'failure']),
        ipAddress: faker.internet.ip(),
        userAgent: faker.internet.userAgent(),
        metadata: {
          timestamp: faker.date.recent().toISOString(),
          details: faker.lorem.sentence(),
        },
      },
    });
    
    logs.push(log);
  }
  
  console.log(`✅ ${logs.length} audit logs created`);
  
  return logs;
}

async function main() {
  console.log('🚀 Starting database seed...');
  
  try {
    // Clear existing data
    console.log('🧹 Cleaning database...');
    await prisma.$transaction([
      prisma.auditLog.deleteMany(),
      prisma.audition.deleteMany(),
      prisma.application.deleteMany(),
      prisma.role.deleteMany(),
      prisma.character.deleteMany(),
      prisma.project.deleteMany(),
      prisma.actorMedia.deleteMany(),
      prisma.talentMedia.deleteMany(),
      prisma.talent.deleteMany(),
      prisma.actor.deleteMany(),
      prisma.castingDirector.deleteMany(),
      prisma.producer.deleteMany(),
      prisma.socialAccount.deleteMany(),
      prisma.passwordReset.deleteMany(),
      prisma.loginSession.deleteMany(),
      prisma.session.deleteMany(),
      prisma.notification.deleteMany(),
      prisma.user.deleteMany(),
    ]);
    
    console.log('✅ Database cleaned');
    
    // Seed data
    const { admin, castingDirector, producer, actors } = await seedUsers();
    const projects = await seedProjects(castingDirector.castingDirector!.id, producer.producer!.id);
    await seedAuditLogs(admin.id);
    
    // Create some applications
    console.log('🌱 Creating applications...');
    
    for (const project of projects.slice(0, 3)) {
      const projectRoles = await prisma.role.findMany({
        where: { projectId: project.id },
        take: 3,
      });
      
      for (const role of projectRoles) {
        for (const actor of actors.slice(0, 5)) {
          const actorRecord = await prisma.actor.findUnique({
            where: { userId: actor.id },
          });
          
          if (actorRecord) {
            await prisma.application.create({
              data: {
                userId: actor.id,
                actorId: actorRecord.id,
                roleId: role.id,
                projectId: project.id,
                coverLetter: faker.lorem.paragraph(),
                proposedRate: faker.number.int({ min: 50000, max: 200000 }),
                rateType: 'per_day',
                isNegotiable: faker.datatype.boolean(),
                status: faker.helpers.arrayElement(['PENDING', 'UNDER_REVIEW', 'SHORTLISTED']),
                appliedAt: faker.date.recent(),
              },
            }).catch(() => {
              // Ignore duplicate applications
            });
          }
        }
      }
    }
    
    console.log('✅ Applications created');
    
    console.log('');
    console.log('🎉 Database seeding completed successfully!');
    console.log('');
    console.log('📝 Test Credentials:');
    console.log('─────────────────────');
    console.log('Admin:');
    console.log('  Email: admin@castmatch.com');
    console.log('  Password: Test@123');
    console.log('');
    console.log('Casting Director:');
    console.log('  Email: karan.johar@dharma.com');
    console.log('  Password: Test@123');
    console.log('');
    console.log('Producer:');
    console.log('  Email: rohit.shetty@rohitshettyproductions.com');
    console.log('  Password: Test@123');
    console.log('');
    console.log('Actors:');
    actors.slice(0, 3).forEach((actor, index) => {
      console.log(`  ${index + 1}. Email: ${actor.email}`);
      console.log(`     Password: Test@123`);
    });
    console.log('');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the seed script
main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });