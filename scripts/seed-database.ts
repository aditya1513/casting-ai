/**
 * Database Seeding Script for CastMatch Platform
 * Populates the database with realistic Mumbai casting industry sample data
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';
import { 
  users, 
  talentProfiles, 
  projects, 
  projectRoles, 
  applications, 
  auditions, 
  notifications,
  conversations,
  messages,
  memories
} from '../apps/backend/src/models/schema';
import path from 'path';

// Load environment variables from the backend .env
dotenv.config({ path: path.join(__dirname, '../apps/backend/.env') });

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://castmatch:castmatch123@localhost:5432/castmatch_db',
});

const db = drizzle(pool);

// Utility function to hash passwords
const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

// Mumbai locations
const mumbaiLocations = [
  'Bandra West, Mumbai',
  'Andheri West, Mumbai',
  'Juhu, Mumbai',
  'Versova, Mumbai',
  'Goregaon East, Mumbai',
  'Malad West, Mumbai',
  'Powai, Mumbai',
  'Khar West, Mumbai',
  'Santacruz West, Mumbai',
  'Lower Parel, Mumbai',
  'Worli, Mumbai',
  'Fort, Mumbai',
  'Colaba, Mumbai',
  'Dadar West, Mumbai',
  'Chembur, Mumbai'
];

// Bollywood production houses
const productionHouses = [
  'Yash Raj Films',
  'Dharma Productions',
  'Red Chillies Entertainment',
  'Excel Entertainment',
  'Balaji Motion Pictures',
  'Eros International',
  'T-Series Films',
  'Phantom Films',
  'Clean Slate Filmz',
  'Abundantia Entertainment',
  'Roy Kapur Films',
  'Emmay Entertainment',
  'Junglee Pictures',
  'Maddock Films',
  'Viacom18 Studios'
];

// Skills for actors
const actingSkills = [
  'Hindi', 'English', 'Marathi', 'Gujarati', 'Punjabi',
  'Method Acting', 'Improvisation', 'Voice Modulation',
  'Dance - Classical', 'Dance - Contemporary', 'Dance - Bollywood',
  'Action Sequences', 'Emotional Range', 'Comedy Timing',
  'Singing', 'Martial Arts', 'Horse Riding', 'Swimming',
  'Driving', 'Bike Riding', 'Stage Combat', 'Accents',
  'Mime', 'Physical Theatre', 'Stand-up Comedy'
];

// Main seeding function
async function seedDatabase() {
  console.log('🌱 Starting database seeding for CastMatch...\n');

  try {
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await db.delete(notifications);
    await db.delete(auditions);
    await db.delete(applications);
    await db.delete(projectRoles);
    await db.delete(projects);
    await db.delete(memories);
    await db.delete(messages);
    await db.delete(conversations);
    await db.delete(talentProfiles);
    await db.delete(users);
    
    console.log('✅ Existing data cleared\n');

    // ====================
    // 1. Create Users
    // ====================
    console.log('👥 Creating users...');
    
    const hashedPassword = await hashPassword('Password123!');
    
    const usersData = [
      // Casting Directors
      {
        email: 'mukesh.chhabra@castmatch.com',
        password: hashedPassword,
        firstName: 'Mukesh',
        lastName: 'Chhabra',
        role: 'casting_director' as const,
        phoneNumber: '+919876543210',
        bio: 'Renowned casting director with 20+ years in Bollywood. Known for discovering fresh talent.',
        location: 'Andheri West, Mumbai',
        emailVerified: true,
        isPhoneVerified: true,
        isActive: true,
        gender: 'Male',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'shanoo.sharma@castmatch.com',
        password: hashedPassword,
        firstName: 'Shanoo',
        lastName: 'Sharma',
        role: 'casting_director' as const,
        phoneNumber: '+919876543211',
        bio: 'Casting director at Yash Raj Films. Specializes in finding talent for romantic and action films.',
        location: 'Bandra West, Mumbai',
        emailVerified: true,
        isPhoneVerified: true,
        isActive: true,
        gender: 'Female',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      
      // Producers
      {
        email: 'karan.johar@castmatch.com',
        password: hashedPassword,
        firstName: 'Karan',
        lastName: 'Johar',
        role: 'producer' as const,
        phoneNumber: '+919876543212',
        bio: 'Film producer and director at Dharma Productions. Creating contemporary cinema.',
        location: 'Khar West, Mumbai',
        emailVerified: true,
        isPhoneVerified: true,
        isActive: true,
        gender: 'Male',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'ritesh.sidhwani@castmatch.com',
        password: hashedPassword,
        firstName: 'Ritesh',
        lastName: 'Sidhwani',
        role: 'producer' as const,
        phoneNumber: '+919876543213',
        bio: 'Co-founder of Excel Entertainment. Producer of acclaimed films and web series.',
        location: 'Juhu, Mumbai',
        emailVerified: true,
        isPhoneVerified: true,
        isActive: true,
        gender: 'Male',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      
      // Actors/Talents
      {
        email: 'arjun.mehta@castmatch.com',
        password: hashedPassword,
        firstName: 'Arjun',
        lastName: 'Mehta',
        role: 'actor' as const,
        phoneNumber: '+919876543214',
        bio: 'Aspiring actor with theatre background. Graduate from NSD.',
        location: 'Versova, Mumbai',
        emailVerified: true,
        isPhoneVerified: true,
        isActive: true,
        gender: 'Male',
        dateOfBirth: new Date('1995-03-15'),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'priya.sharma@castmatch.com',
        password: hashedPassword,
        firstName: 'Priya',
        lastName: 'Sharma',
        role: 'actor' as const,
        phoneNumber: '+919876543215',
        bio: 'Trained classical dancer and actress. Featured in several commercials.',
        location: 'Goregaon East, Mumbai',
        emailVerified: true,
        isPhoneVerified: true,
        isActive: true,
        gender: 'Female',
        dateOfBirth: new Date('1998-07-22'),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'rahul.verma@castmatch.com',
        password: hashedPassword,
        firstName: 'Rahul',
        lastName: 'Verma',
        role: 'actor' as const,
        phoneNumber: '+919876543216',
        bio: 'Action specialist with martial arts training. Stunt performer turned actor.',
        location: 'Malad West, Mumbai',
        emailVerified: true,
        isPhoneVerified: true,
        isActive: true,
        gender: 'Male',
        dateOfBirth: new Date('1992-11-08'),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'ananya.patel@castmatch.com',
        password: hashedPassword,
        firstName: 'Ananya',
        lastName: 'Patel',
        role: 'actor' as const,
        phoneNumber: '+919876543217',
        bio: 'Versatile actress with experience in regional cinema and theatre.',
        location: 'Powai, Mumbai',
        emailVerified: true,
        isPhoneVerified: true,
        isActive: true,
        gender: 'Female',
        dateOfBirth: new Date('1996-02-14'),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'vikram.singh@castmatch.com',
        password: hashedPassword,
        firstName: 'Vikram',
        lastName: 'Singh',
        role: 'actor' as const,
        phoneNumber: '+919876543218',
        bio: 'Character actor with 50+ ad films. Specializes in comedy and drama.',
        location: 'Santacruz West, Mumbai',
        emailVerified: true,
        isPhoneVerified: true,
        isActive: true,
        gender: 'Male',
        dateOfBirth: new Date('1990-09-30'),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'neha.kapoor@castmatch.com',
        password: hashedPassword,
        firstName: 'Neha',
        lastName: 'Kapoor',
        role: 'actor' as const,
        phoneNumber: '+919876543219',
        bio: 'Model turned actress. Featured in music videos and web series.',
        location: 'Lower Parel, Mumbai',
        emailVerified: true,
        isPhoneVerified: true,
        isActive: true,
        gender: 'Female',
        dateOfBirth: new Date('1999-12-05'),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'aditya.roy@castmatch.com',
        password: hashedPassword,
        firstName: 'Aditya',
        lastName: 'Roy',
        role: 'actor' as const,
        phoneNumber: '+919876543220',
        bio: 'Young talent with strong screen presence. Trained at Anupam Kher Actor Prepares.',
        location: 'Worli, Mumbai',
        emailVerified: true,
        isPhoneVerified: true,
        isActive: true,
        gender: 'Male',
        dateOfBirth: new Date('2000-06-18'),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'kavya.nair@castmatch.com',
        password: hashedPassword,
        firstName: 'Kavya',
        lastName: 'Nair',
        role: 'actor' as const,
        phoneNumber: '+919876543221',
        bio: 'South Indian actress venturing into Bollywood. Fluent in 5 languages.',
        location: 'Chembur, Mumbai',
        emailVerified: true,
        isPhoneVerified: true,
        isActive: true,
        gender: 'Female',
        dateOfBirth: new Date('1997-04-25'),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      
      // Assistant
      {
        email: 'rohit.assistant@castmatch.com',
        password: hashedPassword,
        firstName: 'Rohit',
        lastName: 'Kumar',
        role: 'assistant' as const,
        phoneNumber: '+919876543222',
        bio: 'Casting assistant at Mukesh Chhabra Casting Company.',
        location: 'Dadar West, Mumbai',
        emailVerified: true,
        isPhoneVerified: true,
        isActive: true,
        gender: 'Male',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      
      // Admin
      {
        email: 'admin@castmatch.com',
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Admin',
        role: 'admin' as const,
        phoneNumber: '+919876543223',
        bio: 'Platform administrator',
        location: 'Fort, Mumbai',
        emailVerified: true,
        isPhoneVerified: true,
        isActive: true,
        gender: 'Other',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const insertedUsers = await db.insert(users).values(usersData).returning();
    console.log(`✅ Created ${insertedUsers.length} users\n`);

    // ====================
    // 2. Create Talent Profiles
    // ====================
    console.log('🎭 Creating talent profiles...');

    const actorUsers = insertedUsers.filter(u => u.role === 'actor');
    
    const talentProfilesData = actorUsers.map((user, index) => {
      const ageFromDob = user.dateOfBirth ? 
        new Date().getFullYear() - new Date(user.dateOfBirth).getFullYear() : 
        25 + index;
        
      return {
        userId: user.id,
        stageName: user.firstName + ' ' + user.lastName,
        gender: user.gender || 'Other',
        dateOfBirth: user.dateOfBirth || new Date(`19${95 - index}-01-15`),
        height: 165 + (index * 5), // Heights from 165cm to 210cm
        weight: 55 + (index * 5), // Weights from 55kg to 100kg
        city: mumbaiLocations[index % mumbaiLocations.length].split(',')[0],
        state: 'Maharashtra',
        country: 'India',
        languages: ['Hindi', 'English', index % 2 === 0 ? 'Marathi' : 'Gujarati', index % 3 === 0 ? 'Punjabi' : null].filter(Boolean),
        experience: [
          {
            title: 'Lead Actor',
            project: 'Short Film - Mumbai Dreams',
            year: 2023,
            description: 'Played the protagonist in award-winning short film'
          },
          {
            title: 'Supporting Role',
            project: 'Web Series - City Lights',
            year: 2022,
            description: 'Featured in 5 episodes of popular OTT series'
          }
        ],
        skills: actingSkills.slice(index * 3, (index * 3) + 8),
        training: [
          {
            institution: ['NSD', 'FTII', 'Anupam Kher Actor Prepares', 'Barry John Acting Studio'][index % 4],
            course: 'Acting Program',
            year: 2020 - index % 3
          }
        ],
        achievements: index % 2 === 0 ? [
          {
            title: 'Best Actor Award',
            event: 'Mumbai Theatre Festival',
            year: 2022
          }
        ] : [],
        eyeColor: ['Brown', 'Black', 'Hazel'][index % 3],
        hairColor: ['Black', 'Brown', 'Dark Brown'][index % 3],
        bodyType: ['Athletic', 'Slim', 'Average', 'Muscular'][index % 4],
        ethnicity: ['North Indian', 'South Indian', 'Punjabi', 'Gujarati', 'Bengali'][index % 5],
        headshots: [
          'https://castmatch-storage.s3.ap-south-1.amazonaws.com/headshots/sample1.jpg',
          'https://castmatch-storage.s3.ap-south-1.amazonaws.com/headshots/sample2.jpg'
        ],
        portfolio: [
          {
            type: 'photo',
            url: 'https://castmatch-storage.s3.ap-south-1.amazonaws.com/portfolio/photo1.jpg',
            caption: 'Professional headshot'
          }
        ],
        reels: [
          'https://castmatch-storage.s3.ap-south-1.amazonaws.com/reels/demo-reel.mp4'
        ],
        willingToTravel: index % 2 === 0,
        minBudget: '5000',
        maxBudget: '50000',
        availability: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: index % 2 === 0,
          sunday: false
        },
        searchTags: ['actor', user.gender?.toLowerCase(), 'mumbai', 'hindi', 'bollywood'],
        viewCount: Math.floor(Math.random() * 500),
        applicationCount: Math.floor(Math.random() * 20),
        selectionCount: Math.floor(Math.random() * 5),
        rating: (3.5 + (Math.random() * 1.5)).toFixed(2),
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });

    const insertedTalentProfiles = await db.insert(talentProfiles).values(talentProfilesData).returning();
    console.log(`✅ Created ${insertedTalentProfiles.length} talent profiles\n`);

    // ====================
    // 3. Create Projects
    // ====================
    console.log('🎬 Creating projects...');

    const producerUsers = insertedUsers.filter(u => u.role === 'producer' || u.role === 'casting_director');
    
    const projectsData = [
      {
        createdBy: producerUsers[0].id,
        title: 'Mumbai Monsoon',
        description: 'A romantic drama set during the Mumbai monsoons. Story of two strangers who meet during a rain-soaked evening.',
        type: 'film',
        genre: ['Romance', 'Drama'],
        language: 'Hindi',
        productionHouse: 'Dharma Productions',
        director: 'Zoya Akhtar',
        producer: 'Karan Johar',
        budget: '500000000', // 50 Crores
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-05-30'),
        auditionDeadline: new Date('2025-01-15'),
        shootingLocation: ['Mumbai', 'Lonavala', 'Pune'],
        auditionLocation: 'Dharma Productions Office, Khar West',
        status: 'active' as const,
        isPublished: true,
        isFeatured: true,
        requirements: {
          ageRange: '20-35',
          experience: 'Minimum 2 years',
          languages: ['Hindi', 'English']
        },
        viewCount: 1250,
        applicationCount: 85,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        createdBy: producerUsers[1].id,
        title: 'Gully Boys - The Series',
        description: 'Web series exploring the underground hip-hop scene in Mumbai. Raw, authentic storytelling.',
        type: 'series',
        genre: ['Drama', 'Music'],
        language: 'Hindi',
        productionHouse: 'Excel Entertainment',
        director: 'Reema Kagti',
        producer: 'Ritesh Sidhwani',
        budget: '200000000', // 20 Crores
        startDate: new Date('2025-03-01'),
        endDate: new Date('2025-07-30'),
        auditionDeadline: new Date('2025-02-01'),
        shootingLocation: ['Dharavi', 'Bandra', 'Kurla'],
        auditionLocation: 'Excel Entertainment, Juhu',
        status: 'active' as const,
        isPublished: true,
        isFeatured: false,
        requirements: {
          ageRange: '18-28',
          experience: 'Fresh talent welcome',
          skills: ['Rapping', 'Street Dance']
        },
        viewCount: 980,
        applicationCount: 120,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        createdBy: producerUsers[0].id,
        title: 'Diwali Commercial - Traditional Wear',
        description: 'TV commercial for leading ethnic wear brand. Celebrating Indian traditions.',
        type: 'commercial',
        genre: ['Commercial', 'Advertisement'],
        language: 'Hindi',
        productionHouse: 'Red Chillies Entertainment',
        director: 'Gauri Khan',
        producer: 'Shah Rukh Khan',
        budget: '5000000', // 50 Lakhs
        startDate: new Date('2025-01-20'),
        endDate: new Date('2025-01-25'),
        auditionDeadline: new Date('2025-01-10'),
        shootingLocation: ['Film City, Goregaon'],
        auditionLocation: 'Mukesh Chhabra Casting Office, Andheri',
        status: 'active' as const,
        isPublished: true,
        isFeatured: false,
        requirements: {
          ageRange: '25-40',
          experience: 'Commercial experience preferred',
          looks: 'Traditional Indian look'
        },
        viewCount: 650,
        applicationCount: 45,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        createdBy: producerUsers[2]?.id || producerUsers[0].id,
        title: 'Crime Patrol Mumbai',
        description: 'Episodic crime series based on real incidents in Mumbai.',
        type: 'series',
        genre: ['Crime', 'Thriller', 'Drama'],
        language: 'Hindi',
        productionHouse: 'Balaji Motion Pictures',
        director: 'Anurag Kashyap',
        producer: 'Ekta Kapoor',
        budget: '100000000', // 10 Crores
        startDate: new Date('2025-02-15'),
        endDate: new Date('2025-08-15'),
        auditionDeadline: new Date('2025-01-30'),
        shootingLocation: ['Mumbai', 'Thane', 'Navi Mumbai'],
        auditionLocation: 'Balaji House, Andheri East',
        status: 'active' as const,
        isPublished: true,
        isFeatured: false,
        requirements: {
          ageRange: '20-50',
          experience: 'All levels',
          skills: ['Intense acting', 'Action sequences']
        },
        viewCount: 890,
        applicationCount: 95,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        createdBy: producerUsers[1]?.id || producerUsers[0].id,
        title: 'The Great Indian Family',
        description: 'Family entertainer showcasing modern Indian family dynamics with humor and heart.',
        type: 'film',
        genre: ['Comedy', 'Family', 'Drama'],
        language: 'Hindi',
        productionHouse: 'Yash Raj Films',
        director: 'Vijay Krishna Acharya',
        producer: 'Aditya Chopra',
        budget: '800000000', // 80 Crores
        startDate: new Date('2025-04-01'),
        endDate: new Date('2025-07-30'),
        auditionDeadline: new Date('2025-03-01'),
        shootingLocation: ['Mumbai', 'Delhi', 'Jaipur'],
        auditionLocation: 'YRF Studios, Andheri West',
        status: 'active' as const,
        isPublished: true,
        isFeatured: true,
        requirements: {
          ageRange: '8-65',
          experience: 'Various roles available',
          languages: ['Hindi', 'English', 'Punjabi']
        },
        viewCount: 1580,
        applicationCount: 150,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const insertedProjects = await db.insert(projects).values(projectsData).returning();
    console.log(`✅ Created ${insertedProjects.length} projects\n`);

    // ====================
    // 4. Create Project Roles
    // ====================
    console.log('🎭 Creating project roles...');

    const projectRolesData = [
      // Mumbai Monsoon roles
      {
        projectId: insertedProjects[0].id,
        roleName: 'Lead Actor - Arjun',
        description: 'Young architect who falls in love during monsoon season',
        characterDetails: {
          age: 28,
          personality: 'Introverted, creative, romantic',
          background: 'Middle-class family from South Mumbai'
        },
        ageMin: 25,
        ageMax: 32,
        gender: 'Male',
        languages: ['Hindi', 'English'],
        skills: ['Romantic scenes', 'Emotional depth'],
        experience: 'Minimum 3 years',
        budget: '5000000',
        compensationType: 'per_project',
        slotsAvailable: 1,
        slotsFilled: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        projectId: insertedProjects[0].id,
        roleName: 'Lead Actress - Meera',
        description: 'Free-spirited writer who believes in destiny',
        characterDetails: {
          age: 26,
          personality: 'Optimistic, independent, artistic',
          background: 'From Pune, new to Mumbai'
        },
        ageMin: 23,
        ageMax: 30,
        gender: 'Female',
        languages: ['Hindi', 'English', 'Marathi'],
        skills: ['Dance', 'Emotional range'],
        experience: 'Minimum 2 years',
        budget: '5000000',
        compensationType: 'per_project',
        slotsAvailable: 1,
        slotsFilled: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      
      // Gully Boys roles
      {
        projectId: insertedProjects[1].id,
        roleName: 'MC Sher',
        description: 'Mentor figure in the hip-hop community',
        characterDetails: {
          age: 30,
          personality: 'Street-smart, protective, talented',
          background: 'Dharavi resident, underground rapper'
        },
        ageMin: 28,
        ageMax: 35,
        gender: 'Male',
        languages: ['Hindi', 'English'],
        skills: ['Rapping', 'Street credibility', 'Intense acting'],
        experience: 'Rap experience mandatory',
        budget: '2000000',
        compensationType: 'per_episode',
        slotsAvailable: 1,
        slotsFilled: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        projectId: insertedProjects[1].id,
        roleName: 'Safeena',
        description: 'Medical student and love interest',
        characterDetails: {
          age: 23,
          personality: 'Fierce, independent, ambitious',
          background: 'Muslim family, breaking stereotypes'
        },
        ageMin: 20,
        ageMax: 26,
        gender: 'Female',
        languages: ['Hindi', 'Urdu', 'English'],
        skills: ['Strong screen presence', 'Emotional intensity'],
        experience: 'Fresh faces welcome',
        budget: '1500000',
        compensationType: 'per_episode',
        slotsAvailable: 1,
        slotsFilled: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      
      // Commercial roles
      {
        projectId: insertedProjects[2].id,
        roleName: 'Mother Figure',
        description: 'Elegant mother in traditional saree',
        characterDetails: {
          age: 40,
          personality: 'Graceful, warm, traditional',
          background: 'Upper middle-class family'
        },
        ageMin: 35,
        ageMax: 45,
        gender: 'Female',
        languages: ['Hindi'],
        skills: ['Saree draping', 'Warm expressions'],
        experience: 'Commercial experience required',
        budget: '200000',
        compensationType: 'per_day',
        slotsAvailable: 1,
        slotsFilled: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        projectId: insertedProjects[2].id,
        roleName: 'Young Couple',
        description: 'Newly married couple shopping for Diwali',
        characterDetails: {
          ageRange: '25-30',
          personality: 'Modern yet traditional',
          chemistry: 'Must have good on-screen chemistry'
        },
        ageMin: 23,
        ageMax: 32,
        gender: 'Any',
        languages: ['Hindi'],
        skills: ['Couple chemistry', 'Natural acting'],
        experience: 'Ad film experience',
        budget: '150000',
        compensationType: 'per_day',
        slotsAvailable: 2,
        slotsFilled: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      
      // Crime Patrol roles
      {
        projectId: insertedProjects[3].id,
        roleName: 'Inspector Sharma',
        description: 'Tough cop investigating Mumbai crimes',
        characterDetails: {
          age: 35,
          personality: 'No-nonsense, dedicated, sharp',
          background: 'Police family background'
        },
        ageMin: 30,
        ageMax: 40,
        gender: 'Male',
        languages: ['Hindi', 'Marathi'],
        skills: ['Action sequences', 'Authoritative presence'],
        experience: 'TV/Film experience',
        budget: '1000000',
        compensationType: 'per_episode',
        slotsAvailable: 1,
        slotsFilled: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        projectId: insertedProjects[3].id,
        roleName: 'Various Criminal Roles',
        description: 'Different criminal characters for each episode',
        characterDetails: {
          variety: 'Different personalities each episode',
          intensity: 'Must portray dark characters convincingly'
        },
        ageMin: 20,
        ageMax: 50,
        gender: 'Any',
        languages: ['Hindi'],
        skills: ['Versatility', 'Intense acting'],
        experience: 'All levels',
        budget: '50000',
        compensationType: 'per_episode',
        slotsAvailable: 10,
        slotsFilled: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      
      // The Great Indian Family roles
      {
        projectId: insertedProjects[4].id,
        roleName: 'Patriarch - Dadaji',
        description: 'Wise and humorous family patriarch',
        characterDetails: {
          age: 65,
          personality: 'Wise, humorous, traditional yet progressive',
          importance: 'Pivotal role binding family together'
        },
        ageMin: 60,
        ageMax: 70,
        gender: 'Male',
        languages: ['Hindi', 'Punjabi'],
        skills: ['Comedy timing', 'Emotional depth'],
        experience: 'Senior actors preferred',
        budget: '3000000',
        compensationType: 'per_project',
        slotsAvailable: 1,
        slotsFilled: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        projectId: insertedProjects[4].id,
        roleName: 'Teenage Daughter',
        description: 'Modern teenager navigating family traditions',
        characterDetails: {
          age: 16,
          personality: 'Rebellious, smart, ultimately loving',
          arc: 'Journey from rebellion to understanding'
        },
        ageMin: 14,
        ageMax: 18,
        gender: 'Female',
        languages: ['Hindi', 'English'],
        skills: ['Natural acting', 'Dance'],
        experience: 'Young talent welcome',
        budget: '1500000',
        compensationType: 'per_project',
        slotsAvailable: 1,
        slotsFilled: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const insertedProjectRoles = await db.insert(projectRoles).values(projectRolesData).returning();
    console.log(`✅ Created ${insertedProjectRoles.length} project roles\n`);

    // ====================
    // 5. Create Applications
    // ====================
    console.log('📝 Creating applications...');

    const applicationsData = [];
    
    // Create applications from actors to various roles
    for (let i = 0; i < actorUsers.length; i++) {
      const actor = actorUsers[i];
      // Each actor applies to 2-3 roles
      const numApplications = 2 + (i % 2);
      
      for (let j = 0; j < numApplications && j < insertedProjectRoles.length; j++) {
        const roleIndex = (i + j) % insertedProjectRoles.length;
        const role = insertedProjectRoles[roleIndex];
        
        applicationsData.push({
          projectRoleId: role.id,
          talentId: actor.id,
          coverLetter: `I am very interested in the role of ${role.roleName}. With my experience in theatre and screen acting, I believe I can bring depth and authenticity to this character. My training and skills align perfectly with your requirements.`,
          proposedBudget: String(Number(role.budget) * 0.9), // 10% less than role budget
          availability: {
            immediate: true,
            fromDate: new Date('2025-01-15'),
            flexible: true
          },
          status: ['pending', 'shortlisted', 'shortlisted', 'auditioned', 'selected', 'rejected'][i % 6] as any,
          statusNote: i % 3 === 0 ? 'Great portfolio, moving to next round' : null,
          reviewedBy: i % 2 === 0 ? producerUsers[0].id : null,
          reviewedAt: i % 2 === 0 ? new Date() : null,
          rating: i % 2 === 0 ? (3 + (i % 3)) : null,
          notes: i % 2 === 0 ? 'Shows promise, good screen presence' : null,
          createdAt: new Date(Date.now() - (i * 86400000)), // Stagger creation dates
          updatedAt: new Date()
        });
      }
    }

    const insertedApplications = await db.insert(applications).values(applicationsData).returning();
    console.log(`✅ Created ${insertedApplications.length} applications\n`);

    // ====================
    // 6. Create Auditions
    // ====================
    console.log('🎤 Creating auditions...');

    const shortlistedApplications = insertedApplications.filter(app => 
      app.status === 'shortlisted' || app.status === 'auditioned'
    );

    const auditionsData = shortlistedApplications.map((app, index) => ({
      applicationId: app.id,
      scheduledAt: new Date(Date.now() + ((index + 1) * 86400000)), // Future dates
      duration: 30 + (index * 10), // 30-60 minutes
      location: index % 2 === 0 ? 'Dharma Productions Office, Khar' : 'YRF Studios, Andheri',
      isOnline: index % 3 === 0,
      meetingLink: index % 3 === 0 ? 'https://zoom.us/j/123456789' : null,
      instructions: 'Please arrive 15 minutes early. Bring your portfolio and prepare a 2-minute monologue.',
      script: 'Scene 12: Emotional confrontation between lead characters. Focus on subtle expressions.',
      requirements: {
        documents: ['Portfolio', 'Headshots'],
        preparation: 'Monologue from provided script',
        dresscode: 'Casual contemporary'
      },
      status: index % 2 === 0 ? 'scheduled' as const : 'completed' as const,
      feedback: index % 2 !== 0 ? 'Good performance, natural expressions. Need to work on voice modulation.' : null,
      rating: index % 2 !== 0 ? 4 : null,
      evaluatedBy: index % 2 !== 0 ? producerUsers[0].id : null,
      evaluatedAt: index % 2 !== 0 ? new Date() : null,
      recordingUrl: index % 2 !== 0 ? 'https://castmatch-storage.s3.ap-south-1.amazonaws.com/auditions/recording1.mp4' : null,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const insertedAuditions = await db.insert(auditions).values(auditionsData).returning();
    console.log(`✅ Created ${insertedAuditions.length} auditions\n`);

    // ====================
    // 7. Create Notifications
    // ====================
    console.log('🔔 Creating notifications...');

    const notificationsData = [];
    
    // Application notifications
    shortlistedApplications.forEach(app => {
      notificationsData.push({
        userId: app.talentId,
        type: 'application',
        title: 'Application Shortlisted!',
        message: 'Congratulations! Your application has been shortlisted. You will receive audition details soon.',
        data: { applicationId: app.id },
        isRead: Math.random() > 0.5,
        readAt: Math.random() > 0.5 ? new Date() : null,
        createdAt: new Date(Date.now() - (Math.random() * 604800000)), // Within last week
      });
    });
    
    // Audition notifications
    insertedAuditions.forEach(audition => {
      const app = shortlistedApplications.find(a => a.id === audition.applicationId);
      if (app) {
        notificationsData.push({
          userId: app.talentId,
          type: 'audition',
          title: 'Audition Scheduled',
          message: `Your audition is scheduled for ${new Date(audition.scheduledAt).toLocaleDateString()}`,
          data: { auditionId: audition.id },
          isRead: false,
          readAt: null,
          createdAt: new Date(),
        });
      }
    });
    
    // System notifications
    insertedUsers.forEach(user => {
      notificationsData.push({
        userId: user.id,
        type: 'system',
        title: 'Welcome to CastMatch!',
        message: 'Your account has been successfully created. Complete your profile to get started.',
        data: { welcome: true },
        isRead: true,
        readAt: new Date(),
        createdAt: user.createdAt,
      });
    });

    const insertedNotifications = await db.insert(notifications).values(notificationsData).returning();
    console.log(`✅ Created ${insertedNotifications.length} notifications\n`);

    // ====================
    // 8. Create Conversations and Messages
    // ====================
    console.log('💬 Creating conversations and messages...');

    // Create a few sample conversations for actors
    const conversationsData = actorUsers.slice(0, 3).map((actor, index) => ({
      userId: actor.id,
      title: `Career Guidance - ${actor.firstName}`,
      description: 'AI assistant helping with casting opportunities',
      context: {
        userRole: 'actor',
        interests: ['Bollywood', 'Web Series'],
        experience: '2-3 years'
      },
      isActive: true,
      lastMessageAt: new Date(),
      messageCount: 3 + index,
      createdAt: new Date(Date.now() - (index * 86400000)),
      updatedAt: new Date()
    }));

    const insertedConversations = await db.insert(conversations).values(conversationsData).returning();
    console.log(`✅ Created ${insertedConversations.length} conversations\n`);

    // Create sample messages
    const messagesData = [];
    insertedConversations.forEach((conv, convIndex) => {
      // User message
      messagesData.push({
        conversationId: conv.id,
        userId: conv.userId,
        type: 'text' as const,
        content: 'Can you help me find suitable roles for my profile?',
        metadata: {},
        isAiResponse: false,
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
      });
      
      // AI response
      messagesData.push({
        conversationId: conv.id,
        userId: null,
        type: 'text' as const,
        content: `Based on your profile, I found ${3 + convIndex} suitable roles matching your skills in Hindi cinema and web series. Would you like me to show you the details?`,
        metadata: { model: 'gpt-4' },
        isAiResponse: true,
        createdAt: new Date(Date.now() - 3000000), // 50 minutes ago
      });
      
      // Follow-up
      messagesData.push({
        conversationId: conv.id,
        userId: conv.userId,
        type: 'text' as const,
        content: 'Yes, please show me the roles.',
        metadata: {},
        isAiResponse: false,
        createdAt: new Date(Date.now() - 2400000), // 40 minutes ago
      });
    });

    const insertedMessages = await db.insert(messages).values(messagesData).returning();
    console.log(`✅ Created ${insertedMessages.length} messages\n`);

    // ====================
    // 9. Create Memory entries
    // ====================
    console.log('🧠 Creating memory entries...');

    const memoriesData = [];
    
    actorUsers.slice(0, 3).forEach((actor, index) => {
      const conversation = insertedConversations[index];
      
      // User preferences
      memoriesData.push({
        userId: actor.id,
        conversationId: conversation?.id || null,
        type: 'long_term' as const,
        category: 'preference',
        key: 'preferred_roles',
        value: { roles: ['Lead', 'Supporting'], genres: ['Drama', 'Romance'] },
        importance: '8.50',
        accessCount: 5,
        lastAccessedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // User requirements
      memoriesData.push({
        userId: actor.id,
        conversationId: conversation?.id || null,
        type: 'semantic' as const,
        category: 'requirement',
        key: 'location_preference',
        value: { preferred: 'Mumbai', canTravel: index % 2 === 0 },
        importance: '7.00',
        accessCount: 3,
        lastAccessedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Short-term context
      memoriesData.push({
        userId: actor.id,
        conversationId: conversation?.id || null,
        type: 'short_term' as const,
        category: 'context',
        key: 'recent_search',
        value: { query: 'romantic lead roles', timestamp: Date.now() },
        importance: '5.00',
        accessCount: 1,
        lastAccessedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000), // Expires in 24 hours
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });

    const insertedMemories = await db.insert(memories).values(memoriesData).returning();
    console.log(`✅ Created ${insertedMemories.length} memory entries\n`);

    // ====================
    // Summary
    // ====================
    console.log('📊 Database Seeding Complete!');
    console.log('================================');
    console.log(`✅ Users: ${insertedUsers.length}`);
    console.log(`✅ Talent Profiles: ${insertedTalentProfiles.length}`);
    console.log(`✅ Projects: ${insertedProjects.length}`);
    console.log(`✅ Project Roles: ${insertedProjectRoles.length}`);
    console.log(`✅ Applications: ${insertedApplications.length}`);
    console.log(`✅ Auditions: ${insertedAuditions.length}`);
    console.log(`✅ Notifications: ${insertedNotifications.length}`);
    console.log(`✅ Conversations: ${insertedConversations.length}`);
    console.log(`✅ Messages: ${insertedMessages.length}`);
    console.log(`✅ Memory Entries: ${insertedMemories.length}`);
    console.log('================================\n');
    
    console.log('🎉 Sample Login Credentials:');
    console.log('----------------------------');
    console.log('Casting Director: mukesh.chhabra@castmatch.com / Password123!');
    console.log('Producer: karan.johar@castmatch.com / Password123!');
    console.log('Actor: arjun.mehta@castmatch.com / Password123!');
    console.log('Admin: admin@castmatch.com / Password123!');
    console.log('----------------------------\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the seeding function
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✨ Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

export default seedDatabase;