import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import { createReadStream } from 'fs';
import { lookup } from 'mime-types';
import logger from '../utils/logger';
import { AppError } from '../middleware/error.middleware';

interface UploadOptions {
  folder?: string;
  filename?: string;
  contentType?: string;
  isPublic?: boolean;
  metadata?: Record<string, string>;
}

interface StorageFile {
  url: string;
  cdnUrl?: string;
  key: string;
  size?: number;
  contentType?: string;
  lastModified?: Date;
}

class S3StorageService {
  private client: S3Client;
  private bucket: string;
  private cdnUrl?: string;
  private endpoint?: string;

  constructor() {
    const endpoint = process.env.STORAGE_ENDPOINT;
    const accessKey = process.env.STORAGE_ACCESS_KEY;
    const secretKey = process.env.STORAGE_SECRET_KEY;
    const region = process.env.STORAGE_REGION || 'us-east-1';
    
    this.bucket = process.env.STORAGE_BUCKET || 'castmatch-media';
    this.cdnUrl = process.env.STORAGE_CDN_URL;
    this.endpoint = endpoint;

    if (!accessKey || !secretKey) {
      logger.warn('Storage credentials not configured');
    }

    // Configure S3 client for S3-compatible services
    const clientConfig: any = {
      region,
      credentials: accessKey && secretKey ? {
        accessKeyId: accessKey,
        secretAccessKey: secretKey
      } : undefined
    };

    // Add endpoint configuration for S3-compatible services
    if (endpoint) {
      clientConfig.endpoint = endpoint;
      clientConfig.forcePathStyle = process.env.STORAGE_PATH_STYLE === 'true';
    }

    this.client = new S3Client(clientConfig);
  }

  private generateKey(folder: string, filename: string): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = filename.split('.').pop();
    const name = filename.split('.').slice(0, -1).join('.');
    const sanitizedName = name.replace(/[^a-zA-Z0-9-_]/g, '_');
    
    return `${folder}/${timestamp}-${randomStr}-${sanitizedName}.${ext}`;
  }

  async upload(
    filePath: string,
    options: UploadOptions = {}
  ): Promise<StorageFile> {
    try {
      const { 
        folder = 'uploads', 
        filename = filePath.split('/').pop() || 'file',
        contentType = lookup(filePath) || 'application/octet-stream',
        isPublic = true,
        metadata = {}
      } = options;

      const key = this.generateKey(folder, filename);
      const fileStream = createReadStream(filePath);

      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: fileStream,
          ContentType: contentType,
          ACL: isPublic ? 'public-read' : 'private',
          Metadata: metadata
        }
      });

      await upload.done();

      return {
        url: this.getPublicUrl(key),
        cdnUrl: this.cdnUrl ? `${this.cdnUrl}/${key}` : undefined,
        key,
        contentType
      };
    } catch (error: any) {
      logger.error('S3 upload error:', error);
      throw new AppError('Failed to upload file', 500);
    }
  }

  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    options: UploadOptions = {}
  ): Promise<StorageFile> {
    try {
      const { 
        folder = 'uploads',
        contentType = lookup(filename) || 'application/octet-stream',
        isPublic = true,
        metadata = {}
      } = options;

      const key = this.generateKey(folder, filename);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: isPublic ? 'public-read' : 'private',
        Metadata: metadata
      });

      await this.client.send(command);

      return {
        url: this.getPublicUrl(key),
        cdnUrl: this.cdnUrl ? `${this.cdnUrl}/${key}` : undefined,
        key,
        size: buffer.length,
        contentType
      };
    } catch (error: any) {
      logger.error('S3 buffer upload error:', error);
      throw new AppError('Failed to upload file', 500);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      await this.client.send(command);
      return true;
    } catch (error: any) {
      logger.error('S3 delete error:', error);
      throw new AppError('Failed to delete file', 500);
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      const url = await getSignedUrl(this.client, command, { 
        expiresIn 
      });

      return url;
    } catch (error: any) {
      logger.error('S3 signed URL error:', error);
      throw new AppError('Failed to generate signed URL', 500);
    }
  }

  async listFiles(folder: string, maxKeys: number = 1000): Promise<StorageFile[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: folder,
        MaxKeys: maxKeys
      });

      const response = await this.client.send(command);
      
      if (!response.Contents) {
        return [];
      }

      return response.Contents.map(obj => ({
        url: this.getPublicUrl(obj.Key!),
        cdnUrl: this.cdnUrl ? `${this.cdnUrl}/${obj.Key}` : undefined,
        key: obj.Key!,
        size: obj.Size,
        lastModified: obj.LastModified
      }));
    } catch (error: any) {
      logger.error('S3 list files error:', error);
      throw new AppError('Failed to list files', 500);
    }
  }

  async getFileInfo(key: string): Promise<StorageFile | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      const response = await this.client.send(command);

      return {
        url: this.getPublicUrl(key),
        cdnUrl: this.cdnUrl ? `${this.cdnUrl}/${key}` : undefined,
        key,
        size: response.ContentLength,
        contentType: response.ContentType,
        lastModified: response.LastModified
      };
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return null;
      }
      logger.error('S3 get file info error:', error);
      throw new AppError('Failed to get file info', 500);
    }
  }

  getPublicUrl(key: string): string {
    if (this.cdnUrl) {
      return `${this.cdnUrl}/${key}`;
    }
    
    if (this.endpoint) {
      // For S3-compatible services with custom endpoints
      return `${this.endpoint}/${this.bucket}/${key}`;
    }
    
    // Standard S3 URL format
    return `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }

  validateFileType(mimetype: string, allowedTypes: string[]): boolean {
    return allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        const category = type.slice(0, -2);
        return mimetype.startsWith(category);
      }
      return mimetype === type;
    });
  }

  validateFileSize(size: number, maxSizeInMB: number): boolean {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return size <= maxSizeInBytes;
  }
}

export const storageService = new S3StorageService();
export default storageService;