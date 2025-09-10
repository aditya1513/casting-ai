/**
 * Role-Based Access Control (RBAC) Integration Tests
 * Testing permissions and access control across different user roles
 */

import request from 'supertest';
import { PrismaClient, UserRole } from '@prisma/client';
import { app } from '../../src/app';
import { createMockUser, createMockProfile, createMockTokens } from '../factories/user.factory';
import jwt from 'jsonwebtoken';

describe('Role-Based Access Control Tests', () => {
  let prisma: PrismaClient;
  let actors: any[] = [];
  let castingDirectors: any[] = [];
  let producers: any[] = [];
  let admin: any;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/castmatch_test'
        }
      }
    });

    await prisma.$executeRaw`TRUNCATE TABLE "User", "UserProfile", "Session", "Project", "Audition" CASCADE`;

    // Create test users for each role
    for (let i = 0; i < 3; i++) {
      const actor = await prisma.user.create({
        data: {
          ...createMockUser({
            email: `actor${i}@castmatch.ai`,
            role: UserRole.ACTOR
          }),
          profile: {
            create: {
              ...createMockProfile(),
              isPublic: i === 0 ? true : false // First actor has public profile
            }
          }
        },
        include: { profile: true }
      });
      actors.push(actor);

      const castingDirector = await prisma.user.create({
        data: {
          ...createMockUser({
            email: `director${i}@castmatch.ai`,
            role: UserRole.CASTING_DIRECTOR
          }),
          profile: {
            create: createMockProfile()
          }
        },
        include: { profile: true }
      });
      castingDirectors.push(castingDirector);

      const producer = await prisma.user.create({
        data: {
          ...createMockUser({
            email: `producer${i}@castmatch.ai`,
            role: UserRole.PRODUCER
          }),
          profile: {
            create: createMockProfile()
          }
        },
        include: { profile: true }
      });
      producers.push(producer);
    }

    // Create admin user
    admin = await prisma.user.create({
      data: {
        ...createMockUser({
          email: 'admin@castmatch.ai',
          role: UserRole.ADMIN
        }),
        profile: {
          create: createMockProfile()
        }
      },
      include: { profile: true }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Helper function to generate auth token for user
  const generateAuthToken = (user: any) => {
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      process.env.JWT_SECRET || 'test-secret'
    );
  };

  describe('Profile Access Control', () => {
    it('should allow users to view their own profile', async () => {
      const actor = actors[0];
      const token = generateAuthToken(actor);

      const response = await request(app)
        .get(`/api/profile/${actor.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.profile.id).toBe(actor.profile.id);
    });

    it('should allow users to edit their own profile', async () => {
      const actor = actors[0];
      const token = generateAuthToken(actor);

      const response = await request(app)
        .put(`/api/profile`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          bio: 'Updated bio by the actor themselves'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.profile.bio).toBe('Updated bio by the actor themselves');
    });

    it('should prevent actors from editing other actors profiles', async () => {
      const actor1 = actors[0];
      const actor2 = actors[1];
      const token = generateAuthToken(actor1);

      const response = await request(app)
        .put(`/api/profile/${actor2.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          bio: 'Trying to edit someone else profile'
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Permission denied');
    });

    it('should allow casting directors to view public actor profiles', async () => {
      const castingDirector = castingDirectors[0];
      const publicActor = actors[0]; // Has public profile
      const token = generateAuthToken(castingDirector);

      const response = await request(app)
        .get(`/api/profile/${publicActor.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.profile).toBeDefined();
    });

    it('should prevent casting directors from viewing private actor profiles', async () => {
      const castingDirector = castingDirectors[0];
      const privateActor = actors[1]; // Has private profile
      const token = generateAuthToken(castingDirector);

      const response = await request(app)
        .get(`/api/profile/${privateActor.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Profile is private');
    });

    it('should allow producers to view all profiles regardless of privacy', async () => {
      const producer = producers[0];
      const privateActor = actors[1]; // Has private profile
      const token = generateAuthToken(producer);

      const response = await request(app)
        .get(`/api/profile/${privateActor.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.profile).toBeDefined();
    });

    it('should allow admins to view and edit any profile', async () => {
      const token = generateAuthToken(admin);
      const actor = actors[0];

      // View profile
      const viewResponse = await request(app)
        .get(`/api/profile/${actor.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(viewResponse.status).toBe(200);

      // Edit profile
      const editResponse = await request(app)
        .put(`/api/profile/${actor.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          bio: 'Edited by admin'
        });

      expect(editResponse.status).toBe(200);
    });
  });

  describe('Search and Discovery Access Control', () => {
    it('should allow casting directors to search actor profiles', async () => {
      const castingDirector = castingDirectors[0];
      const token = generateAuthToken(castingDirector);

      const response = await request(app)
        .get('/api/profiles/search')
        .query({ role: 'ACTOR', skills: 'Acting' })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.profiles).toBeDefined();
      expect(Array.isArray(response.body.data.profiles)).toBe(true);
    });

    it('should allow producers to search all profiles', async () => {
      const producer = producers[0];
      const token = generateAuthToken(producer);

      const response = await request(app)
        .get('/api/profiles/search')
        .query({ role: 'CASTING_DIRECTOR' })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.profiles).toBeDefined();
    });

    it('should prevent actors from searching other actors', async () => {
      const actor = actors[0];
      const token = generateAuthToken(actor);

      const response = await request(app)
        .get('/api/profiles/search')
        .query({ role: 'ACTOR' })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Insufficient permissions');
    });

    it('should return only public profiles in search for casting directors', async () => {
      const castingDirector = castingDirectors[0];
      const token = generateAuthToken(castingDirector);

      const response = await request(app)
        .get('/api/profiles/search')
        .query({ role: 'ACTOR' })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      
      // Should only return public profiles
      const publicProfiles = response.body.data.profiles.filter(profile => profile.isPublic === true);
      expect(publicProfiles.length).toBe(response.body.data.profiles.length);
    });
  });

  describe('Project and Audition Management', () => {
    let project: any;

    beforeAll(async () => {
      // Create a test project
      project = await prisma.project.create({
        data: {
          title: 'Test Movie Project',
          description: 'A test project for RBAC testing',
          status: 'ACTIVE',
          createdById: producers[0].id,
          requirements: {
            roles: ['Lead Actor', 'Supporting Actor'],
            skills: ['Acting', 'Dancing'],
            languages: ['Hindi', 'English']
          }
        }
      });
    });

    it('should allow producers to create projects', async () => {
      const producer = producers[0];
      const token = generateAuthToken(producer);

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'New Producer Project',
          description: 'A project created by producer',
          requirements: {
            roles: ['Villain'],
            skills: ['Acting'],
            languages: ['Hindi']
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.data.project.createdById).toBe(producer.id);
    });

    it('should prevent actors from creating projects', async () => {
      const actor = actors[0];
      const token = generateAuthToken(actor);

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Actor Trying to Create Project',
          description: 'This should fail'
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Insufficient permissions');
    });

    it('should allow casting directors to view assigned projects', async () => {
      // Assign casting director to project
      await prisma.projectCastingDirector.create({
        data: {
          projectId: project.id,
          castingDirectorId: castingDirectors[0].id
        }
      });

      const castingDirector = castingDirectors[0];
      const token = generateAuthToken(castingDirector);

      const response = await request(app)
        .get(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.project.id).toBe(project.id);
    });

    it('should prevent casting directors from viewing unassigned projects', async () => {
      const castingDirector = castingDirectors[1]; // Not assigned to project
      const token = generateAuthToken(castingDirector);

      const response = await request(app)
        .get(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Access denied');
    });

    it('should allow assigned casting directors to create auditions', async () => {
      const castingDirector = castingDirectors[0]; // Already assigned to project
      const token = generateAuthToken(castingDirector);

      const response = await request(app)
        .post('/api/auditions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          projectId: project.id,
          title: 'Lead Actor Audition',
          description: 'Audition for the main character',
          scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          requirements: {
            age: { min: 25, max: 35 },
            gender: 'MALE',
            skills: ['Acting']
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.data.audition.projectId).toBe(project.id);
    });

    it('should allow actors to apply for auditions', async () => {
      // First create an audition
      const audition = await prisma.audition.create({
        data: {
          projectId: project.id,
          title: 'Open Audition',
          description: 'Open for all actors',
          scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdById: castingDirectors[0].id,
          status: 'OPEN'
        }
      });

      const actor = actors[0];
      const token = generateAuthToken(actor);

      const response = await request(app)
        .post(`/api/auditions/${audition.id}/apply`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          notes: 'I am very interested in this role'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.application.auditionId).toBe(audition.id);
      expect(response.body.data.application.actorId).toBe(actor.id);
    });

    it('should prevent actors from viewing other actors audition applications', async () => {
      const actor1 = actors[0];
      const actor2 = actors[1];
      const token1 = generateAuthToken(actor1);

      // Create application by actor2
      const audition = await prisma.audition.create({
        data: {
          projectId: project.id,
          title: 'Another Audition',
          description: 'Test audition',
          scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdById: castingDirectors[0].id,
          status: 'OPEN'
        }
      });

      await prisma.auditionApplication.create({
        data: {
          auditionId: audition.id,
          actorId: actor2.id,
          notes: 'Actor2 application'
        }
      });

      // Actor1 tries to view actor2's application
      const response = await request(app)
        .get(`/api/auditions/${audition.id}/applications`)
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Administrative Functions', () => {
    it('should allow admins to view system statistics', async () => {
      const token = generateAuthToken(admin);

      const response = await request(app)
        .get('/api/admin/statistics')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('userCounts');
      expect(response.body.data).toHaveProperty('projectCounts');
    });

    it('should prevent non-admins from accessing admin endpoints', async () => {
      const producer = producers[0];
      const token = generateAuthToken(producer);

      const response = await request(app)
        .get('/api/admin/statistics')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Admin access required');
    });

    it('should allow admins to manage user accounts', async () => {
      const token = generateAuthToken(admin);
      const targetUser = actors[0];

      // Deactivate user
      const deactivateResponse = await request(app)
        .put(`/api/admin/users/${targetUser.id}/deactivate`)
        .set('Authorization', `Bearer ${token}`);

      expect(deactivateResponse.status).toBe(200);

      // Verify user is deactivated
      const userCheck = await prisma.user.findUnique({
        where: { id: targetUser.id }
      });
      expect(userCheck?.isActive).toBe(false);

      // Reactivate user
      const reactivateResponse = await request(app)
        .put(`/api/admin/users/${targetUser.id}/activate`)
        .set('Authorization', `Bearer ${token}`);

      expect(reactivateResponse.status).toBe(200);
    });

    it('should allow admins to change user roles', async () => {
      const token = generateAuthToken(admin);
      const targetUser = actors[2]; // Use third actor to avoid conflicts

      const response = await request(app)
        .put(`/api/admin/users/${targetUser.id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          newRole: 'CASTING_DIRECTOR'
        });

      expect(response.status).toBe(200);

      // Verify role change
      const updatedUser = await prisma.user.findUnique({
        where: { id: targetUser.id }
      });
      expect(updatedUser?.role).toBe('CASTING_DIRECTOR');
    });
  });

  describe('Data Access Patterns', () => {
    it('should filter data based on role in list endpoints', async () => {
      // Casting director should only see projects they're assigned to
      const castingDirector = castingDirectors[0];
      const token = generateAuthToken(castingDirector);

      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      
      // Should only return projects where they are assigned
      const projects = response.body.data.projects;
      for (const project of projects) {
        const assignment = await prisma.projectCastingDirector.findFirst({
          where: {
            projectId: project.id,
            castingDirectorId: castingDirector.id
          }
        });
        expect(assignment).toBeTruthy();
      }
    });

    it('should include role-appropriate fields in responses', async () => {
      const actor = actors[0];
      const castingDirector = castingDirectors[0];
      const actorToken = generateAuthToken(actor);
      const directorToken = generateAuthToken(castingDirector);

      // Actor viewing their own profile should see sensitive data
      const actorResponse = await request(app)
        .get(`/api/profile/${actor.id}`)
        .set('Authorization', `Bearer ${actorToken}`);

      expect(actorResponse.status).toBe(200);
      expect(actorResponse.body.data).toHaveProperty('email');
      expect(actorResponse.body.data).toHaveProperty('phoneNumber');

      // Casting director viewing actor profile should see limited data
      const directorResponse = await request(app)
        .get(`/api/profile/${actor.id}`)
        .set('Authorization', `Bearer ${directorToken}`);

      expect(directorResponse.status).toBe(200);
      expect(directorResponse.body.data.profile).toBeDefined();
      expect(directorResponse.body.data).not.toHaveProperty('email');
      expect(directorResponse.body.data).not.toHaveProperty('phoneNumber');
    });
  });

  describe('Permission Inheritance and Hierarchies', () => {
    it('should respect permission hierarchies', async () => {
      // Admin should have all permissions that producers have
      const adminToken = generateAuthToken(admin);

      // Should be able to create projects (producer permission)
      const createProjectResponse = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Admin Created Project',
          description: 'Project created by admin with producer permissions'
        });

      expect(createProjectResponse.status).toBe(201);

      // Should be able to search profiles (casting director permission)
      const searchResponse = await request(app)
        .get('/api/profiles/search')
        .query({ role: 'ACTOR' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(searchResponse.status).toBe(200);
    });

    it('should handle temporary role elevation', async () => {
      // Producer temporarily acting as casting director on a project
      const producer = producers[0];
      const token = generateAuthToken(producer);

      // Should be able to create auditions for their own projects
      const response = await request(app)
        .post('/api/auditions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          projectId: project.id,
          title: 'Producer-Created Audition',
          description: 'Audition created directly by producer'
        });

      expect(response.status).toBe(201);
    });
  });

  describe('Security Edge Cases', () => {
    it('should prevent privilege escalation through parameter manipulation', async () => {
      const actor = actors[0];
      const token = generateAuthToken(actor);

      // Try to set admin role in profile update
      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          bio: 'Updated bio',
          role: 'ADMIN' // Should be ignored
        });

      expect(response.status).toBe(200);
      
      // Verify role wasn't changed
      const user = await prisma.user.findUnique({
        where: { id: actor.id }
      });
      expect(user?.role).toBe('ACTOR');
    });

    it('should validate ownership in nested resource access', async () => {
      const actor1 = actors[0];
      const actor2 = actors[1];
      const token1 = generateAuthToken(actor1);

      // Create audition application for actor2
      const audition = await prisma.audition.create({
        data: {
          projectId: project.id,
          title: 'Ownership Test Audition',
          description: 'Testing ownership validation',
          scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdById: castingDirectors[0].id,
          status: 'OPEN'
        }
      });

      const application = await prisma.auditionApplication.create({
        data: {
          auditionId: audition.id,
          actorId: actor2.id,
          notes: 'Actor2 application'
        }
      });

      // Actor1 tries to modify actor2's application
      const response = await request(app)
        .put(`/api/auditions/${audition.id}/applications/${application.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          notes: 'Trying to modify someone elses application'
        });

      expect(response.status).toBe(403);
    });

    it('should handle concurrent role changes gracefully', async () => {
      const testUser = await prisma.user.create({
        data: createMockUser({
          email: 'concurrent.test@castmatch.ai',
          role: UserRole.ACTOR
        })
      });

      const token = generateAuthToken(testUser);
      const adminToken = generateAuthToken(admin);

      // Simulate concurrent operations
      const userOperationPromise = request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ bio: 'Actor updating profile' });

      const adminOperationPromise = request(app)
        .put(`/api/admin/users/${testUser.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newRole: 'CASTING_DIRECTOR' });

      const [userResult, adminResult] = await Promise.allSettled([
        userOperationPromise,
        adminOperationPromise
      ]);

      // Both operations should either succeed or fail gracefully
      if (userResult.status === 'fulfilled') {
        expect([200, 403]).toContain(userResult.value.status);
      }
      
      if (adminResult.status === 'fulfilled') {
        expect(adminResult.value.status).toBe(200);
      }
    });
  });
});