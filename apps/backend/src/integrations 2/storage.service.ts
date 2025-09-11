import AWS from 'aws-sdk';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { Request } from 'express';
import { logger } from '../utils/logger';
import sharp from 'sharp';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';

/**
 * Cloud Storage Service Integration (AWS S3)
 * Handles file uploads, image processing, and storage management
 */

export interface StorageFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  bucket: string;
  key: string;
  location: string;
  etag: string;
}

export interface UploadOptions {
  folder?: string;
  maxSize?: number;
  allowedTypes?: string[];
  resize?: {
    width?: number;
    height?: number;
    quality?: number;
  };
  generateThumbnail?: boolean;
  metadata?: Record<string, string>;
}

export interface SignedUrlOptions {
  expires?: number;
  responseContentType?: string;
  responseContentDisposition?: string;
}

// File type configurations
const FILE_CONFIGS = {
  images: {
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    maxSize: 10 * 1024 * 1024, // 10MB
    folder: 'images',
  },
  headshots: {
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
    maxSize: 5 * 1024 * 1024, // 5MB
    folder: 'headshots',
    resize: { width: 1200, height: 1600, quality: 90 },
    generateThumbnail: true,
  },
  scripts: {
    allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    maxSize: 20 * 1024 * 1024, // 20MB
    folder: 'scripts',
  },
  videos: {
    allowedTypes: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/mpeg'],
    maxSize: 500 * 1024 * 1024, // 500MB
    folder: 'videos',
  },
  resumes: {
    allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    maxSize: 5 * 1024 * 1024, // 5MB
    folder: 'resumes',
  },
};

class StorageService {
  private s3: AWS.S3;
  private bucketName: string;
  private region: string;
  private localUploadPath: string = './uploads';
  private isS3Configured: boolean = false;

  constructor() {
    this.bucketName = process.env.S3_BUCKET_NAME || 'castmatch-uploads';
    this.region = process.env.AWS_REGION || 'us-east-1';
    
    // Initialize S3 client
    this.initializeS3();
    
    // Ensure local upload directory exists
    this.ensureLocalUploadDir();
  }

  private initializeS3() {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (accessKeyId && secretAccessKey) {
      AWS.config.update({
        accessKeyId,
        secretAccessKey,
        region: this.region,
      });

      this.s3 = new AWS.S3({
        signatureVersion: 'v4',
      });

      this.isS3Configured = true;
      logger.info('AWS S3 storage service initialized');
      
      // Verify bucket exists
      this.verifyBucket();
    } else {
      logger.warn('AWS credentials not provided. Files will be stored locally.');
      this.s3 = new AWS.S3(); // Create dummy instance
    }
  }

  private async verifyBucket() {
    if (!this.isS3Configured) return;

    try {
      await this.s3.headBucket({ Bucket: this.bucketName }).promise();
      logger.info(`S3 bucket ${this.bucketName} verified`);
    } catch (error: any) {
      if (error.code === 'NotFound') {
        logger.info(`Creating S3 bucket ${this.bucketName}`);
        await this.createBucket();
      } else {
        logger.error(`Error verifying S3 bucket:`, error);
      }
    }
  }

  private async createBucket() {
    try {
      await this.s3.createBucket({
        Bucket: this.bucketName,
        CreateBucketConfiguration: {
          LocationConstraint: this.region === 'us-east-1' ? undefined : this.region,
        },
      }).promise();

      // Set bucket policy for public read access to certain folders
      await this.setBucketPolicy();
      
      // Enable versioning
      await this.s3.putBucketVersioning({
        Bucket: this.bucketName,
        VersioningConfiguration: {
          Status: 'Enabled',
        },
      }).promise();

      // Configure lifecycle rules
      await this.configureBucketLifecycle();

      logger.info(`S3 bucket ${this.bucketName} created successfully`);
    } catch (error) {
      logger.error('Error creating S3 bucket:', error);
      throw error;
    }
  }

  private async setBucketPolicy() {
    const publicFolders = ['headshots', 'images'];
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: 's3:GetObject',
          Resource: publicFolders.map(folder => `arn:aws:s3:::${this.bucketName}/${folder}/*`),
        },
      ],
    };

    try {
      await this.s3.putBucketPolicy({
        Bucket: this.bucketName,
        Policy: JSON.stringify(policy),
      }).promise();
    } catch (error) {
      logger.error('Error setting bucket policy:', error);
    }
  }

  private async configureBucketLifecycle() {
    const rules = [
      {
        Id: 'DeleteOldTempFiles',
        Status: 'Enabled',
        Prefix: 'temp/',
        Expiration: {
          Days: 1,
        },
      },
      {
        Id: 'ArchiveOldFiles',
        Status: 'Enabled',
        Transitions: [
          {
            Days: 90,
            StorageClass: 'STANDARD_IA',
          },
          {
            Days: 365,
            StorageClass: 'GLACIER',
          },
        ],
      },
    ];

    try {
      await this.s3.putBucketLifecycleConfiguration({
        Bucket: this.bucketName,
        LifecycleConfiguration: {
          Rules: rules,
        },
      }).promise();
    } catch (error) {
      logger.error('Error configuring bucket lifecycle:', error);
    }
  }

  private async ensureLocalUploadDir() {
    try {
      await fs.mkdir(this.localUploadPath, { recursive: true });
      await fs.mkdir(path.join(this.localUploadPath, 'temp'), { recursive: true });
      await fs.mkdir(path.join(this.localUploadPath, 'images'), { recursive: true });
      await fs.mkdir(path.join(this.localUploadPath, 'headshots'), { recursive: true });
      await fs.mkdir(path.join(this.localUploadPath, 'scripts'), { recursive: true });
      await fs.mkdir(path.join(this.localUploadPath, 'videos'), { recursive: true });
      await fs.mkdir(path.join(this.localUploadPath, 'resumes'), { recursive: true });
    } catch (error) {
      logger.error('Error creating local upload directories:', error);
    }
  }

  /**
   * Create multer upload middleware for S3
   */
  createUploadMiddleware(fileType: keyof typeof FILE_CONFIGS, options?: UploadOptions) {
    const config = FILE_CONFIGS[fileType];
    const uploadOptions = { ...config, ...options };

    if (this.isS3Configured) {
      return multer({
        storage: multerS3({
          s3: this.s3,
          bucket: this.bucketName,
          acl: uploadOptions.folder === 'headshots' || uploadOptions.folder === 'images' ? 'public-read' : 'private',
          metadata: (req: Request, file: Express.Multer.File, cb: Function) => {
            cb(null, {
              fieldName: file.fieldname,
              uploadedBy: req.user?.id || 'anonymous',
              ...uploadOptions.metadata,
            });
          },
          key: (req: Request, file: Express.Multer.File, cb: Function) => {
            const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
            const ext = path.extname(file.originalname);
            const filename = `${uploadOptions.folder}/${uniqueSuffix}${ext}`;
            cb(null, filename);
          },
        }),
        limits: {
          fileSize: uploadOptions.maxSize,
        },
        fileFilter: (req: Request, file: Express.Multer.File, cb: Function) => {
          if (uploadOptions.allowedTypes && !uploadOptions.allowedTypes.includes(file.mimetype)) {
            return cb(new Error(`Invalid file type. Allowed types: ${uploadOptions.allowedTypes.join(', ')}`));
          }
          cb(null, true);
        },
      });
    } else {
      // Fallback to local storage
      return multer({
        storage: multer.diskStorage({
          destination: async (req: Request, file: Express.Multer.File, cb: Function) => {
            const folder = path.join(this.localUploadPath, uploadOptions.folder || 'temp');
            await fs.mkdir(folder, { recursive: true });
            cb(null, folder);
          },
          filename: (req: Request, file: Express.Multer.File, cb: Function) => {
            const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
            const ext = path.extname(file.originalname);
            cb(null, `${uniqueSuffix}${ext}`);
          },
        }),
        limits: {
          fileSize: uploadOptions.maxSize,
        },
        fileFilter: (req: Request, file: Express.Multer.File, cb: Function) => {
          if (uploadOptions.allowedTypes && !uploadOptions.allowedTypes.includes(file.mimetype)) {
            return cb(new Error(`Invalid file type. Allowed types: ${uploadOptions.allowedTypes.join(', ')}`));
          }
          cb(null, true);
        },
      });
    }
  }

  /**
   * Upload file directly to S3
   */
  async uploadFile(
    buffer: Buffer,
    filename: string,
    mimetype: string,
    folder: string = 'temp',
    metadata?: Record<string, string>
  ): Promise<AWS.S3.ManagedUpload.SendData | { Location: string }> {
    const key = `${folder}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${filename}`;

    if (this.isS3Configured) {
      const params: AWS.S3.PutObjectRequest = {
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
        Metadata: metadata || {},
        ServerSideEncryption: 'AES256',
      };

      // Set ACL based on folder
      if (folder === 'headshots' || folder === 'images') {
        params.ACL = 'public-read';
      }

      try {
        const result = await this.s3.upload(params).promise();
        logger.info(`File uploaded to S3: ${result.Location}`);
        return result;
      } catch (error) {
        logger.error('Error uploading file to S3:', error);
        throw error;
      }
    } else {
      // Save locally
      const localPath = path.join(this.localUploadPath, folder, filename);
      await fs.writeFile(localPath, buffer);
      logger.info(`File saved locally: ${localPath}`);
      return { Location: localPath };
    }
  }

  /**
   * Process and upload image with resizing
   */
  async processAndUploadImage(
    buffer: Buffer,
    filename: string,
    options: {
      folder?: string;
      resize?: { width?: number; height?: number; quality?: number };
      generateThumbnail?: boolean;
      metadata?: Record<string, string>;
    } = {}
  ): Promise<{
    original: string;
    processed?: string;
    thumbnail?: string;
  }> {
    const results: any = {};
    const baseKey = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const ext = path.extname(filename);
    const folder = options.folder || 'images';

    // Upload original
    const originalKey = `${folder}/original/${baseKey}${ext}`;
    if (this.isS3Configured) {
      const originalUpload = await this.s3.upload({
        Bucket: this.bucketName,
        Key: originalKey,
        Body: buffer,
        ContentType: 'image/jpeg',
        Metadata: options.metadata || {},
        ACL: 'public-read',
      }).promise();
      results.original = originalUpload.Location;
    } else {
      const localPath = path.join(this.localUploadPath, originalKey);
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, buffer);
      results.original = localPath;
    }

    // Process and resize
    if (options.resize) {
      const processedBuffer = await sharp(buffer)
        .resize(options.resize.width, options.resize.height, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: options.resize.quality || 85 })
        .toBuffer();

      const processedKey = `${folder}/processed/${baseKey}.jpg`;
      if (this.isS3Configured) {
        const processedUpload = await this.s3.upload({
          Bucket: this.bucketName,
          Key: processedKey,
          Body: processedBuffer,
          ContentType: 'image/jpeg',
          Metadata: options.metadata || {},
          ACL: 'public-read',
        }).promise();
        results.processed = processedUpload.Location;
      } else {
        const localPath = path.join(this.localUploadPath, processedKey);
        await fs.mkdir(path.dirname(localPath), { recursive: true });
        await fs.writeFile(localPath, processedBuffer);
        results.processed = localPath;
      }
    }

    // Generate thumbnail
    if (options.generateThumbnail) {
      const thumbnailBuffer = await sharp(buffer)
        .resize(200, 200, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 70 })
        .toBuffer();

      const thumbnailKey = `${folder}/thumbnails/${baseKey}_thumb.jpg`;
      if (this.isS3Configured) {
        const thumbnailUpload = await this.s3.upload({
          Bucket: this.bucketName,
          Key: thumbnailKey,
          Body: thumbnailBuffer,
          ContentType: 'image/jpeg',
          Metadata: options.metadata || {},
          ACL: 'public-read',
        }).promise();
        results.thumbnail = thumbnailUpload.Location;
      } else {
        const localPath = path.join(this.localUploadPath, thumbnailKey);
        await fs.mkdir(path.dirname(localPath), { recursive: true });
        await fs.writeFile(localPath, thumbnailBuffer);
        results.thumbnail = localPath;
      }
    }

    return results;
  }

  /**
   * Get signed URL for private file access
   */
  async getSignedUrl(key: string, options: SignedUrlOptions = {}): Promise<string> {
    if (!this.isS3Configured) {
      // Return local file path for non-S3 setup
      return path.join(this.localUploadPath, key);
    }

    const params = {
      Bucket: this.bucketName,
      Key: key,
      Expires: options.expires || 3600, // 1 hour default
      ...(options.responseContentType && { ResponseContentType: options.responseContentType }),
      ...(options.responseContentDisposition && { ResponseContentDisposition: options.responseContentDisposition }),
    };

    try {
      const url = await this.s3.getSignedUrlPromise('getObject', params);
      return url;
    } catch (error) {
      logger.error('Error generating signed URL:', error);
      throw error;
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(key: string): Promise<void> {
    if (!this.isS3Configured) {
      // Delete local file
      const localPath = path.join(this.localUploadPath, key);
      try {
        await fs.unlink(localPath);
        logger.info(`Local file deleted: ${localPath}`);
      } catch (error) {
        logger.error('Error deleting local file:', error);
      }
      return;
    }

    try {
      await this.s3.deleteObject({
        Bucket: this.bucketName,
        Key: key,
      }).promise();
      logger.info(`File deleted from S3: ${key}`);
    } catch (error) {
      logger.error('Error deleting file from S3:', error);
      throw error;
    }
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(keys: string[]): Promise<void> {
    if (!this.isS3Configured) {
      // Delete local files
      for (const key of keys) {
        await this.deleteFile(key);
      }
      return;
    }

    if (keys.length === 0) return;

    const deleteParams = {
      Bucket: this.bucketName,
      Delete: {
        Objects: keys.map(key => ({ Key: key })),
      },
    };

    try {
      const result = await this.s3.deleteObjects(deleteParams).promise();
      logger.info(`Deleted ${result.Deleted?.length || 0} files from S3`);
      
      if (result.Errors && result.Errors.length > 0) {
        logger.error('Errors deleting files:', result.Errors);
      }
    } catch (error) {
      logger.error('Error deleting files from S3:', error);
      throw error;
    }
  }

  /**
   * Copy file within S3
   */
  async copyFile(sourceKey: string, destinationKey: string): Promise<AWS.S3.CopyObjectOutput | void> {
    if (!this.isS3Configured) {
      // Copy local file
      const sourcePath = path.join(this.localUploadPath, sourceKey);
      const destPath = path.join(this.localUploadPath, destinationKey);
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.copyFile(sourcePath, destPath);
      logger.info(`Local file copied: ${sourcePath} -> ${destPath}`);
      return;
    }

    try {
      const result = await this.s3.copyObject({
        Bucket: this.bucketName,
        CopySource: `${this.bucketName}/${sourceKey}`,
        Key: destinationKey,
      }).promise();
      logger.info(`File copied in S3: ${sourceKey} -> ${destinationKey}`);
      return result;
    } catch (error) {
      logger.error('Error copying file in S3:', error);
      throw error;
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(prefix: string, maxKeys: number = 1000): Promise<AWS.S3.ObjectList | string[]> {
    if (!this.isS3Configured) {
      // List local files
      const folderPath = path.join(this.localUploadPath, prefix);
      try {
        const files = await fs.readdir(folderPath);
        return files.map(file => path.join(prefix, file));
      } catch (error) {
        logger.error('Error listing local files:', error);
        return [];
      }
    }

    try {
      const result = await this.s3.listObjectsV2({
        Bucket: this.bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys,
      }).promise();
      return result.Contents || [];
    } catch (error) {
      logger.error('Error listing files from S3:', error);
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key: string): Promise<AWS.S3.HeadObjectOutput | null> {
    if (!this.isS3Configured) {
      // Get local file stats
      const localPath = path.join(this.localUploadPath, key);
      try {
        const stats = await fs.stat(localPath);
        return {
          ContentLength: stats.size,
          LastModified: stats.mtime,
          ContentType: 'application/octet-stream',
        } as AWS.S3.HeadObjectOutput;
      } catch (error) {
        logger.error('Error getting local file metadata:', error);
        return null;
      }
    }

    try {
      const result = await this.s3.headObject({
        Bucket: this.bucketName,
        Key: key,
      }).promise();
      return result;
    } catch (error: any) {
      if (error.code === 'NotFound') {
        return null;
      }
      logger.error('Error getting file metadata from S3:', error);
      throw error;
    }
  }

  /**
   * Generate presigned URL for direct upload
   */
  async getUploadUrl(
    key: string,
    contentType: string,
    expires: number = 3600
  ): Promise<{ uploadUrl: string; publicUrl?: string }> {
    if (!this.isS3Configured) {
      // Return local upload endpoint
      return {
        uploadUrl: `/api/upload/local?key=${encodeURIComponent(key)}`,
      };
    }

    const params = {
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
      Expires: expires,
      ServerSideEncryption: 'AES256' as const,
    };

    try {
      const uploadUrl = await this.s3.getSignedUrlPromise('putObject', params);
      const publicUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
      
      return { uploadUrl, publicUrl };
    } catch (error) {
      logger.error('Error generating upload URL:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();

// Export types
export { FILE_CONFIGS };