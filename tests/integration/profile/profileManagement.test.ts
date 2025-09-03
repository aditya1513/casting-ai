import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { app } from '@/server';
import { S3ServiceMock } from '../../mocks/s3Service.mock';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

describe('Profile Management Integration Tests', () => {
  let server: any;
  let authToken: string;
  let testUser: any;

  beforeAll(async () => {
    // Start test server
    server = app.listen(5003);
    
    // Setup S3 mock
    S3ServiceMock.setup({ trackCalls: true });
    
    // Clean database
    await prisma.$executeRaw`TRUNCATE TABLE "User", "Profile", "Media" CASCADE`;
    
    // Create test user
    const hashedPassword = await bcrypt.hash('TestPass123!', 10);
    testUser = await prisma.user.create({
      data: {
        email: 'profiletest@example.com',
        password: hashedPassword,
        firstName: 'Profile',
        lastName: 'Test',
        role: 'ACTOR',
        verified: true
      }
    });
    
    // Generate auth token
    authToken = jwt.sign(
      { userId: testUser.id, email: testUser.email, role: testUser.role },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
    server.close();
  });

  beforeEach(async () => {
    S3ServiceMock.clearUploadedFiles();
  });

  describe('GET /api/profile/:userId', () => {
    it('should get user profile successfully', async () => {
      // Create profile
      await prisma.profile.create({
        data: {
          userId: testUser.id,
          bio: 'Test bio',
          location: 'Mumbai, India',
          website: 'https://example.com',
          socialLinks: {
            linkedin: 'https://linkedin.com/in/test',
            twitter: 'https://twitter.com/test'
          }
        }
      });

      const response = await request(app)
        .get(`/api/profile/${testUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.profile).toHaveProperty('bio', 'Test bio');
      expect(response.body.data.profile).toHaveProperty('location', 'Mumbai, India');
      expect(response.body.data.profile.socialLinks).toHaveProperty('linkedin');
    });

    it('should return 404 for non-existent profile', async () => {
      const response = await request(app)
        .get('/api/profile/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Profile not found');
    });

    it('should handle privacy settings', async () => {
      // Create private profile
      const privateUser = await prisma.user.create({
        data: {
          email: 'private@example.com',
          password: 'hashedpassword',
          firstName: 'Private',
          lastName: 'User',
          role: 'ACTOR',
          verified: true
        }
      });

      await prisma.profile.create({
        data: {
          userId: privateUser.id,
          bio: 'Private bio',
          privacy: {
            showEmail: false,
            showPhone: false,
            showProfile: false
          }
        }
      });

      const response = await request(app)
        .get(`/api/profile/${privateUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.error).toContain('Profile is private');
    });
  });

  describe('PUT /api/profile', () => {
    it('should update profile successfully', async () => {
      const updateData = {
        bio: 'Updated bio',
        location: 'Delhi, India',
        website: 'https://newsite.com',
        skills: ['Acting', 'Dancing'],
        languages: ['Hindi', 'English', 'Marathi'],
        experience: '5 years'
      };

      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.profile).toHaveProperty('bio', 'Updated bio');
      expect(response.body.data.profile).toHaveProperty('location', 'Delhi, India');
      expect(response.body.data.profile.skills).toContain('Acting');
      expect(response.body.data.profile.languages).toHaveLength(3);
    });

    it('should validate profile data', async () => {
      const invalidData = {
        bio: 'a'.repeat(1001), // Too long
        website: 'not-a-url',
        age: -5,
        height: 300 // Unrealistic
      };

      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.errors).toBeDefined();
    });

    it('should handle role-specific profile fields', async () => {
      // Create casting director user
      const castingDirector = await prisma.user.create({
        data: {
          email: 'director@example.com',
          password: 'hashedpassword',
          firstName: 'Casting',
          lastName: 'Director',
          role: 'CASTING_DIRECTOR',
          verified: true
        }
      });

      const directorToken = jwt.sign(
        { userId: castingDirector.id, email: castingDirector.email, role: 'CASTING_DIRECTOR' },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      const directorData = {
        bio: 'Senior Casting Director',
        company: 'Big Production House',
        position: 'Head of Casting',
        yearsOfExperience: 15,
        specializations: ['Film', 'Web Series'],
        notableProjects: [
          { title: 'Hit Movie 1', year: 2022, role: 'Casting Director' },
          { title: 'Popular Series', year: 2023, role: 'Casting Director' }
        ]
      };

      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${directorToken}`)
        .send(directorData)
        .expect(200);

      expect(response.body.data.profile.company).toBe('Big Production House');
      expect(response.body.data.profile.yearsOfExperience).toBe(15);
      expect(response.body.data.profile.notableProjects).toHaveLength(2);
    });
  });

  describe('POST /api/profile/avatar', () => {
    it('should upload profile picture successfully', async () => {
      // Create mock file buffer
      const fileBuffer = Buffer.from('mock image data');
      
      const response = await request(app)
        .post('/api/profile/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', fileBuffer, 'profile.jpg')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('avatarUrl');
      
      // Verify S3 mock was called
      expect(S3ServiceMock.getFileCount()).toBe(1);
      
      // Verify database was updated
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUser.id }
      });
      expect(updatedUser?.profilePicture).toBeDefined();
    });

    it('should validate file type', async () => {
      const fileBuffer = Buffer.from('mock file data');
      
      const response = await request(app)
        .post('/api/profile/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', fileBuffer, 'document.pdf')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Invalid file type');
    });

    it('should validate file size', async () => {
      // Create large file buffer (> 5MB)
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024);
      
      const response = await request(app)
        .post('/api/profile/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', largeBuffer, 'large.jpg')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('File too large');
    });

    it('should delete old avatar when uploading new one', async () => {
      // Upload first avatar
      const firstBuffer = Buffer.from('first image');
      await request(app)
        .post('/api/profile/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', firstBuffer, 'first.jpg')
        .expect(200);

      const firstFileCount = S3ServiceMock.getFileCount();

      // Upload second avatar
      const secondBuffer = Buffer.from('second image');
      const response = await request(app)
        .post('/api/profile/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', secondBuffer, 'second.jpg')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      // Old file should be deleted, new file uploaded
      expect(S3ServiceMock.getFileCount()).toBe(firstFileCount);
    });
  });

  describe('POST /api/profile/documents', () => {
    it('should upload documents successfully', async () => {
      const resumeBuffer = Buffer.from('resume content');
      
      const response = await request(app)
        .post('/api/profile/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .field('documentType', 'resume')
        .attach('document', resumeBuffer, 'resume.pdf')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('documentUrl');
      expect(response.body.data).toHaveProperty('documentType', 'resume');
      
      // Verify media record created
      const media = await prisma.media.findFirst({
        where: { userId: testUser.id, type: 'DOCUMENT' }
      });
      expect(media).toBeDefined();
    });

    it('should handle multiple document types', async () => {
      const documents = [
        { type: 'resume', filename: 'resume.pdf' },
        { type: 'portfolio', filename: 'portfolio.pdf' },
        { type: 'certificates', filename: 'certificate.pdf' }
      ];

      for (const doc of documents) {
        const buffer = Buffer.from(`${doc.type} content`);
        const response = await request(app)
          .post('/api/profile/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .field('documentType', doc.type)
          .attach('document', buffer, doc.filename)
          .expect(200);

        expect(response.body.data.documentType).toBe(doc.type);
      }

      // Verify all documents uploaded
      const mediaCount = await prisma.media.count({
        where: { userId: testUser.id, type: 'DOCUMENT' }
      });
      expect(mediaCount).toBe(3);
    });

    it('should enforce document limits per user', async () => {
      // Upload maximum allowed documents (assume 10)
      for (let i = 0; i < 10; i++) {
        const buffer = Buffer.from(`document ${i}`);
        await request(app)
          .post('/api/profile/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .field('documentType', `document_${i}`)
          .attach('document', buffer, `doc${i}.pdf`);
      }

      // Try to upload one more
      const extraBuffer = Buffer.from('extra document');
      const response = await request(app)
        .post('/api/profile/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .field('documentType', 'extra')
        .attach('document', extraBuffer, 'extra.pdf')
        .expect(400);

      expect(response.body.error).toContain('Document limit reached');
    });
  });

  describe('POST /api/profile/showreel', () => {
    it('should upload showreel video successfully', async () => {
      const videoBuffer = Buffer.from('video content');
      
      const response = await request(app)
        .post('/api/profile/showreel')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('video', videoBuffer, 'showreel.mp4')
        .field('title', 'My Acting Showreel')
        .field('description', 'Best performances compilation')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('videoUrl');
      expect(response.body.data).toHaveProperty('title', 'My Acting Showreel');
      
      // Verify media record
      const media = await prisma.media.findFirst({
        where: { userId: testUser.id, type: 'VIDEO' }
      });
      expect(media).toBeDefined();
      expect(media?.title).toBe('My Acting Showreel');
    });

    it('should validate video file format', async () => {
      const invalidBuffer = Buffer.from('not a video');
      
      const response = await request(app)
        .post('/api/profile/showreel')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('video', invalidBuffer, 'document.pdf')
        .field('title', 'Invalid Video')
        .expect(400);

      expect(response.body.error).toContain('Invalid video format');
    });

    it('should enforce video size limits', async () => {
      // Create large video buffer (> 100MB)
      const largeBuffer = Buffer.alloc(101 * 1024 * 1024);
      
      const response = await request(app)
        .post('/api/profile/showreel')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('video', largeBuffer, 'large.mp4')
        .field('title', 'Large Video')
        .expect(400);

      expect(response.body.error).toContain('Video file too large');
    });
  });

  describe('DELETE /api/profile/media/:mediaId', () => {
    it('should delete media successfully', async () => {
      // Create media record
      const media = await prisma.media.create({
        data: {
          userId: testUser.id,
          type: 'IMAGE',
          url: 'https://example.com/image.jpg',
          key: 'images/test.jpg',
          title: 'Test Image'
        }
      });

      const response = await request(app)
        .delete(`/api/profile/media/${media.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('deleted');
      
      // Verify media deleted from database
      const deletedMedia = await prisma.media.findUnique({
        where: { id: media.id }
      });
      expect(deletedMedia).toBeNull();
    });

    it('should prevent deleting other users media', async () => {
      // Create another user
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          password: 'hashedpassword',
          firstName: 'Other',
          lastName: 'User',
          role: 'ACTOR',
          verified: true
        }
      });

      // Create media for other user
      const otherMedia = await prisma.media.create({
        data: {
          userId: otherUser.id,
          type: 'IMAGE',
          url: 'https://example.com/other.jpg',
          key: 'images/other.jpg'
        }
      });

      const response = await request(app)
        .delete(`/api/profile/media/${otherMedia.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.error).toContain('Not authorized');
    });
  });

  describe('PUT /api/profile/privacy', () => {
    it('should update privacy settings', async () => {
      const privacySettings = {
        showEmail: false,
        showPhone: false,
        showProfile: true,
        allowMessages: true,
        allowAuditionInvites: true
      };

      const response = await request(app)
        .put('/api/profile/privacy')
        .set('Authorization', `Bearer ${authToken}`)
        .send(privacySettings)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.privacy).toMatchObject(privacySettings);
      
      // Verify in database
      const profile = await prisma.profile.findUnique({
        where: { userId: testUser.id }
      });
      expect(profile?.privacy).toMatchObject(privacySettings);
    });
  });

  describe('PUT /api/profile/preferences', () => {
    it('should update user preferences', async () => {
      const preferences = {
        emailNotifications: {
          auditions: true,
          messages: true,
          roleMatches: true,
          newsletter: false
        },
        language: 'en',
        timezone: 'Asia/Kolkata',
        dateFormat: 'DD/MM/YYYY'
      };

      const response = await request(app)
        .put('/api/profile/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(preferences)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.preferences.language).toBe('en');
      expect(response.body.data.preferences.timezone).toBe('Asia/Kolkata');
    });
  });

  describe('GET /api/profile/completeness', () => {
    it('should calculate profile completeness', async () => {
      // Create partial profile
      await prisma.profile.create({
        data: {
          userId: testUser.id,
          bio: 'Test bio',
          location: 'Mumbai'
          // Missing other fields
        }
      });

      const response = await request(app)
        .get('/api/profile/completeness')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('completeness');
      expect(response.body.data).toHaveProperty('missingFields');
      expect(response.body.data.completeness).toBeGreaterThan(0);
      expect(response.body.data.completeness).toBeLessThan(100);
      expect(response.body.data.missingFields).toContain('skills');
    });

    it('should show 100% for complete profile', async () => {
      // Create complete profile
      await prisma.profile.upsert({
        where: { userId: testUser.id },
        update: {
          bio: 'Complete bio',
          location: 'Mumbai, India',
          skills: ['Acting', 'Dancing'],
          languages: ['Hindi', 'English'],
          experience: '5 years',
          website: 'https://example.com',
          socialLinks: {
            linkedin: 'https://linkedin.com/in/test'
          }
        },
        create: {
          userId: testUser.id,
          bio: 'Complete bio',
          location: 'Mumbai, India',
          skills: ['Acting', 'Dancing'],
          languages: ['Hindi', 'English'],
          experience: '5 years',
          website: 'https://example.com',
          socialLinks: {
            linkedin: 'https://linkedin.com/in/test'
          }
        }
      });

      // Add profile picture
      await prisma.user.update({
        where: { id: testUser.id },
        data: { profilePicture: 'https://example.com/avatar.jpg' }
      });

      // Add media
      await prisma.media.create({
        data: {
          userId: testUser.id,
          type: 'VIDEO',
          url: 'https://example.com/showreel.mp4',
          key: 'videos/showreel.mp4'
        }
      });

      const response = await request(app)
        .get('/api/profile/completeness')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.completeness).toBe(100);
      expect(response.body.data.missingFields).toHaveLength(0);
    });
  });
});