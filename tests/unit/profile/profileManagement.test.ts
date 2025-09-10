/**
 * Profile Management Tests
 * Comprehensive testing for profile features with validation and permissions
 */

import request from 'supertest';
import { PrismaClient, UserRole } from '@prisma/client';
import { app } from '../../../src/app';
import { createMockUser, createMockProfile, createMockTokens } from '../../factories/user.factory';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';

describe('Profile Management Tests', () => {
  let prisma: PrismaClient;
  let authToken: string;
  let actorToken: string;
  let castingDirectorToken: string;
  let producerToken: string;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/castmatch_test'
        }
      }
    });

    await prisma.$executeRaw`TRUNCATE TABLE "User", "UserProfile", "Session" CASCADE`;

    // Create test users with different roles
    const actor = await prisma.user.create({
      data: {
        ...createMockUser({ role: UserRole.ACTOR }),
        profile: {
          create: createMockProfile()
        }
      }
    });

    const castingDirector = await prisma.user.create({
      data: {
        ...createMockUser({ role: UserRole.CASTING_DIRECTOR }),
        profile: {
          create: createMockProfile()
        }
      }
    });

    const producer = await prisma.user.create({
      data: {
        ...createMockUser({ role: UserRole.PRODUCER }),
        profile: {
          create: createMockProfile()
        }
      }
    });

    // Generate auth tokens
    actorToken = createMockTokens().accessToken;
    castingDirectorToken = createMockTokens().accessToken;
    producerToken = createMockTokens().accessToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Profile Creation and Updates', () => {
    it('should create profile during registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newactor@castmatch.ai',
          password: 'SecurePass123!',
          firstName: 'New',
          lastName: 'Actor',
          role: UserRole.ACTOR
        });

      expect(response.status).toBe(201);
      
      const user = await prisma.user.findUnique({
        where: { email: 'newactor@castmatch.ai' },
        include: { profile: true }
      });

      expect(user?.profile).toBeTruthy();
      expect(user?.profile?.firstName).toBe('New');
      expect(user?.profile?.lastName).toBe('Actor');
    });

    it('should update profile with valid data', async () => {
      const updateData = {
        bio: 'Award-winning actor with 10 years of experience',
        location: 'Mumbai, Maharashtra',
        languages: ['English', 'Hindi', 'Marathi'],
        skills: ['Method Acting', 'Voice Modulation', 'Dance', 'Combat'],
        dateOfBirth: '1990-05-15',
        gender: 'MALE',
        phoneNumber: '+919876543210'
      };

      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${actorToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.profile).toMatchObject({
        bio: updateData.bio,
        location: updateData.location,
        languages: updateData.languages,
        skills: updateData.skills
      });
    });

    it('should validate required fields', async () => {
      const invalidData = {
        phoneNumber: 'invalid-phone',
        dateOfBirth: 'not-a-date',
        email: 'not-an-email'
      };

      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${actorToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('should calculate profile completion score', async () => {
      const response = await request(app)
        .get('/api/profile/completion')
        .set('Authorization', `Bearer ${actorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('completionScore');
      expect(response.body.data).toHaveProperty('missingFields');
      expect(response.body.data.completionScore).toBeGreaterThanOrEqual(0);
      expect(response.body.data.completionScore).toBeLessThanOrEqual(100);
    });

    it('should sanitize HTML in text fields', async () => {
      const maliciousData = {
        bio: '<script>alert("XSS")</script>Talented actor',
        firstName: '<img src=x onerror=alert("XSS")>John'
      };

      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${actorToken}`)
        .send(maliciousData);

      expect(response.status).toBe(200);
      expect(response.body.data.profile.bio).not.toContain('<script>');
      expect(response.body.data.profile.firstName).not.toContain('<img');
    });
  });

  describe('File Upload Management', () => {
    it('should upload profile avatar', async () => {
      const form = new FormData();
      form.append('avatar', Buffer.from('fake-image-data'), {
        filename: 'avatar.jpg',
        contentType: 'image/jpeg'
      });

      const response = await request(app)
        .post('/api/profile/avatar')
        .set('Authorization', `Bearer ${actorToken}`)
        .set('Content-Type', `multipart/form-data; boundary=${form.getBoundary()}`)
        .send(form.getBuffer());

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('avatarUrl');
    });

    it('should validate file size limits', async () => {
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
      const form = new FormData();
      form.append('avatar', largeBuffer, {
        filename: 'large.jpg',
        contentType: 'image/jpeg'
      });

      const response = await request(app)
        .post('/api/profile/avatar')
        .set('Authorization', `Bearer ${actorToken}`)
        .set('Content-Type', `multipart/form-data; boundary=${form.getBoundary()}`)
        .send(form.getBuffer());

      expect(response.status).toBe(413);
      expect(response.body.message).toContain('File too large');
    });

    it('should validate file types', async () => {
      const form = new FormData();
      form.append('avatar', Buffer.from('malicious-code'), {
        filename: 'virus.exe',
        contentType: 'application/x-executable'
      });

      const response = await request(app)
        .post('/api/profile/avatar')
        .set('Authorization', `Bearer ${actorToken}`)
        .set('Content-Type', `multipart/form-data; boundary=${form.getBoundary()}`)
        .send(form.getBuffer());

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid file type');
    });

    it('should upload resume/portfolio documents', async () => {
      const form = new FormData();
      form.append('document', Buffer.from('resume-content'), {
        filename: 'resume.pdf',
        contentType: 'application/pdf'
      });
      form.append('type', 'resume');

      const response = await request(app)
        .post('/api/profile/documents')
        .set('Authorization', `Bearer ${actorToken}`)
        .set('Content-Type', `multipart/form-data; boundary=${form.getBoundary()}`)
        .send(form.getBuffer());

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('documentUrl');
    });

    it('should delete uploaded files', async () => {
      // First upload a file
      const uploadResponse = await request(app)
        .post('/api/profile/avatar')
        .set('Authorization', `Bearer ${actorToken}`)
        .attach('avatar', Buffer.from('image-data'), 'avatar.jpg');

      const avatarUrl = uploadResponse.body.data.avatarUrl;

      // Then delete it
      const deleteResponse = await request(app)
        .delete('/api/profile/avatar')
        .set('Authorization', `Bearer ${actorToken}`);

      expect(deleteResponse.status).toBe(200);
      
      // Verify file is deleted
      const profile = await prisma.userProfile.findFirst({
        where: { userId: uploadResponse.body.data.userId }
      });
      expect(profile?.avatarUrl).toBeNull();
    });
  });

  describe('Role-Based Permissions', () => {
    it('should allow actors to edit their own profile', async () => {
      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${actorToken}`)
        .send({
          bio: 'Updated actor bio'
        });

      expect(response.status).toBe(200);
    });

    it('should prevent actors from editing other profiles', async () => {
      const otherUser = await prisma.user.create({
        data: createMockUser({ email: 'other@castmatch.ai' })
      });

      const response = await request(app)
        .put(`/api/profile/${otherUser.id}`)
        .set('Authorization', `Bearer ${actorToken}`)
        .send({
          bio: 'Trying to edit someone else'
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Permission denied');
    });

    it('should allow casting directors to view actor profiles', async () => {
      const actor = await prisma.user.findFirst({
        where: { role: UserRole.ACTOR }
      });

      const response = await request(app)
        .get(`/api/profile/${actor?.id}`)
        .set('Authorization', `Bearer ${castingDirectorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.profile).toBeDefined();
    });

    it('should hide private profiles from unauthorized users', async () => {
      const privateUser = await prisma.user.create({
        data: {
          ...createMockUser({ email: 'private@castmatch.ai' }),
          profile: {
            create: {
              ...createMockProfile(),
              isPublic: false
            }
          }
        }
      });

      const response = await request(app)
        .get(`/api/profile/${privateUser.id}`)
        .set('Authorization', `Bearer ${actorToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Profile is private');
    });

    it('should allow producers to access all profiles', async () => {
      const privateUser = await prisma.user.findFirst({
        where: { 
          profile: {
            isPublic: false
          }
        }
      });

      const response = await request(app)
        .get(`/api/profile/${privateUser?.id}`)
        .set('Authorization', `Bearer ${producerToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Profile Privacy Settings', () => {
    it('should update privacy preferences', async () => {
      const privacySettings = {
        isPublic: false,
        showEmail: false,
        showPhone: false,
        showAge: false,
        allowMessages: true,
        allowNotifications: true
      };

      const response = await request(app)
        .put('/api/profile/privacy')
        .set('Authorization', `Bearer ${actorToken}`)
        .send(privacySettings);

      expect(response.status).toBe(200);
      expect(response.body.data.preferences).toMatchObject(privacySettings);
    });

    it('should respect privacy settings in public view', async () => {
      const user = await prisma.user.create({
        data: {
          ...createMockUser({ email: 'privacy-test@castmatch.ai' }),
          profile: {
            create: {
              ...createMockProfile(),
              phoneNumber: '+919876543210',
              preferences: {
                showPhone: false,
                showEmail: false
              }
            }
          }
        }
      });

      const response = await request(app)
        .get(`/api/profile/${user.id}/public`);

      expect(response.status).toBe(200);
      expect(response.body.data.profile.phoneNumber).toBeUndefined();
      expect(response.body.data.email).toBeUndefined();
    });
  });

  describe('Profile Search and Filtering', () => {
    beforeAll(async () => {
      // Create test profiles with various attributes
      const profiles = [
        {
          firstName: 'John',
          lastName: 'Doe',
          skills: ['Acting', 'Singing'],
          location: 'Mumbai',
          languages: ['English', 'Hindi']
        },
        {
          firstName: 'Jane',
          lastName: 'Smith',
          skills: ['Dancing', 'Acting'],
          location: 'Delhi',
          languages: ['English', 'Punjabi']
        },
        {
          firstName: 'Mike',
          lastName: 'Johnson',
          skills: ['Voice Acting', 'Comedy'],
          location: 'Mumbai',
          languages: ['English', 'Marathi']
        }
      ];

      for (const profile of profiles) {
        await prisma.user.create({
          data: {
            email: `${profile.firstName.toLowerCase()}@test.com`,
            password: 'hash',
            role: UserRole.ACTOR,
            profile: {
              create: profile
            }
          }
        });
      }
    });

    it('should search profiles by name', async () => {
      const response = await request(app)
        .get('/api/profiles/search')
        .query({ q: 'John' })
        .set('Authorization', `Bearer ${castingDirectorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.profiles).toHaveLength(2); // John and Johnson
    });

    it('should filter profiles by skills', async () => {
      const response = await request(app)
        .get('/api/profiles/search')
        .query({ skills: 'Acting,Singing' })
        .set('Authorization', `Bearer ${castingDirectorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.profiles.length).toBeGreaterThan(0);
      response.body.data.profiles.forEach(profile => {
        const hasSkill = profile.skills.some(skill => 
          ['Acting', 'Singing'].includes(skill)
        );
        expect(hasSkill).toBe(true);
      });
    });

    it('should filter profiles by location', async () => {
      const response = await request(app)
        .get('/api/profiles/search')
        .query({ location: 'Mumbai' })
        .set('Authorization', `Bearer ${castingDirectorToken}`);

      expect(response.status).toBe(200);
      response.body.data.profiles.forEach(profile => {
        expect(profile.location).toContain('Mumbai');
      });
    });

    it('should filter profiles by languages', async () => {
      const response = await request(app)
        .get('/api/profiles/search')
        .query({ languages: 'Hindi' })
        .set('Authorization', `Bearer ${castingDirectorToken}`);

      expect(response.status).toBe(200);
      response.body.data.profiles.forEach(profile => {
        expect(profile.languages).toContain('Hindi');
      });
    });

    it('should paginate search results', async () => {
      const response = await request(app)
        .get('/api/profiles/search')
        .query({ 
          page: 1,
          limit: 2
        })
        .set('Authorization', `Bearer ${castingDirectorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.profiles.length).toBeLessThanOrEqual(2);
      expect(response.body.data).toHaveProperty('totalCount');
      expect(response.body.data).toHaveProperty('currentPage');
      expect(response.body.data).toHaveProperty('totalPages');
    });
  });

  describe('Profile Validation Rules', () => {
    it('should validate age restrictions for actors', async () => {
      const underageDate = new Date();
      underageDate.setFullYear(underageDate.getFullYear() - 10); // 10 years old

      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${actorToken}`)
        .send({
          dateOfBirth: underageDate.toISOString()
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Minimum age requirement');
    });

    it('should validate phone number format', async () => {
      const invalidPhones = [
        '123456',
        'not-a-phone',
        '+1234567890123456', // Too long
        '91987654321' // Missing +
      ];

      for (const phone of invalidPhones) {
        const response = await request(app)
          .put('/api/profile')
          .set('Authorization', `Bearer ${actorToken}`)
          .send({
            phoneNumber: phone
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Invalid phone number');
      }
    });

    it('should validate URL formats for social links', async () => {
      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${actorToken}`)
        .send({
          socialLinks: {
            instagram: 'not-a-url',
            twitter: 'javascript:alert("xss")',
            linkedin: 'https://linkedin.com/in/valid-profile'
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('Invalid URL');
    });

    it('should limit bio and description lengths', async () => {
      const longText = 'a'.repeat(5001); // Exceeds 5000 char limit

      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${actorToken}`)
        .send({
          bio: longText
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('exceeds maximum length');
    });

    it('should validate skills against predefined list', async () => {
      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${actorToken}`)
        .send({
          skills: ['Acting', 'InvalidSkill', 'Dancing']
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid skill');
    });
  });

  describe('Profile Verification', () => {
    it('should submit profile for verification', async () => {
      const response = await request(app)
        .post('/api/profile/verify')
        .set('Authorization', `Bearer ${actorToken}`)
        .send({
          documentType: 'passport',
          documentNumber: 'A1234567',
          documentUrl: 'https://s3.amazonaws.com/docs/passport.pdf'
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('verificationStatus', 'PENDING');
    });

    it('should check verification status', async () => {
      const response = await request(app)
        .get('/api/profile/verification-status')
        .set('Authorization', `Bearer ${actorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('verificationStatus');
      expect(['PENDING', 'VERIFIED', 'REJECTED', 'NOT_SUBMITTED'])
        .toContain(response.body.data.verificationStatus);
    });

    it('should display verified badge on public profile', async () => {
      const verifiedUser = await prisma.user.create({
        data: {
          ...createMockUser({ email: 'verified@castmatch.ai' }),
          profile: {
            create: {
              ...createMockProfile(),
              isVerified: true,
              verifiedAt: new Date()
            }
          }
        }
      });

      const response = await request(app)
        .get(`/api/profile/${verifiedUser.id}/public`);

      expect(response.status).toBe(200);
      expect(response.body.data.profile.isVerified).toBe(true);
      expect(response.body.data.profile).toHaveProperty('verifiedAt');
    });
  });
});