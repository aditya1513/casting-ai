/**
 * Test Data Management System
 * Centralized test data creation and management for CastMatch testing
 */

import { faker } from '@faker-js/faker';

export interface TestUser {
  id?: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'actor' | 'casting_director' | 'producer' | 'admin';
  profile?: any;
}

export interface TestProject {
  id?: string;
  title: string;
  description: string;
  genre: string;
  budget: number;
  status: 'development' | 'pre_production' | 'production' | 'post_production' | 'completed';
  castingDirectorId?: string;
  producerId?: string;
}

export interface TestAudition {
  id?: string;
  projectId: string;
  title: string;
  description: string;
  requirements: string[];
  scheduledDate: Date;
  location: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

export class TestDataFactory {
  private static instance: TestDataFactory;
  private userCount = 0;
  private projectCount = 0;
  private auditionCount = 0;

  public static getInstance(): TestDataFactory {
    if (!TestDataFactory.instance) {
      TestDataFactory.instance = new TestDataFactory();
    }
    return TestDataFactory.instance;
  }

  /**
   * Create test user data
   */
  createUser(role: TestUser['role'] = 'actor', overrides: Partial<TestUser> = {}): TestUser {
    const baseEmail = faker.internet.email().toLowerCase();
    return {
      id: faker.string.uuid(),
      email: `test.${++this.userCount}.${baseEmail}`,
      password: 'TestPassword123!',
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      role,
      profile: this.createUserProfile(role),
      ...overrides
    };
  }

  /**
   * Create user profile based on role
   */
  private createUserProfile(role: TestUser['role']) {
    const baseProfile = {
      phone: faker.phone.number(),
      location: 'Mumbai, India',
      bio: faker.lorem.paragraph(),
    };

    switch (role) {
      case 'actor':
        return {
          ...baseProfile,
          height: `${faker.number.int({ min: 150, max: 200 })} cm`,
          weight: `${faker.number.int({ min: 45, max: 100 })} kg`,
          age: faker.number.int({ min: 18, max: 65 }),
          experience: `${faker.number.int({ min: 0, max: 20 })} years`,
          skills: faker.helpers.arrayElements([
            'Acting', 'Dancing', 'Singing', 'Action', 'Comedy', 'Drama',
            'Martial Arts', 'Horse Riding', 'Swimming', 'Gymnastics'
          ], { min: 2, max: 5 }),
          languages: faker.helpers.arrayElements([
            'Hindi', 'English', 'Marathi', 'Tamil', 'Telugu', 'Bengali',
            'Gujarati', 'Punjabi', 'Malayalam', 'Kannada'
          ], { min: 2, max: 4 }),
          portfolioImages: Array(faker.number.int({ min: 3, max: 8 }))
            .fill(null).map(() => faker.image.avatar()),
          videoReel: faker.internet.url(),
        };

      case 'casting_director':
        return {
          ...baseProfile,
          company: faker.company.name(),
          experience: `${faker.number.int({ min: 5, max: 25 })} years`,
          specializations: faker.helpers.arrayElements([
            'Feature Films', 'Web Series', 'Commercials', 'Music Videos',
            'Short Films', 'Theatre', 'Television'
          ], { min: 2, max: 4 }),
          projectsCompleted: faker.number.int({ min: 10, max: 200 }),
        };

      case 'producer':
        return {
          ...baseProfile,
          company: faker.company.name(),
          experience: `${faker.number.int({ min: 5, max: 30 })} years`,
          netWorth: faker.number.int({ min: 1000000, max: 100000000 }),
          projectTypes: faker.helpers.arrayElements([
            'Feature Films', 'Web Series', 'Documentaries', 'Short Films'
          ], { min: 1, max: 3 }),
        };

      default:
        return baseProfile;
    }
  }

  /**
   * Create test project data
   */
  createProject(overrides: Partial<TestProject> = {}): TestProject {
    return {
      id: faker.string.uuid(),
      title: faker.commerce.productName() + ' - The Series',
      description: faker.lorem.paragraphs(3),
      genre: faker.helpers.arrayElement([
        'Drama', 'Comedy', 'Thriller', 'Romance', 'Action',
        'Horror', 'Sci-Fi', 'Documentary', 'Musical', 'Adventure'
      ]),
      budget: faker.number.int({ min: 1000000, max: 100000000 }),
      status: faker.helpers.arrayElement([
        'development', 'pre_production', 'production', 'post_production', 'completed'
      ]),
      ...overrides
    };
  }

  /**
   * Create test audition data
   */
  createAudition(projectId: string, overrides: Partial<TestAudition> = {}): TestAudition {
    return {
      id: faker.string.uuid(),
      projectId,
      title: `Audition for ${faker.person.jobTitle()}`,
      description: faker.lorem.paragraph(),
      requirements: faker.helpers.arrayElements([
        'Age 25-35', 'Mumbai based', 'Theatre experience',
        'Dance skills', 'Action experience', 'Fluent Hindi',
        'Previous web series work', 'Method acting training'
      ], { min: 2, max: 5 }),
      scheduledDate: faker.date.future(),
      location: faker.helpers.arrayElement([
        'Andheri Studios, Mumbai', 'Bandra West Office',
        'Film City, Goregaon', 'Versova Studio', 'Malad Office'
      ]),
      status: faker.helpers.arrayElement([
        'scheduled', 'in_progress', 'completed', 'cancelled'
      ]),
      ...overrides
    };
  }

  /**
   * Create bulk test users
   */
  createUsers(count: number, role?: TestUser['role']): TestUser[] {
    return Array(count).fill(null).map(() => this.createUser(role));
  }

  /**
   * Create bulk test projects
   */
  createProjects(count: number): TestProject[] {
    return Array(count).fill(null).map(() => this.createProject());
  }

  /**
   * Create complete test scenario data
   */
  createCompleteScenario() {
    // Create users
    const producers = this.createUsers(3, 'producer');
    const castingDirectors = this.createUsers(5, 'casting_director');
    const actors = this.createUsers(20, 'actor');

    // Create projects
    const projects = this.createProjects(10).map((project, index) => ({
      ...project,
      producerId: producers[index % producers.length].id,
      castingDirectorId: castingDirectors[index % castingDirectors.length].id,
    }));

    // Create auditions
    const auditions: TestAudition[] = [];
    projects.forEach(project => {
      const auditionCount = faker.number.int({ min: 2, max: 5 });
      for (let i = 0; i < auditionCount; i++) {
        auditions.push(this.createAudition(project.id!));
      }
    });

    return {
      users: {
        producers,
        castingDirectors,
        actors,
        all: [...producers, ...castingDirectors, ...actors]
      },
      projects,
      auditions
    };
  }

  /**
   * Create test messages for chat scenarios
   */
  createChatMessages(count: number = 10) {
    return Array(count).fill(null).map(() => ({
      id: faker.string.uuid(),
      content: faker.lorem.sentence(),
      timestamp: faker.date.recent(),
      senderId: faker.string.uuid(),
      receiverId: faker.string.uuid(),
      type: faker.helpers.arrayElement(['text', 'image', 'video', 'document']),
    }));
  }

  /**
   * Reset counters for fresh test data
   */
  reset(): void {
    this.userCount = 0;
    this.projectCount = 0;
    this.auditionCount = 0;
  }

  /**
   * Generate realistic Indian names and data
   */
  createIndianUser(role: TestUser['role'] = 'actor'): TestUser {
    const indianFirstNames = [
      'Aarav', 'Aditi', 'Arjun', 'Ananya', 'Ishaan', 'Kavya',
      'Rohan', 'Priya', 'Vihaan', 'Diya', 'Aryan', 'Isha'
    ];
    
    const indianLastNames = [
      'Sharma', 'Patel', 'Singh', 'Kumar', 'Gupta', 'Jain',
      'Shah', 'Mehta', 'Agarwal', 'Bansal', 'Malhotra', 'Kapoor'
    ];

    return this.createUser(role, {
      firstName: faker.helpers.arrayElement(indianFirstNames),
      lastName: faker.helpers.arrayElement(indianLastNames),
      email: `test.${++this.userCount}.${faker.internet.email()}`.toLowerCase()
    });
  }
}

/**
 * Global test data factory instance
 */
export const testDataFactory = TestDataFactory.getInstance();

/**
 * Common test data sets
 */
export const testScenarios = {
  // Standard user sets for testing
  standardUsers: {
    actor: testDataFactory.createIndianUser('actor'),
    castingDirector: testDataFactory.createIndianUser('casting_director'),
    producer: testDataFactory.createIndianUser('producer'),
    admin: testDataFactory.createUser('admin')
  },

  // Performance testing data
  loadTestData: {
    users: testDataFactory.createUsers(1000),
    projects: testDataFactory.createProjects(100),
  },

  // Security testing data
  securityTestData: {
    maliciousInputs: [
      '<script>alert("xss")</script>',
      "'; DROP TABLE users; --",
      '../../../etc/passwd',
      '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY test SYSTEM "file:///etc/passwd">]><root>&test;</root>',
      'javascript:alert("xss")',
      'data:text/html,<script>alert("xss")</script>'
    ],
    invalidEmails: [
      'invalid-email',
      'test@',
      '@domain.com',
      'test..test@domain.com',
      'test@.com',
      ''
    ]
  }
};