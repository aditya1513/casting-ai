/**
 * File Storage Integration Service
 * Handles AWS S3, Cloudinary, and local storage with virus scanning and CDN
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CloudinaryApi } from 'cloudinary';
import FormData from 'form-data';
import axios from 'axios';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ClamScan from 'clamscan';
import Bull, { Queue, Job } from 'bull';
import Redis from 'ioredis';

// File Types
export type FileCategory = 'headshot' | 'resume' | 'demo-reel' | 'audition-video' | 'document' | 'other';
export type StorageProvider = 's3' | 'cloudinary' | 'local';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface FileUploadOptions {
  category: FileCategory;
  userId: string;
  projectId?: string;
  filename: string;
  mimeType: string;
  size: number;
  metadata?: Record<string, any>;
  tags?: string[];
  public?: boolean;
  expiresAt?: Date;
  allowedViewers?: string[];
  processVideo?: boolean;
  generateThumbnail?: boolean;
  scanForVirus?: boolean;
  optimizeImage?: boolean;
  cdn?: boolean;
}

export interface FileMetadata {
  id: string;
  originalName: string;
  filename: string;
  path: string;
  url: string;
  cdnUrl?: string;
  thumbnailUrl?: string;
  provider: StorageProvider;
  bucket?: string;
  mimeType: string;
  size: number;
  category: FileCategory;
  userId: string;
  projectId?: string;
  metadata?: Record<string, any>;
  tags?: string[];
  hash?: string;
  virusScanStatus?: 'clean' | 'infected' | 'pending' | 'error';
  processingStatus?: ProcessingStatus;
  dimensions?: {
    width: number;
    height: number;
  };
  duration?: number; // For videos
  uploadedAt: Date;
  expiresAt?: Date;
  public: boolean;
}

export interface UploadProgress {
  uploadId: string;
  progress: number;
  speed: number; // bytes per second
  remainingTime: number; // seconds
  status: 'uploading' | 'processing' | 'completed' | 'failed';
}

export interface ImageTransformation {
  width?: number;
  height?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  quality?: number;
  crop?: 'fill' | 'fit' | 'cover' | 'contain';
  gravity?: 'center' | 'north' | 'south' | 'east' | 'west' | 'face';
  blur?: number;
  sharpen?: boolean;
  grayscale?: boolean;
  watermark?: {
    text?: string;
    image?: string;
    position?: string;
    opacity?: number;
  };
}

export interface VideoTransformation {
  format?: 'mp4' | 'webm' | 'mov';
  resolution?: '360p' | '480p' | '720p' | '1080p' | '4k';
  bitrate?: string;
  fps?: number;
  startTime?: number;
  duration?: number;
  thumbnail?: {
    time?: number;
    width?: number;
    height?: number;
  };
  watermark?: {
    image: string;
    position: string;
    opacity?: number;
  };
}

class FileStorageService {
  private s3Client: S3Client;
  private cloudinary: typeof CloudinaryApi;
  private clamScan: any;
  private uploadQueue: Queue;
  private processingQueue: Queue;
  private redis: Redis;
  private uploadProgress: Map<string, UploadProgress> = new Map();
  private multipartUploads: Map<string, any> = new Map();

  constructor() {
    // Initialize AWS S3
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    // Initialize Cloudinary
    this.cloudinary = CloudinaryApi;
    this.cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });

    // Initialize ClamAV for virus scanning
    this.initializeVirusScanner();

    // Initialize Redis
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });

    // Initialize queues
    this.uploadQueue = new Bull('file-upload-queue', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    });

    this.processingQueue = new Bull('file-processing-queue', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    });

    // Process queues
    this.processQueues();
  }

  /**
   * Upload file with progress tracking
   */
  async uploadFile(
    file: Buffer | fs.ReadStream,
    options: FileUploadOptions
  ): Promise<FileMetadata> {
    const uploadId = uuidv4();
    const fileId = uuidv4();
    
    try {
      // Initialize progress tracking
      this.uploadProgress.set(uploadId, {
        uploadId,
        progress: 0,
        speed: 0,
        remainingTime: 0,
        status: 'uploading',
      });

      // Scan for virus if requested
      if (options.scanForVirus) {
        await this.scanFile(file);
      }

      // Calculate file hash
      const hash = await this.calculateHash(file);

      // Check for duplicate
      const duplicate = await this.findDuplicate(hash);
      if (duplicate) {
        logger.info(`Duplicate file detected: ${hash}`);
        return duplicate;
      }

      // Determine storage provider
      const provider = this.selectProvider(options);
      let uploadResult: any;

      switch (provider) {
        case 's3':
          uploadResult = await this.uploadToS3(file, fileId, options, uploadId);
          break;
        case 'cloudinary':
          uploadResult = await this.uploadToCloudinary(file, fileId, options, uploadId);
          break;
        case 'local':
          uploadResult = await this.uploadToLocal(file, fileId, options, uploadId);
          break;
        default:
          throw new AppError('Invalid storage provider', 400);
      }

      // Create file metadata
      const metadata: FileMetadata = {
        id: fileId,
        originalName: options.filename,
        filename: uploadResult.filename,
        path: uploadResult.path,
        url: uploadResult.url,
        cdnUrl: uploadResult.cdnUrl,
        thumbnailUrl: uploadResult.thumbnailUrl,
        provider,
        bucket: uploadResult.bucket,
        mimeType: options.mimeType,
        size: options.size,
        category: options.category,
        userId: options.userId,
        projectId: options.projectId,
        metadata: options.metadata,
        tags: options.tags,
        hash,
        virusScanStatus: options.scanForVirus ? 'clean' : undefined,
        processingStatus: 'pending',
        uploadedAt: new Date(),
        expiresAt: options.expiresAt,
        public: options.public || false,
      };

      // Save metadata
      await this.saveMetadata(metadata);

      // Queue post-processing
      if (options.processVideo || options.generateThumbnail || options.optimizeImage) {
        await this.queueProcessing(metadata, options);
      }

      // Update progress
      this.uploadProgress.set(uploadId, {
        uploadId,
        progress: 100,
        speed: 0,
        remainingTime: 0,
        status: 'completed',
      });

      logger.info(`File uploaded successfully: ${fileId}`);
      return metadata;
    } catch (error: any) {
      logger.error('File upload failed:', error);
      
      // Update progress
      this.uploadProgress.set(uploadId, {
        uploadId,
        progress: 0,
        speed: 0,
        remainingTime: 0,
        status: 'failed',
      });
      
      throw new AppError(error.message || 'File upload failed', 500);
    }
  }

  /**
   * Upload to AWS S3
   */
  private async uploadToS3(
    file: Buffer | fs.ReadStream,
    fileId: string,
    options: FileUploadOptions,
    uploadId: string
  ): Promise<any> {
    const bucket = process.env.AWS_S3_BUCKET || 'castmatch-uploads';
    const key = this.generateS3Key(fileId, options);
    
    // For large files, use multipart upload
    if (options.size > 100 * 1024 * 1024) { // 100MB
      return await this.multipartUploadToS3(file, bucket, key, options, uploadId);
    }

    // Regular upload
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file,
      ContentType: options.mimeType,
      Metadata: {
        userId: options.userId,
        category: options.category,
        ...options.metadata,
      },
      ServerSideEncryption: 'AES256',
      ACL: options.public ? 'public-read' : 'private',
      ...(options.expiresAt && { Expires: options.expiresAt }),
    });

    await this.s3Client.send(command);

    // Generate URLs
    const url = options.public
      ? `https://${bucket}.s3.amazonaws.com/${key}`
      : await this.generatePresignedUrl(bucket, key);

    const cdnUrl = options.cdn
      ? `https://${process.env.CDN_DOMAIN}/${key}`
      : undefined;

    return {
      filename: path.basename(key),
      path: key,
      url,
      cdnUrl,
      bucket,
    };
  }

  /**
   * Multipart upload to S3
   */
  private async multipartUploadToS3(
    file: Buffer | fs.ReadStream,
    bucket: string,
    key: string,
    options: FileUploadOptions,
    uploadId: string
  ): Promise<any> {
    const partSize = 10 * 1024 * 1024; // 10MB parts
    const parts: any[] = [];
    
    // Initiate multipart upload
    const createCommand = new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      ContentType: options.mimeType,
    });
    
    const { UploadId } = await this.s3Client.send(createCommand);
    this.multipartUploads.set(uploadId, { uploadId: UploadId, parts: [] });

    try {
      let partNumber = 1;
      let uploadedBytes = 0;
      
      // Upload parts
      if (Buffer.isBuffer(file)) {
        for (let i = 0; i < file.length; i += partSize) {
          const part = file.slice(i, Math.min(i + partSize, file.length));
          
          const uploadPartCommand = new UploadPartCommand({
            Bucket: bucket,
            Key: key,
            PartNumber: partNumber,
            UploadId,
            Body: part,
          });
          
          const { ETag } = await this.s3Client.send(uploadPartCommand);
          parts.push({ PartNumber: partNumber, ETag });
          
          uploadedBytes += part.length;
          this.updateUploadProgress(uploadId, uploadedBytes, options.size);
          
          partNumber++;
        }
      }

      // Complete multipart upload
      const completeCommand = new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId,
        MultipartUpload: { Parts: parts },
      });
      
      await this.s3Client.send(completeCommand);
      
      // Generate URLs
      const url = options.public
        ? `https://${bucket}.s3.amazonaws.com/${key}`
        : await this.generatePresignedUrl(bucket, key);

      const cdnUrl = options.cdn
        ? `https://${process.env.CDN_DOMAIN}/${key}`
        : undefined;

      return {
        filename: path.basename(key),
        path: key,
        url,
        cdnUrl,
        bucket,
      };
    } catch (error) {
      // Abort multipart upload on error
      const abortCommand = new AbortMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId,
      });
      
      await this.s3Client.send(abortCommand);
      throw error;
    } finally {
      this.multipartUploads.delete(uploadId);
    }
  }

  /**
   * Upload to Cloudinary
   */
  private async uploadToCloudinary(
    file: Buffer | fs.ReadStream,
    fileId: string,
    options: FileUploadOptions,
    uploadId: string
  ): Promise<any> {
    const folder = `castmatch/${options.category}/${options.userId}`;
    
    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.v2.uploader.upload_stream(
        {
          public_id: fileId,
          folder,
          resource_type: 'auto',
          tags: options.tags,
          context: options.metadata,
          access_mode: options.public ? 'public' : 'authenticated',
          eager: options.optimizeImage ? [
            { width: 150, height: 150, crop: 'thumb', gravity: 'face' },
            { width: 500, height: 500, crop: 'fill' },
          ] : undefined,
          eager_async: true,
          notification_url: `${process.env.API_URL}/webhooks/cloudinary`,
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              filename: result?.public_id || '',
              path: result?.secure_url || '',
              url: result?.secure_url || '',
              cdnUrl: result?.secure_url, // Cloudinary includes CDN
              thumbnailUrl: result?.eager?.[0]?.secure_url,
            });
          }
        }
      );

      if (Buffer.isBuffer(file)) {
        uploadStream.end(file);
      } else {
        file.pipe(uploadStream);
      }
    });
  }

  /**
   * Upload to local storage
   */
  private async uploadToLocal(
    file: Buffer | fs.ReadStream,
    fileId: string,
    options: FileUploadOptions,
    uploadId: string
  ): Promise<any> {
    const uploadDir = process.env.LOCAL_UPLOAD_DIR || './uploads';
    const categoryDir = path.join(uploadDir, options.category, options.userId);
    
    // Ensure directory exists
    await fs.promises.mkdir(categoryDir, { recursive: true });
    
    const filename = `${fileId}-${options.filename}`;
    const filepath = path.join(categoryDir, filename);
    
    // Write file
    if (Buffer.isBuffer(file)) {
      await fs.promises.writeFile(filepath, file);
    } else {
      const writeStream = fs.createWriteStream(filepath);
      file.pipe(writeStream);
      
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
    }

    const url = `${process.env.API_URL}/files/${fileId}`;
    
    return {
      filename,
      path: filepath,
      url,
    };
  }

  /**
   * Generate presigned URL for S3
   */
  async generatePresignedUrl(
    bucket: string,
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    
    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Get file by ID
   */
  async getFile(fileId: string): Promise<FileMetadata> {
    const metadata = await this.getMetadata(fileId);
    
    if (!metadata) {
      throw new AppError('File not found', 404);
    }
    
    // Refresh URL if needed
    if (metadata.provider === 's3' && !metadata.public) {
      metadata.url = await this.generatePresignedUrl(
        metadata.bucket || process.env.AWS_S3_BUCKET || '',
        metadata.path
      );
    }
    
    return metadata;
  }

  /**
   * Delete file
   */
  async deleteFile(fileId: string): Promise<void> {
    const metadata = await this.getMetadata(fileId);
    
    if (!metadata) {
      throw new AppError('File not found', 404);
    }

    // Delete from storage provider
    switch (metadata.provider) {
      case 's3':
        await this.deleteFromS3(metadata);
        break;
      case 'cloudinary':
        await this.deleteFromCloudinary(metadata);
        break;
      case 'local':
        await this.deleteFromLocal(metadata);
        break;
    }

    // Delete metadata
    await this.deleteMetadata(fileId);
    
    logger.info(`File deleted: ${fileId}`);
  }

  /**
   * Delete from S3
   */
  private async deleteFromS3(metadata: FileMetadata): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: metadata.bucket || process.env.AWS_S3_BUCKET || '',
      Key: metadata.path,
    });
    
    await this.s3Client.send(command);
  }

  /**
   * Delete from Cloudinary
   */
  private async deleteFromCloudinary(metadata: FileMetadata): Promise<void> {
    await this.cloudinary.v2.uploader.destroy(metadata.path);
  }

  /**
   * Delete from local storage
   */
  private async deleteFromLocal(metadata: FileMetadata): Promise<void> {
    await fs.promises.unlink(metadata.path);
  }

  /**
   * Transform image
   */
  async transformImage(
    fileId: string,
    transformations: ImageTransformation
  ): Promise<string> {
    const metadata = await this.getFile(fileId);
    
    if (!metadata.mimeType.startsWith('image/')) {
      throw new AppError('File is not an image', 400);
    }

    if (metadata.provider === 'cloudinary') {
      // Use Cloudinary transformation API
      return this.cloudinaryTransform(metadata, transformations);
    } else {
      // Use Sharp for local transformation
      return await this.sharpTransform(metadata, transformations);
    }
  }

  /**
   * Cloudinary image transformation
   */
  private cloudinaryTransform(
    metadata: FileMetadata,
    transformations: ImageTransformation
  ): string {
    const transforms = [];
    
    if (transformations.width || transformations.height) {
      transforms.push(`w_${transformations.width || 'auto'},h_${transformations.height || 'auto'}`);
    }
    
    if (transformations.crop) {
      transforms.push(`c_${transformations.crop}`);
    }
    
    if (transformations.quality) {
      transforms.push(`q_${transformations.quality}`);
    }
    
    if (transformations.format) {
      transforms.push(`f_${transformations.format}`);
    }
    
    if (transformations.blur) {
      transforms.push(`e_blur:${transformations.blur}`);
    }
    
    if (transformations.grayscale) {
      transforms.push('e_grayscale');
    }
    
    const transformation = transforms.join(',');
    const urlParts = metadata.url.split('/upload/');
    
    return `${urlParts[0]}/upload/${transformation}/${urlParts[1]}`;
  }

  /**
   * Sharp image transformation
   */
  private async sharpTransform(
    metadata: FileMetadata,
    transformations: ImageTransformation
  ): Promise<string> {
    // Download file
    const fileBuffer = await this.downloadFile(metadata);
    
    // Apply transformations
    let pipeline = sharp(fileBuffer);
    
    if (transformations.width || transformations.height) {
      pipeline = pipeline.resize(transformations.width, transformations.height, {
        fit: transformations.crop as any || 'cover',
      });
    }
    
    if (transformations.format) {
      pipeline = pipeline.toFormat(transformations.format, {
        quality: transformations.quality || 80,
      });
    }
    
    if (transformations.blur) {
      pipeline = pipeline.blur(transformations.blur);
    }
    
    if (transformations.sharpen) {
      pipeline = pipeline.sharpen();
    }
    
    if (transformations.grayscale) {
      pipeline = pipeline.grayscale();
    }
    
    // Process and upload transformed image
    const transformed = await pipeline.toBuffer();
    const transformedId = `${metadata.id}_transformed_${Date.now()}`;
    
    const result = await this.uploadFile(transformed, {
      ...metadata,
      filename: `transformed_${metadata.filename}`,
      size: transformed.length,
    });
    
    return result.url;
  }

  /**
   * Process video
   */
  async processVideo(
    fileId: string,
    transformations: VideoTransformation
  ): Promise<string> {
    const metadata = await this.getFile(fileId);
    
    if (!metadata.mimeType.startsWith('video/')) {
      throw new AppError('File is not a video', 400);
    }

    return new Promise((resolve, reject) => {
      const outputPath = `/tmp/${uuidv4()}.${transformations.format || 'mp4'}`;
      
      let command = ffmpeg(metadata.path);
      
      if (transformations.resolution) {
        const resolutions: Record<string, string> = {
          '360p': '640x360',
          '480p': '854x480',
          '720p': '1280x720',
          '1080p': '1920x1080',
          '4k': '3840x2160',
        };
        command = command.size(resolutions[transformations.resolution]);
      }
      
      if (transformations.bitrate) {
        command = command.videoBitrate(transformations.bitrate);
      }
      
      if (transformations.fps) {
        command = command.fps(transformations.fps);
      }
      
      if (transformations.startTime) {
        command = command.setStartTime(transformations.startTime);
      }
      
      if (transformations.duration) {
        command = command.duration(transformations.duration);
      }
      
      command
        .output(outputPath)
        .on('end', async () => {
          // Upload processed video
          const processedBuffer = await fs.promises.readFile(outputPath);
          const result = await this.uploadFile(processedBuffer, {
            ...metadata,
            filename: `processed_${metadata.filename}`,
            size: processedBuffer.length,
          });
          
          // Clean up temp file
          await fs.promises.unlink(outputPath);
          
          resolve(result.url);
        })
        .on('error', (err) => {
          reject(new AppError(`Video processing failed: ${err.message}`, 500));
        })
        .run();
    });
  }

  /**
   * Initialize virus scanner
   */
  private async initializeVirusScanner(): Promise<void> {
    try {
      this.clamScan = await new ClamScan().init({
        clamdscan: {
          host: process.env.CLAMAV_HOST || 'localhost',
          port: parseInt(process.env.CLAMAV_PORT || '3310'),
        },
      });
      logger.info('Virus scanner initialized');
    } catch (error) {
      logger.warn('Virus scanner initialization failed:', error);
    }
  }

  /**
   * Scan file for viruses
   */
  private async scanFile(file: Buffer | fs.ReadStream): Promise<void> {
    if (!this.clamScan) {
      logger.warn('Virus scanning skipped - scanner not available');
      return;
    }

    try {
      const { is_infected, viruses } = await this.clamScan.scan_stream(file);
      
      if (is_infected) {
        logger.error(`Virus detected: ${viruses.join(', ')}`);
        throw new AppError('File contains virus', 400);
      }
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Virus scan failed:', error);
      // Continue without scanning in case of scanner error
    }
  }

  /**
   * Calculate file hash
   */
  private async calculateHash(file: Buffer | fs.ReadStream): Promise<string> {
    const hash = crypto.createHash('sha256');
    
    if (Buffer.isBuffer(file)) {
      hash.update(file);
    } else {
      return new Promise((resolve, reject) => {
        file.on('data', (chunk) => hash.update(chunk));
        file.on('end', () => resolve(hash.digest('hex')));
        file.on('error', reject);
      });
    }
    
    return hash.digest('hex');
  }

  /**
   * Find duplicate file by hash
   */
  private async findDuplicate(hash: string): Promise<FileMetadata | null> {
    const key = `file:hash:${hash}`;
    const fileId = await this.redis.get(key);
    
    if (fileId) {
      return await this.getMetadata(fileId);
    }
    
    return null;
  }

  /**
   * Select storage provider based on options
   */
  private selectProvider(options: FileUploadOptions): StorageProvider {
    // Use Cloudinary for images that need transformation
    if (options.mimeType.startsWith('image/') && options.optimizeImage) {
      return 'cloudinary';
    }
    
    // Use S3 for large files and videos
    if (options.size > 10 * 1024 * 1024 || options.mimeType.startsWith('video/')) {
      return 's3';
    }
    
    // Use local for temporary files
    if (options.expiresAt) {
      return 'local';
    }
    
    // Default to S3
    return 's3';
  }

  /**
   * Generate S3 key
   */
  private generateS3Key(fileId: string, options: FileUploadOptions): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    return `${options.category}/${options.userId}/${year}/${month}/${fileId}/${options.filename}`;
  }

  /**
   * Update upload progress
   */
  private updateUploadProgress(
    uploadId: string,
    uploadedBytes: number,
    totalBytes: number
  ): void {
    const progress = Math.round((uploadedBytes / totalBytes) * 100);
    const current = this.uploadProgress.get(uploadId);
    
    if (current) {
      current.progress = progress;
      // Calculate speed and remaining time
      // Implementation would track time and calculate speed
    }
  }

  /**
   * Queue file processing
   */
  private async queueProcessing(
    metadata: FileMetadata,
    options: FileUploadOptions
  ): Promise<void> {
    await this.processingQueue.add({
      fileId: metadata.id,
      operations: {
        generateThumbnail: options.generateThumbnail,
        optimizeImage: options.optimizeImage,
        processVideo: options.processVideo,
      },
    });
  }

  /**
   * Process queues
   */
  private processQueues(): void {
    this.processingQueue.process(async (job: Job) => {
      const { fileId, operations } = job.data;
      const metadata = await this.getMetadata(fileId);
      
      if (!metadata) {
        throw new Error('File not found');
      }

      if (operations.generateThumbnail) {
        await this.generateThumbnail(metadata);
      }
      
      if (operations.optimizeImage) {
        await this.optimizeImage(metadata);
      }
      
      if (operations.processVideo) {
        await this.processVideoFile(metadata);
      }
      
      // Update processing status
      metadata.processingStatus = 'completed';
      await this.saveMetadata(metadata);
    });
  }

  /**
   * Generate thumbnail
   */
  private async generateThumbnail(metadata: FileMetadata): Promise<void> {
    if (metadata.mimeType.startsWith('image/')) {
      const thumbnailUrl = await this.transformImage(metadata.id, {
        width: 150,
        height: 150,
        crop: 'cover',
      });
      metadata.thumbnailUrl = thumbnailUrl;
    } else if (metadata.mimeType.startsWith('video/')) {
      // Extract video frame for thumbnail
      // Implementation would use ffmpeg
    }
  }

  /**
   * Optimize image
   */
  private async optimizeImage(metadata: FileMetadata): Promise<void> {
    if (!metadata.mimeType.startsWith('image/')) {
      return;
    }

    // Optimize for web
    await this.transformImage(metadata.id, {
      quality: 85,
      format: 'webp',
    });
  }

  /**
   * Process video file
   */
  private async processVideoFile(metadata: FileMetadata): Promise<void> {
    if (!metadata.mimeType.startsWith('video/')) {
      return;
    }

    // Create web-optimized version
    await this.processVideo(metadata.id, {
      format: 'mp4',
      resolution: '720p',
      bitrate: '2000k',
    });
  }

  /**
   * Download file
   */
  private async downloadFile(metadata: FileMetadata): Promise<Buffer> {
    if (metadata.provider === 's3') {
      const command = new GetObjectCommand({
        Bucket: metadata.bucket || process.env.AWS_S3_BUCKET || '',
        Key: metadata.path,
      });
      
      const response = await this.s3Client.send(command);
      return Buffer.from(await response.Body!.transformToByteArray());
    } else if (metadata.provider === 'cloudinary') {
      const response = await axios.get(metadata.url, {
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data);
    } else {
      return await fs.promises.readFile(metadata.path);
    }
  }

  /**
   * Save file metadata
   */
  private async saveMetadata(metadata: FileMetadata): Promise<void> {
    const key = `file:${metadata.id}`;
    await this.redis.set(key, JSON.stringify(metadata));
    
    // Index by hash for duplicate detection
    if (metadata.hash) {
      await this.redis.set(`file:hash:${metadata.hash}`, metadata.id);
    }
    
    // Index by user
    await this.redis.sadd(`files:user:${metadata.userId}`, metadata.id);
    
    // Index by category
    await this.redis.sadd(`files:category:${metadata.category}`, metadata.id);
  }

  /**
   * Get file metadata
   */
  private async getMetadata(fileId: string): Promise<FileMetadata | null> {
    const key = `file:${fileId}`;
    const data = await this.redis.get(key);
    
    if (data) {
      return JSON.parse(data);
    }
    
    return null;
  }

  /**
   * Delete file metadata
   */
  private async deleteMetadata(fileId: string): Promise<void> {
    const metadata = await this.getMetadata(fileId);
    
    if (metadata) {
      await this.redis.del(`file:${fileId}`);
      
      if (metadata.hash) {
        await this.redis.del(`file:hash:${metadata.hash}`);
      }
      
      await this.redis.srem(`files:user:${metadata.userId}`, fileId);
      await this.redis.srem(`files:category:${metadata.category}`, fileId);
    }
  }

  /**
   * Get upload progress
   */
  getUploadProgress(uploadId: string): UploadProgress | undefined {
    return this.uploadProgress.get(uploadId);
  }

  /**
   * List user files
   */
  async listUserFiles(
    userId: string,
    category?: FileCategory,
    limit: number = 50
  ): Promise<FileMetadata[]> {
    const key = category ? `files:category:${category}` : `files:user:${userId}`;
    const fileIds = await this.redis.smembers(key);
    
    const files: FileMetadata[] = [];
    
    for (const fileId of fileIds.slice(0, limit)) {
      const metadata = await this.getMetadata(fileId);
      if (metadata && (!category || metadata.userId === userId)) {
        files.push(metadata);
      }
    }
    
    return files.sort((a, b) => 
      b.uploadedAt.getTime() - a.uploadedAt.getTime()
    );
  }
}

// Export singleton instance
export const fileStorageService = new FileStorageService();