"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createS3ServiceMock = exports.S3ServiceMock = void 0;
const globals_1 = require("@jest/globals");
const crypto_1 = __importDefault(require("crypto"));
class S3ServiceMock {
    static uploadedFiles = new Map();
    static options = {};
    static setup(options = {}) {
        this.options = options;
        this.uploadedFiles.clear();
    }
    static async uploadFile(file, folder = 'uploads') {
        if (this.options.delay) {
            await new Promise(resolve => setTimeout(resolve, this.options.delay));
        }
        if (this.options.shouldFail) {
            throw new Error('S3 service unavailable');
        }
        if (this.options.maxFileSize && file.size > this.options.maxFileSize) {
            throw new Error(`File size exceeds maximum allowed size of ${this.options.maxFileSize} bytes`);
        }
        if (this.options.allowedMimeTypes && !this.options.allowedMimeTypes.includes(file.mimetype)) {
            throw new Error(`File type ${file.mimetype} is not allowed`);
        }
        const fileKey = `${folder}/${Date.now()}-${crypto_1.default.randomBytes(8).toString('hex')}-${file.originalname}`;
        const fileUrl = `https://mock-s3-bucket.s3.amazonaws.com/${fileKey}`;
        const uploadedFile = {
            key: fileKey,
            url: fileUrl,
            size: file.size,
            mimetype: file.mimetype,
            originalName: file.originalname,
            uploadedAt: new Date(),
            metadata: {
                folder,
                contentType: file.mimetype,
                contentLength: file.size
            }
        };
        this.uploadedFiles.set(fileKey, uploadedFile);
        return {
            Location: fileUrl,
            Key: fileKey,
            Bucket: 'mock-s3-bucket',
            ETag: `"${crypto_1.default.randomBytes(16).toString('hex')}"`,
            ServerSideEncryption: 'AES256'
        };
    }
    static async uploadProfilePicture(userId, file) {
        const result = await this.uploadFile(file, `profile-pictures/${userId}`);
        return {
            url: result.Location,
            key: result.Key
        };
    }
    static async uploadDocument(userId, file, documentType) {
        const result = await this.uploadFile(file, `documents/${userId}/${documentType}`);
        return {
            url: result.Location,
            key: result.Key,
            documentType
        };
    }
    static async uploadVideo(projectId, file, videoType) {
        const result = await this.uploadFile(file, `videos/${projectId}/${videoType}`);
        return {
            url: result.Location,
            key: result.Key,
            videoType,
            duration: Math.floor(Math.random() * 300) + 30
        };
    }
    static async deleteFile(key) {
        if (this.options.delay) {
            await new Promise(resolve => setTimeout(resolve, this.options.delay));
        }
        if (this.options.shouldFail) {
            throw new Error('S3 service unavailable');
        }
        if (!this.uploadedFiles.has(key)) {
            throw new Error('File not found');
        }
        this.uploadedFiles.delete(key);
        return {
            DeleteMarker: true,
            VersionId: crypto_1.default.randomBytes(16).toString('hex')
        };
    }
    static async getSignedUrl(key, expiresIn = 3600) {
        if (this.options.shouldFail) {
            throw new Error('S3 service unavailable');
        }
        if (!this.uploadedFiles.has(key)) {
            throw new Error('File not found');
        }
        const file = this.uploadedFiles.get(key);
        const signature = crypto_1.default.randomBytes(32).toString('hex');
        return `${file.url}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=mock&X-Amz-Date=${new Date().toISOString()}&X-Amz-Expires=${expiresIn}&X-Amz-Signature=${signature}`;
    }
    static async getUploadPresignedUrl(key, contentType, expiresIn = 3600) {
        if (this.options.shouldFail) {
            throw new Error('S3 service unavailable');
        }
        const signature = crypto_1.default.randomBytes(32).toString('hex');
        const url = `https://mock-s3-bucket.s3.amazonaws.com/${key}`;
        return {
            url: `${url}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=mock&X-Amz-Date=${new Date().toISOString()}&X-Amz-Expires=${expiresIn}&X-Amz-Signature=${signature}`,
            fields: {
                'Content-Type': contentType,
                'key': key,
                'bucket': 'mock-s3-bucket',
                'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
                'X-Amz-Credential': 'mock-credentials',
                'X-Amz-Date': new Date().toISOString(),
                'Policy': Buffer.from(JSON.stringify({ expiration: new Date(Date.now() + expiresIn * 1000) })).toString('base64'),
                'X-Amz-Signature': signature
            }
        };
    }
    static async copyFile(sourceKey, destinationKey) {
        if (this.options.shouldFail) {
            throw new Error('S3 service unavailable');
        }
        const sourceFile = this.uploadedFiles.get(sourceKey);
        if (!sourceFile) {
            throw new Error('Source file not found');
        }
        const copiedFile = {
            ...sourceFile,
            key: destinationKey,
            url: `https://mock-s3-bucket.s3.amazonaws.com/${destinationKey}`,
            copiedFrom: sourceKey,
            copiedAt: new Date()
        };
        this.uploadedFiles.set(destinationKey, copiedFile);
        return {
            CopyObjectResult: {
                ETag: `"${crypto_1.default.randomBytes(16).toString('hex')}"`,
                LastModified: new Date()
            }
        };
    }
    static getUploadedFiles() {
        return Array.from(this.uploadedFiles.values());
    }
    static getFile(key) {
        return this.uploadedFiles.get(key);
    }
    static getFileCount() {
        return this.uploadedFiles.size;
    }
    static hasFile(key) {
        return this.uploadedFiles.has(key);
    }
    static getTotalSize() {
        return Array.from(this.uploadedFiles.values())
            .reduce((total, file) => total + file.size, 0);
    }
    static clearUploadedFiles() {
        this.uploadedFiles.clear();
    }
    static reset() {
        this.uploadedFiles.clear();
        this.options = {};
    }
}
exports.S3ServiceMock = S3ServiceMock;
const createS3ServiceMock = () => {
    return {
        uploadFile: globals_1.jest.fn().mockImplementation(S3ServiceMock.uploadFile.bind(S3ServiceMock)),
        uploadProfilePicture: globals_1.jest.fn().mockImplementation(S3ServiceMock.uploadProfilePicture.bind(S3ServiceMock)),
        uploadDocument: globals_1.jest.fn().mockImplementation(S3ServiceMock.uploadDocument.bind(S3ServiceMock)),
        uploadVideo: globals_1.jest.fn().mockImplementation(S3ServiceMock.uploadVideo.bind(S3ServiceMock)),
        deleteFile: globals_1.jest.fn().mockImplementation(S3ServiceMock.deleteFile.bind(S3ServiceMock)),
        getSignedUrl: globals_1.jest.fn().mockImplementation(S3ServiceMock.getSignedUrl.bind(S3ServiceMock)),
        getUploadPresignedUrl: globals_1.jest.fn().mockImplementation(S3ServiceMock.getUploadPresignedUrl.bind(S3ServiceMock)),
        copyFile: globals_1.jest.fn().mockImplementation(S3ServiceMock.copyFile.bind(S3ServiceMock))
    };
};
exports.createS3ServiceMock = createS3ServiceMock;
//# sourceMappingURL=s3Service.mock.js.map