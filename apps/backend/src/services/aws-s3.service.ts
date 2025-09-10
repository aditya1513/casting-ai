import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  CopyObjectCommand
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
  tags?: Record<string, string>;
}

interface StorageFile {
  url: string;
  cloudFrontUrl?: string;
  key: string;
  size?: number;
  contentType?: string;
  lastModified?: Date;
  etag?: string;
}

class AWSS3Service {
  private client: S3Client;
  private bucket: string;
  private cloudFrontUrl?: string;
  private region: string;

  constructor() {
    this.region = process.env.AWS_REGION || 'ap-south-1';
    this.bucket = process.env.AWS_S3_BUCKET || 'castmatch-media';
    this.cloudFrontUrl = process.env.AWS_CLOUDFRONT_URL;

    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      logger.warn('AWS S3 credentials not configured');
    }

    this.client = new S3Client({
      region: this.region,
      credentials: accessKeyId && secretAccessKey ? {
        accessKeyId,
        secretAccessKey
      } : undefined,
      endpoint: process.env.AWS_S3_ENDPOINT // Optional custom endpoint
    });
  }

  private generateKey(folder: string, filename: string): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = filename.split('.').pop();
    const name = filename.split('.').slice(0, -1).join('.');
    const sanitizedName = name.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50);
    
    return `${folder}/${timestamp}-${randomStr}-${sanitizedName}.${ext}`;
  }

  private getTagString(tags: Record<string, string>): string {
    return Object.entries(tags)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
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
        isPublic = false,
        metadata = {},
        tags = {}
      } = options;

      const key = this.generateKey(folder, filename);
      const fileStream = createReadStream(filePath);

      const uploadParams: any = {
        Bucket: this.bucket,
        Key: key,
        Body: fileStream,
        ContentType: contentType,
        Metadata: metadata,
        StorageClass: 'STANDARD_IA' // Use Infrequent Access for cost optimization
      };

      // Add ACL only if explicitly public
      if (isPublic) {
        uploadParams.ACL = 'public-read';
      }

      // Add tags if provided
      if (Object.keys(tags).length > 0) {
        uploadParams.Tagging = this.getTagString(tags);
      }

      // Use multipart upload for large files
      const upload = new Upload({
        client: this.client,
        params: uploadParams,
        queueSize: 4, // Concurrent parts
        partSize: 5 * 1024 * 1024, // 5MB parts
        leavePartsOnError: false
      });

      // Track upload progress
      upload.on('httpUploadProgress', (progress) => {
        if (progress.loaded && progress.total) {
          const percentage = Math.round((progress.loaded / progress.total) * 100);
          logger.debug(`Upload progress: ${percentage}%`);
        }
      });

      const result = await upload.done();

      return {
        url: this.getPublicUrl(key),
        cloudFrontUrl: this.cloudFrontUrl ? `${this.cloudFrontUrl}/${key}` : undefined,
        key,
        contentType,
        etag: result.ETag
      };
    } catch (error: any) {
      logger.error('AWS S3 upload error:', error);
      throw new AppError(`Failed to upload file: ${error.message}`, 500);
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
        isPublic = false,
        metadata = {},
        tags = {}
      } = options;

      const key = this.generateKey(folder, filename);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: metadata,
        StorageClass: 'STANDARD_IA',
        ...(isPublic && { ACL: 'public-read' }),
        ...(Object.keys(tags).length > 0 && { Tagging: this.getTagString(tags) })
      });

      const result = await this.client.send(command);

      return {
        url: this.getPublicUrl(key),
        cloudFrontUrl: this.cloudFrontUrl ? `${this.cloudFrontUrl}/${key}` : undefined,
        key,
        size: buffer.length,
        contentType,
        etag: result.ETag
      };
    } catch (error: any) {
      logger.error('AWS S3 buffer upload error:', error);
      throw new AppError(`Failed to upload file: ${error.message}`, 500);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      await this.client.send(command);
      logger.info(`Deleted file: ${key}`);
      return true;
    } catch (error: any) {
      logger.error('AWS S3 delete error:', error);
      throw new AppError(`Failed to delete file: ${error.message}`, 500);
    }
  }

  async deleteMultiple(keys: string[]): Promise<boolean> {
    try {
      // S3 batch delete supports max 1000 objects at once
      const chunks = [];
      for (let i = 0; i < keys.length; i += 1000) {
        chunks.push(keys.slice(i, i + 1000));
      }

      for (const chunk of chunks) {
        const deleteParams = {
          Bucket: this.bucket,
          Delete: {
            Objects: chunk.map(key => ({ Key: key })),
            Quiet: true
          }
        };

        await this.client.send(new DeleteObjectCommand(deleteParams as any));
      }

      logger.info(`Deleted ${keys.length} files`);
      return true;
    } catch (error: any) {
      logger.error('AWS S3 batch delete error:', error);
      throw new AppError(`Failed to delete files: ${error.message}`, 500);
    }
  }

  async copy(sourceKey: string, destinationKey: string): Promise<StorageFile> {
    try {
      const command = new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destinationKey,
        StorageClass: 'STANDARD_IA'
      });

      const result = await this.client.send(command);

      return {
        url: this.getPublicUrl(destinationKey),
        cloudFrontUrl: this.cloudFrontUrl ? `${this.cloudFrontUrl}/${destinationKey}` : undefined,
        key: destinationKey,
        etag: result.CopyObjectResult?.ETag
      };
    } catch (error: any) {
      logger.error('AWS S3 copy error:', error);
      throw new AppError(`Failed to copy file: ${error.message}`, 500);
    }
  }

  async getSignedUrl(
    key: string, 
    expiresIn: number = 3600,
    operation: 'get' | 'put' = 'get'
  ): Promise<string> {
    try {
      const Command = operation === 'put' ? PutObjectCommand : GetObjectCommand;
      const command = new Command({
        Bucket: this.bucket,
        Key: key
      });

      const url = await getSignedUrl(this.client, command, { 
        expiresIn 
      });

      return url;
    } catch (error: any) {
      logger.error('AWS S3 signed URL error:', error);
      throw new AppError(`Failed to generate signed URL: ${error.message}`, 500);
    }
  }

  async listFiles(
    folder: string, 
    options: {
      maxKeys?: number;
      continuationToken?: string;
    } = {}
  ): Promise<{
    files: StorageFile[];
    nextToken?: string;
    isTruncated: boolean;
  }> {
    try {
      const { maxKeys = 1000, continuationToken } = options;

      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: folder,
        MaxKeys: maxKeys,
        ContinuationToken: continuationToken
      });

      const response = await this.client.send(command);
      
      const files = (response.Contents || []).map(obj => ({
        url: this.getPublicUrl(obj.Key!),
        cloudFrontUrl: this.cloudFrontUrl ? `${this.cloudFrontUrl}/${obj.Key}` : undefined,
        key: obj.Key!,
        size: obj.Size,
        lastModified: obj.LastModified,
        etag: obj.ETag
      }));

      return {
        files,
        nextToken: response.NextContinuationToken,
        isTruncated: response.IsTruncated || false
      };
    } catch (error: any) {
      logger.error('AWS S3 list files error:', error);
      throw new AppError(`Failed to list files: ${error.message}`, 500);
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
        cloudFrontUrl: this.cloudFrontUrl ? `${this.cloudFrontUrl}/${key}` : undefined,
        key,
        size: response.ContentLength,
        contentType: response.ContentType,
        lastModified: response.LastModified,
        etag: response.ETag
      };
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      logger.error('AWS S3 get file info error:', error);
      throw new AppError(`Failed to get file info: ${error.message}`, 500);
    }
  }

  async downloadFile(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      const response = await this.client.send(command);
      
      if (!response.Body) {
        throw new Error('No file body returned');
      }

      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (error: any) {
      logger.error('AWS S3 download error:', error);
      throw new AppError(`Failed to download file: ${error.message}`, 500);
    }
  }

  getPublicUrl(key: string): string {
    if (this.cloudFrontUrl) {
      return `${this.cloudFrontUrl}/${key}`;
    }
    
    // Standard S3 URL format for Mumbai region
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
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

  // Helper method for generating upload policies for direct browser uploads
  async getUploadPolicy(
    folder: string,
    filename: string,
    contentType: string,
    maxSize: number = 10 * 1024 * 1024 // 10MB default
  ): Promise<{
    url: string;
    fields: Record<string, string>;
  }> {
    const key = this.generateKey(folder, filename);
    const policy = {
      expiration: new Date(Date.now() + 3600 * 1000).toISOString(),
      conditions: [
        { bucket: this.bucket },
        ['starts-with', '$key', folder],
        ['content-length-range', 0, maxSize],
        { 'Content-Type': contentType }
      ]
    };

    // This would need additional implementation for POST policy generation
    // For now, return signed URL approach
    const url = await this.getSignedUrl(key, 3600, 'put');
    
    return {
      url,
      fields: {
        key,
        'Content-Type': contentType
      }
    };
  }
}

export const s3Service = new AWSS3Service();
export default s3Service;