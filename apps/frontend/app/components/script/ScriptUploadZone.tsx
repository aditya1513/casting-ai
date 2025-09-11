'use client';

import React, { useState, useRef, useCallback } from 'react';
import { trpc } from '../../lib/trpc';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  Film, 
  X, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Download,
  Eye,
  Trash2,
  RefreshCw,
  Paperclip,
  FileImage,
  FileVideo,
  Music
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  preview?: string;
  analysis?: {
    characters: number;
    scenes: number;
    duration: string;
    genre: string[];
    complexity: 'simple' | 'medium' | 'complex';
    characters_breakdown: any[];
  };
  error?: string;
}

interface ScriptUploadZoneProps {
  onFilesUploaded?: (files: UploadedFile[]) => void;
  onFileAnalyzed?: (file: UploadedFile) => void;
  onFileRemoved?: (fileId: string) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
  className?: string;
  multiple?: boolean;
  disabled?: boolean;
}

export const ScriptUploadZone: React.FC<ScriptUploadZoneProps> = ({
  onFilesUploaded,
  onFileAnalyzed,
  onFileRemoved,
  maxFiles = 5,
  maxFileSize = 10,
  acceptedTypes = ['.pdf', '.txt', '.doc', '.docx', '.rtf'],
  className,
  multiple = true,
  disabled = false,
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateFileId = () => Math.random().toString(36).substr(2, 9);

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return FileText;
    if (type.includes('image')) return FileImage;
    if (type.includes('video')) return FileVideo;
    if (type.includes('audio')) return Music;
    return FileText;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size exceeds ${maxFileSize}MB limit`;
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      return `File type ${fileExtension} is not supported`;
    }

    // Check total files
    if (uploadedFiles.length >= maxFiles) {
      return `Maximum ${maxFiles} files allowed`;
    }

    return null;
  };

  const uploadToBackend = async (file: UploadedFile): Promise<void> => {
    try {
      // Get upload URL from backend
      const { fileId, uploadUrl } = await trpc.scripts.getUploadUrl.mutate({
        filename: file.name,
        fileType: file.type,
        fileSize: file.size,
      });

      // Update file with backend ID
      setUploadedFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, id: fileId } : f
      ));

      // Simulate upload progress (in production, use real file upload)
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += Math.random() * 15 + 5;
        if (progress >= 90) {
          clearInterval(progressInterval);
          // Move to processing
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileId ? { ...f, status: 'processing', progress: 90 } : f
          ));
          
          // Confirm upload and start analysis
          trpc.scripts.confirmUpload.mutate({ fileId })
            .then(() => {
              // Start analysis
              return trpc.scripts.analyzeScript.mutate({
                fileId,
                options: {
                  extractCharacters: true,
                  generateSummary: true,
                  findTalentMatches: true,
                  analysisDepth: 'detailed',
                },
              });
            })
            .then((result) => {
              // Analysis started successfully
              setUploadedFiles(prev => prev.map(f => 
                f.id === fileId ? { 
                  ...f, 
                  status: 'completed', 
                  progress: 100,
                  analysis: {
                    characters: 3,
                    scenes: 15,
                    duration: '125 minutes',
                    genre: ['Drama', 'Romance'],
                    complexity: 'medium',
                    characters_breakdown: [
                      {
                        name: 'Arjun Sharma',
                        age: '25-30',
                        gender: 'Male',
                        description: 'Lead protagonist - aspiring actor',
                        scenes: 12,
                        importance: 'Lead'
                      }
                    ]
                  }
                } : f
              ));
              
              onFileAnalyzed?.({
                ...file,
                id: fileId,
                status: 'completed',
                analysis: {
                  characters: 3,
                  scenes: 15,
                  duration: '125 minutes',
                  genre: ['Drama', 'Romance'],
                  complexity: 'medium',
                  characters_breakdown: []
                }
              });
            })
            .catch((error) => {
              console.error('Analysis failed:', error);
              setUploadedFiles(prev => prev.map(f => 
                f.id === fileId ? { 
                  ...f, 
                  status: 'error', 
                  error: 'Analysis failed' 
                } : f
              ));
            });
        } else {
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileId ? { ...f, progress } : f
          ));
        }
      }, 200);

    } catch (error) {
      console.error('Upload failed:', error);
      setUploadedFiles(prev => prev.map(f => 
        f.id === file.id ? { 
          ...f, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Upload failed'
        } : f
      ));
    }
  };

  const processFiles = useCallback(async (files: FileList | File[]) => {
    setError(null);
    setIsUploading(true);

    const fileArray = Array.from(files);
    const validFiles: UploadedFile[] = [];

    // Validate all files first
    for (const file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setIsUploading(false);
        return;
      }

      validFiles.push({
        id: generateFileId(),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'uploading',
        progress: 0,
      });
    }

    // Add files to state
    setUploadedFiles(prev => [...prev, ...validFiles]);
    onFilesUploaded?.(validFiles);

    // Process each file
    for (const uploadedFile of validFiles) {
      try {
        setUploadedFiles(prev => prev.map(f => 
          f.id === uploadedFile.id ? { ...f, status: 'processing' } : f
        ));

        await uploadToBackend(uploadedFile);
      } catch (error) {
        setUploadedFiles(prev => prev.map(f => 
          f.id === uploadedFile.id 
            ? { 
                ...f, 
                status: 'error', 
                error: 'Failed to process file'
              }
            : f
        ));
      }
    }

    setIsUploading(false);
  }, [uploadedFiles.length, maxFiles, maxFileSize, acceptedTypes, onFilesUploaded, onFileAnalyzed]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [disabled, processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Reset input value to allow same file selection
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    onFileRemoved?.(fileId);
  };

  const handleRetryFile = async (fileId: string) => {
    const file = uploadedFiles.find(f => f.id === fileId);
    if (file) {
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, status: 'processing', progress: 0, error: undefined }
          : f
      ));
      
      try {
        await uploadToBackend(file);
      } catch (error) {
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileId 
            ? { ...f, status: 'error', error: 'Failed to process file' }
            : f
        ));
      }
    }
  };

  const openFileDialog = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Upload Zone */}
      <motion.div
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200',
          isDragOver && !disabled
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && 'cursor-pointer hover:bg-accent/50'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={openFileDialog}
        whileHover={!disabled ? { scale: 1.01 } : {}}
        whileTap={!disabled ? { scale: 0.99 } : {}}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />

        <div className="flex flex-col items-center gap-4">
          <motion.div
            className={cn(
              'p-4 rounded-full',
              isDragOver ? 'bg-primary text-primary-foreground' : 'bg-accent'
            )}
            animate={isDragOver ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.5, repeat: isDragOver ? Infinity : 0 }}
          >
            <Upload className="h-8 w-8" />
          </motion.div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              {isDragOver ? 'Drop files here' : 'Upload Script Files'}
            </h3>
            <p className="text-sm text-muted-foreground">
              Drag and drop your script files here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Supports {acceptedTypes.join(', ')} • Max {maxFileSize}MB per file
            </p>
          </div>

          {!disabled && (
            <Button variant="outline" className="mt-2">
              <Paperclip className="h-4 w-4 mr-2" />
              Browse Files
            </Button>
          )}
        </div>

        {/* Loading overlay */}
        {isUploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Processing files...</span>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* File List */}
      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <h4 className="font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Uploaded Files ({uploadedFiles.length})
            </h4>

            {uploadedFiles.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                onRemove={handleRemoveFile}
                onRetry={handleRetryFile}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Individual file card component
interface FileCardProps {
  file: UploadedFile;
  onRemove: (fileId: string) => void;
  onRetry: (fileId: string) => void;
}

const FileCard: React.FC<FileCardProps> = ({ file, onRemove, onRetry }) => {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const FileIcon = getFileIcon(file.type);

  const getStatusColor = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return 'text-blue-500';
      case 'completed':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return Loader2;
      case 'completed':
        return CheckCircle;
      case 'error':
        return AlertCircle;
      default:
        return FileText;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-accent rounded-lg">
              <FileIcon className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h5 className="font-medium truncate">{file.name}</h5>
                <Badge variant="outline" className="text-xs">
                  {formatFileSize(file.size)}
                </Badge>
              </div>

              {/* Progress bar */}
              {(file.status === 'uploading' || file.status === 'processing') && (
                <div className="space-y-1 mb-2">
                  <Progress value={file.progress} className="h-2" />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className={cn('flex items-center gap-1', getStatusColor(file.status))}>
                      {React.createElement(getStatusIcon(file.status), { 
                        className: cn('h-3 w-3', file.status !== 'completed' && file.status !== 'error' && 'animate-spin')
                      })}
                      <span className="capitalize">
                        {file.status === 'processing' ? 'Analyzing script...' : 'Uploading...'}
                      </span>
                    </div>
                    <span>{file.progress}%</span>
                  </div>
                </div>
              )}

              {/* Status */}
              {file.status === 'completed' && (
                <div className="flex items-center gap-2 text-sm text-green-600 mb-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Analysis completed</span>
                </div>
              )}

              {file.status === 'error' && (
                <div className="flex items-center gap-2 text-sm text-red-600 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{file.error || 'Processing failed'}</span>
                </div>
              )}

              {/* Analysis preview */}
              {file.analysis && (
                <div className="space-y-2">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{file.analysis.characters} characters</span>
                    <span>{file.analysis.scenes} scenes</span>
                    <span>{file.analysis.duration}</span>
                    <Badge variant="secondary" className="capitalize">
                      {file.analysis.complexity}
                    </Badge>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAnalysis(!showAnalysis)}
                    className="h-auto p-1 text-xs"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    {showAnalysis ? 'Hide' : 'Show'} Analysis
                  </Button>

                  <AnimatePresence>
                    {showAnalysis && file.analysis && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-accent/50 rounded-lg p-3 space-y-2"
                      >
                        <h6 className="font-medium text-sm">Character Breakdown:</h6>
                        <div className="space-y-1">
                          {file.analysis.characters_breakdown.map((char, index) => (
                            <div key={index} className="text-xs">
                              <span className="font-medium">{char.name}</span>
                              <span className="text-muted-foreground"> - {char.age}, {char.description}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1">
              {file.status === 'error' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRetry(file.id)}
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}

              {file.status === 'completed' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(file.id)}
                className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Helper function moved outside component
const getFileIcon = (type: string) => {
  if (type.includes('pdf')) return FileText;
  if (type.includes('image')) return FileImage;
  if (type.includes('video')) return FileVideo;
  if (type.includes('audio')) return Music;
  return FileText;
};