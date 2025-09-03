"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const globals_1 = require("@jest/globals");
const client_1 = require("@prisma/client");
const server_1 = require("@/server");
const s3Service_mock_1 = require("../../mocks/s3Service.mock");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
(0, globals_1.describe)('Profile Management Integration Tests', () => {
    let server;
    let authToken;
    let testUser;
    (0, globals_1.beforeAll)(async () => {
        server = server_1.app.listen(5003);
        s3Service_mock_1.S3ServiceMock.setup({ trackCalls: true });
        await prisma.$executeRaw `TRUNCATE TABLE "User", "Profile", "Media" CASCADE`;
        const hashedPassword = await bcryptjs_1.default.hash('TestPass123!', 10);
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
        authToken = jsonwebtoken_1.default.sign({ userId: testUser.id, email: testUser.email, role: testUser.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    });
    (0, globals_1.afterAll)(async () => {
        await prisma.$disconnect();
        server.close();
    });
    (0, globals_1.beforeEach)(async () => {
        s3Service_mock_1.S3ServiceMock.clearUploadedFiles();
    });
    (0, globals_1.describe)('GET /api/profile/:userId', () => {
        (0, globals_1.it)('should get user profile successfully', async () => {
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
            const response = await (0, supertest_1.default)(server_1.app)
                .get(`/api/profile/${testUser.id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('success', true);
            (0, globals_1.expect)(response.body.data.profile).toHaveProperty('bio', 'Test bio');
            (0, globals_1.expect)(response.body.data.profile).toHaveProperty('location', 'Mumbai, India');
            (0, globals_1.expect)(response.body.data.profile.socialLinks).toHaveProperty('linkedin');
        });
        (0, globals_1.it)('should return 404 for non-existent profile', async () => {
            const response = await (0, supertest_1.default)(server_1.app)
                .get('/api/profile/non-existent-id')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
            (0, globals_1.expect)(response.body).toHaveProperty('success', false);
            (0, globals_1.expect)(response.body.error).toContain('Profile not found');
        });
        (0, globals_1.it)('should handle privacy settings', async () => {
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
            const response = await (0, supertest_1.default)(server_1.app)
                .get(`/api/profile/${privateUser.id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(403);
            (0, globals_1.expect)(response.body.error).toContain('Profile is private');
        });
    });
    (0, globals_1.describe)('PUT /api/profile', () => {
        (0, globals_1.it)('should update profile successfully', async () => {
            const updateData = {
                bio: 'Updated bio',
                location: 'Delhi, India',
                website: 'https://newsite.com',
                skills: ['Acting', 'Dancing'],
                languages: ['Hindi', 'English', 'Marathi'],
                experience: '5 years'
            };
            const response = await (0, supertest_1.default)(server_1.app)
                .put('/api/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('success', true);
            (0, globals_1.expect)(response.body.data.profile).toHaveProperty('bio', 'Updated bio');
            (0, globals_1.expect)(response.body.data.profile).toHaveProperty('location', 'Delhi, India');
            (0, globals_1.expect)(response.body.data.profile.skills).toContain('Acting');
            (0, globals_1.expect)(response.body.data.profile.languages).toHaveLength(3);
        });
        (0, globals_1.it)('should validate profile data', async () => {
            const invalidData = {
                bio: 'a'.repeat(1001),
                website: 'not-a-url',
                age: -5,
                height: 300
            };
            const response = await (0, supertest_1.default)(server_1.app)
                .put('/api/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidData)
                .expect(400);
            (0, globals_1.expect)(response.body).toHaveProperty('success', false);
            (0, globals_1.expect)(response.body.errors).toBeDefined();
        });
        (0, globals_1.it)('should handle role-specific profile fields', async () => {
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
            const directorToken = jsonwebtoken_1.default.sign({ userId: castingDirector.id, email: castingDirector.email, role: 'CASTING_DIRECTOR' }, process.env.JWT_SECRET, { expiresIn: '1h' });
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
            const response = await (0, supertest_1.default)(server_1.app)
                .put('/api/profile')
                .set('Authorization', `Bearer ${directorToken}`)
                .send(directorData)
                .expect(200);
            (0, globals_1.expect)(response.body.data.profile.company).toBe('Big Production House');
            (0, globals_1.expect)(response.body.data.profile.yearsOfExperience).toBe(15);
            (0, globals_1.expect)(response.body.data.profile.notableProjects).toHaveLength(2);
        });
    });
    (0, globals_1.describe)('POST /api/profile/avatar', () => {
        (0, globals_1.it)('should upload profile picture successfully', async () => {
            const fileBuffer = Buffer.from('mock image data');
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/profile/avatar')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('avatar', fileBuffer, 'profile.jpg')
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('success', true);
            (0, globals_1.expect)(response.body.data).toHaveProperty('avatarUrl');
            (0, globals_1.expect)(s3Service_mock_1.S3ServiceMock.getFileCount()).toBe(1);
            const updatedUser = await prisma.user.findUnique({
                where: { id: testUser.id }
            });
            (0, globals_1.expect)(updatedUser?.profilePicture).toBeDefined();
        });
        (0, globals_1.it)('should validate file type', async () => {
            const fileBuffer = Buffer.from('mock file data');
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/profile/avatar')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('avatar', fileBuffer, 'document.pdf')
                .expect(400);
            (0, globals_1.expect)(response.body).toHaveProperty('success', false);
            (0, globals_1.expect)(response.body.error).toContain('Invalid file type');
        });
        (0, globals_1.it)('should validate file size', async () => {
            const largeBuffer = Buffer.alloc(6 * 1024 * 1024);
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/profile/avatar')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('avatar', largeBuffer, 'large.jpg')
                .expect(400);
            (0, globals_1.expect)(response.body).toHaveProperty('success', false);
            (0, globals_1.expect)(response.body.error).toContain('File too large');
        });
        (0, globals_1.it)('should delete old avatar when uploading new one', async () => {
            const firstBuffer = Buffer.from('first image');
            await (0, supertest_1.default)(server_1.app)
                .post('/api/profile/avatar')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('avatar', firstBuffer, 'first.jpg')
                .expect(200);
            const firstFileCount = s3Service_mock_1.S3ServiceMock.getFileCount();
            const secondBuffer = Buffer.from('second image');
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/profile/avatar')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('avatar', secondBuffer, 'second.jpg')
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('success', true);
            (0, globals_1.expect)(s3Service_mock_1.S3ServiceMock.getFileCount()).toBe(firstFileCount);
        });
    });
    (0, globals_1.describe)('POST /api/profile/documents', () => {
        (0, globals_1.it)('should upload documents successfully', async () => {
            const resumeBuffer = Buffer.from('resume content');
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/profile/documents')
                .set('Authorization', `Bearer ${authToken}`)
                .field('documentType', 'resume')
                .attach('document', resumeBuffer, 'resume.pdf')
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('success', true);
            (0, globals_1.expect)(response.body.data).toHaveProperty('documentUrl');
            (0, globals_1.expect)(response.body.data).toHaveProperty('documentType', 'resume');
            const media = await prisma.media.findFirst({
                where: { userId: testUser.id, type: 'DOCUMENT' }
            });
            (0, globals_1.expect)(media).toBeDefined();
        });
        (0, globals_1.it)('should handle multiple document types', async () => {
            const documents = [
                { type: 'resume', filename: 'resume.pdf' },
                { type: 'portfolio', filename: 'portfolio.pdf' },
                { type: 'certificates', filename: 'certificate.pdf' }
            ];
            for (const doc of documents) {
                const buffer = Buffer.from(`${doc.type} content`);
                const response = await (0, supertest_1.default)(server_1.app)
                    .post('/api/profile/documents')
                    .set('Authorization', `Bearer ${authToken}`)
                    .field('documentType', doc.type)
                    .attach('document', buffer, doc.filename)
                    .expect(200);
                (0, globals_1.expect)(response.body.data.documentType).toBe(doc.type);
            }
            const mediaCount = await prisma.media.count({
                where: { userId: testUser.id, type: 'DOCUMENT' }
            });
            (0, globals_1.expect)(mediaCount).toBe(3);
        });
        (0, globals_1.it)('should enforce document limits per user', async () => {
            for (let i = 0; i < 10; i++) {
                const buffer = Buffer.from(`document ${i}`);
                await (0, supertest_1.default)(server_1.app)
                    .post('/api/profile/documents')
                    .set('Authorization', `Bearer ${authToken}`)
                    .field('documentType', `document_${i}`)
                    .attach('document', buffer, `doc${i}.pdf`);
            }
            const extraBuffer = Buffer.from('extra document');
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/profile/documents')
                .set('Authorization', `Bearer ${authToken}`)
                .field('documentType', 'extra')
                .attach('document', extraBuffer, 'extra.pdf')
                .expect(400);
            (0, globals_1.expect)(response.body.error).toContain('Document limit reached');
        });
    });
    (0, globals_1.describe)('POST /api/profile/showreel', () => {
        (0, globals_1.it)('should upload showreel video successfully', async () => {
            const videoBuffer = Buffer.from('video content');
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/profile/showreel')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('video', videoBuffer, 'showreel.mp4')
                .field('title', 'My Acting Showreel')
                .field('description', 'Best performances compilation')
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('success', true);
            (0, globals_1.expect)(response.body.data).toHaveProperty('videoUrl');
            (0, globals_1.expect)(response.body.data).toHaveProperty('title', 'My Acting Showreel');
            const media = await prisma.media.findFirst({
                where: { userId: testUser.id, type: 'VIDEO' }
            });
            (0, globals_1.expect)(media).toBeDefined();
            (0, globals_1.expect)(media?.title).toBe('My Acting Showreel');
        });
        (0, globals_1.it)('should validate video file format', async () => {
            const invalidBuffer = Buffer.from('not a video');
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/profile/showreel')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('video', invalidBuffer, 'document.pdf')
                .field('title', 'Invalid Video')
                .expect(400);
            (0, globals_1.expect)(response.body.error).toContain('Invalid video format');
        });
        (0, globals_1.it)('should enforce video size limits', async () => {
            const largeBuffer = Buffer.alloc(101 * 1024 * 1024);
            const response = await (0, supertest_1.default)(server_1.app)
                .post('/api/profile/showreel')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('video', largeBuffer, 'large.mp4')
                .field('title', 'Large Video')
                .expect(400);
            (0, globals_1.expect)(response.body.error).toContain('Video file too large');
        });
    });
    (0, globals_1.describe)('DELETE /api/profile/media/:mediaId', () => {
        (0, globals_1.it)('should delete media successfully', async () => {
            const media = await prisma.media.create({
                data: {
                    userId: testUser.id,
                    type: 'IMAGE',
                    url: 'https://example.com/image.jpg',
                    key: 'images/test.jpg',
                    title: 'Test Image'
                }
            });
            const response = await (0, supertest_1.default)(server_1.app)
                .delete(`/api/profile/media/${media.id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('success', true);
            (0, globals_1.expect)(response.body.message).toContain('deleted');
            const deletedMedia = await prisma.media.findUnique({
                where: { id: media.id }
            });
            (0, globals_1.expect)(deletedMedia).toBeNull();
        });
        (0, globals_1.it)('should prevent deleting other users media', async () => {
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
            const otherMedia = await prisma.media.create({
                data: {
                    userId: otherUser.id,
                    type: 'IMAGE',
                    url: 'https://example.com/other.jpg',
                    key: 'images/other.jpg'
                }
            });
            const response = await (0, supertest_1.default)(server_1.app)
                .delete(`/api/profile/media/${otherMedia.id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(403);
            (0, globals_1.expect)(response.body.error).toContain('Not authorized');
        });
    });
    (0, globals_1.describe)('PUT /api/profile/privacy', () => {
        (0, globals_1.it)('should update privacy settings', async () => {
            const privacySettings = {
                showEmail: false,
                showPhone: false,
                showProfile: true,
                allowMessages: true,
                allowAuditionInvites: true
            };
            const response = await (0, supertest_1.default)(server_1.app)
                .put('/api/profile/privacy')
                .set('Authorization', `Bearer ${authToken}`)
                .send(privacySettings)
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('success', true);
            (0, globals_1.expect)(response.body.data.privacy).toMatchObject(privacySettings);
            const profile = await prisma.profile.findUnique({
                where: { userId: testUser.id }
            });
            (0, globals_1.expect)(profile?.privacy).toMatchObject(privacySettings);
        });
    });
    (0, globals_1.describe)('PUT /api/profile/preferences', () => {
        (0, globals_1.it)('should update user preferences', async () => {
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
            const response = await (0, supertest_1.default)(server_1.app)
                .put('/api/profile/preferences')
                .set('Authorization', `Bearer ${authToken}`)
                .send(preferences)
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('success', true);
            (0, globals_1.expect)(response.body.data.preferences.language).toBe('en');
            (0, globals_1.expect)(response.body.data.preferences.timezone).toBe('Asia/Kolkata');
        });
    });
    (0, globals_1.describe)('GET /api/profile/completeness', () => {
        (0, globals_1.it)('should calculate profile completeness', async () => {
            await prisma.profile.create({
                data: {
                    userId: testUser.id,
                    bio: 'Test bio',
                    location: 'Mumbai'
                }
            });
            const response = await (0, supertest_1.default)(server_1.app)
                .get('/api/profile/completeness')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            (0, globals_1.expect)(response.body).toHaveProperty('success', true);
            (0, globals_1.expect)(response.body.data).toHaveProperty('completeness');
            (0, globals_1.expect)(response.body.data).toHaveProperty('missingFields');
            (0, globals_1.expect)(response.body.data.completeness).toBeGreaterThan(0);
            (0, globals_1.expect)(response.body.data.completeness).toBeLessThan(100);
            (0, globals_1.expect)(response.body.data.missingFields).toContain('skills');
        });
        (0, globals_1.it)('should show 100% for complete profile', async () => {
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
            await prisma.user.update({
                where: { id: testUser.id },
                data: { profilePicture: 'https://example.com/avatar.jpg' }
            });
            await prisma.media.create({
                data: {
                    userId: testUser.id,
                    type: 'VIDEO',
                    url: 'https://example.com/showreel.mp4',
                    key: 'videos/showreel.mp4'
                }
            });
            const response = await (0, supertest_1.default)(server_1.app)
                .get('/api/profile/completeness')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            (0, globals_1.expect)(response.body.data.completeness).toBe(100);
            (0, globals_1.expect)(response.body.data.missingFields).toHaveLength(0);
        });
    });
});
//# sourceMappingURL=profileManagement.test.js.map