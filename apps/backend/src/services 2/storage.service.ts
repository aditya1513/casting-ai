import axios from 'axios';
import FormData from 'form-data';
import { createReadStream } from 'fs';
import { config } from '../config/config';
import logger from '../utils/logger';
import { AppError } from '../middleware/error.middleware';

interface UploadOptions {
  folder?: string;
  filename?: string;
  contentType?: string;
  isPublic?: boolean;
}

interface StorageFile {
  url: string;
  cdnUrl?: string;
  key: string;
  size: number;
  contentType: string;
}

class StorageService {
  private apiKey: string;
  private secretKey: string;
  private endpoint: string;
  private bucket: string;
  private cdnUrl?: string;

  constructor() {
    this.apiKey = process.env.EXCLOUD_API_KEY || '';
    this.secretKey = process.env.EXCLOUD_SECRET_KEY || '';
    this.endpoint = process.env.EXCLOUD_ENDPOINT || 'https://api.excloud.com';
    this.bucket = process.env.EXCLOUD_BUCKET || 'castmatch-media';
    this.cdnUrl = process.env.EXCLOUD_CDN_URL;

    if (!this.apiKey || !this.secretKey) {
      logger.warn('Excloud storage credentials not configured');
    }
  }

  private getHeaders() {
    return {
      'X-API-Key': this.apiKey,
      'X-Secret-Key': this.secretKey,
      'Content-Type': 'application/json'
    };
  }

  async upload(
    filePath: string,
    options: UploadOptions = {}
  ): Promise<StorageFile> {
    try {
      const { folder = 'uploads', filename, contentType, isPublic = true } = options;
      
      const formData = new FormData();
      formData.append('file', createReadStream(filePath));
      formData.append('bucket', this.bucket);
      formData.append('folder', folder);
      if (filename) formData.append('filename', filename);
      if (contentType) formData.append('contentType', contentType);
      formData.append('public', String(isPublic));

      const response = await axios.post(
        `${this.endpoint}/v1/storage/upload`,
        formData,
        {
          headers: {
            ...this.getHeaders(),
            ...formData.getHeaders()
          }
        }
      );

      const file = response.data;
      
      return {
        url: file.url,
        cdnUrl: this.cdnUrl ? `${this.cdnUrl}/${file.key}` : file.url,
        key: file.key,
        size: file.size,
        contentType: file.contentType || contentType || 'application/octet-stream'
      };
    } catch (error: any) {
      logger.error('Storage upload error:', error);
      throw new AppError('Failed to upload file', 500);
    }
  }

  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    options: UploadOptions = {}
  ): Promise<StorageFile> {
    try {
      const { folder = 'uploads', contentType, isPublic = true } = options;
      
      const response = await axios.post(
        `${this.endpoint}/v1/storage/upload-buffer`,
        {
          file: buffer.toString('base64'),
          bucket: this.bucket,
          folder,
          filename,
          contentType,
          public: isPublic
        },
        {
          headers: this.getHeaders()
        }
      );

      const file = response.data;
      
      return {
        url: file.url,
        cdnUrl: this.cdnUrl ? `${this.cdnUrl}/${file.key}` : file.url,
        key: file.key,
        size: file.size,
        contentType: file.contentType || contentType || 'application/octet-stream'
      };
    } catch (error: any) {
      logger.error('Storage buffer upload error:', error);
      throw new AppError('Failed to upload file', 500);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      await axios.delete(
        `${this.endpoint}/v1/storage/delete`,
        {
          headers: this.getHeaders(),
          data: {
            bucket: this.bucket,
            key
          }
        }
      );
      
      return true;
    } catch (error: any) {
      logger.error('Storage delete error:', error);
      throw new AppError('Failed to delete file', 500);
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const response = await axios.post(
        `${this.endpoint}/v1/storage/signed-url`,
        {
          bucket: this.bucket,
          key,
          expiresIn
        },
        {
          headers: this.getHeaders()
        }
      );
      
      return response.data.url;
    } catch (error: any) {
      logger.error('Storage signed URL error:', error);
      throw new AppError('Failed to generate signed URL', 500);
    }
  }

  async listFiles(folder: string): Promise<StorageFile[]> {
    try {
      const response = await axios.get(
        `${this.endpoint}/v1/storage/list`,
        {
          headers: this.getHeaders(),
          params: {
            bucket: this.bucket,
            prefix: folder
          }
        }
      );
      
      return response.data.files.map((file: any) => ({
        url: file.url,
        cdnUrl: this.cdnUrl ? `${this.cdnUrl}/${file.key}` : file.url,
        key: file.key,
        size: file.size,
        contentType: file.contentType
      }));
    } catch (error: any) {
      logger.error('Storage list files error:', error);
      throw new AppError('Failed to list files', 500);
    }
  }

  getPublicUrl(key: string): string {
    if (this.cdnUrl) {
      return `${this.cdnUrl}/${key}`;
    }
    return `${this.endpoint}/storage/${this.bucket}/${key}`;
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

export const storageService = new StorageService();
export default storageService;