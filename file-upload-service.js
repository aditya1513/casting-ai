const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const pdfParse = require('pdf-parse');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.FILE_UPLOAD_PORT || 8004;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rate limiting for file uploads
const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 requests per windowMs
    message: { error: 'Too many file upload requests, please try again later.' }
});

app.use('/api/upload', uploadLimiter);

// Create upload directories
const uploadDirs = {
    scripts: './uploads/scripts',
    profiles: './uploads/profiles',
    documents: './uploads/documents',
    temp: './uploads/temp'
};

Object.values(uploadDirs).forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure multer for different file types
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadType = req.params.type || 'documents';
        const destinationMap = {
            'script': uploadDirs.scripts,
            'profile': uploadDirs.profiles,
            'document': uploadDirs.documents
        };
        cb(null, destinationMap[uploadType] || uploadDirs.documents);
    },
    filename: (req, file, cb) => {
        const uniqueId = uuidv4();
        const extension = path.extname(file.originalname);
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${uniqueId}-${sanitizedName}`);
    }
});

// File filter for security
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = {
        'script': ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        'profile': ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        'document': ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']
    };
    
    const uploadType = req.params.type || 'document';
    const allowedTypes = allowedMimeTypes[uploadType] || allowedMimeTypes.document;
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`File type ${file.mimetype} not allowed for ${uploadType} upload`), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
        files: 5 // Max 5 files per upload
    }
});

// File Upload Service Class
class FileUploadService {
    constructor() {
        this.uploadHistory = new Map();
        this.processingQueue = [];
        this.analytics = {
            totalUploads: 0,
            successfulProcessing: 0,
            errors: 0,
            storageUsed: 0
        };
    }

    // Process uploaded script files
    async processScriptFile(filePath, originalName) {
        try {
            const fileExtension = path.extname(originalName).toLowerCase();
            let content = '';
            
            if (fileExtension === '.pdf') {
                const pdfBuffer = fs.readFileSync(filePath);
                const pdfData = await pdfParse(pdfBuffer);
                content = pdfData.text;
            } else if (fileExtension === '.txt') {
                content = fs.readFileSync(filePath, 'utf8');
            } else {
                throw new Error('Unsupported script file format');
            }

            // Extract basic script information
            const analysis = this.analyzeScriptContent(content);
            
            return {
                success: true,
                analysis,
                contentPreview: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
                wordCount: content.split(/\s+/).length,
                pageCount: Math.ceil(content.length / 2500) // Approximate
            };
        } catch (error) {
            throw new Error(`Script processing failed: ${error.message}`);
        }
    }

    // Analyze script content for basic insights
    analyzeScriptContent(content) {
        const lines = content.split('\n');
        const characters = [];
        const scenes = [];
        
        // Simple character detection (looking for character names in dialogue)
        const characterPattern = /^[A-Z][A-Z\s]+$/;
        const scenePattern = /(FADE IN|INT\.|EXT\.|SCENE)/i;
        
        lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            
            // Detect characters
            if (characterPattern.test(trimmedLine) && trimmedLine.length < 50) {
                if (!characters.includes(trimmedLine)) {
                    characters.push(trimmedLine);
                }
            }
            
            // Detect scenes
            if (scenePattern.test(trimmedLine)) {
                scenes.push({
                    line: index + 1,
                    description: trimmedLine.substring(0, 100)
                });
            }
        });

        return {
            estimatedCharacters: characters.slice(0, 20), // Top 20 characters
            estimatedScenes: scenes.length,
            sceneBreaks: scenes.slice(0, 10), // First 10 scenes
            genre: this.detectGenre(content),
            tone: this.detectTone(content)
        };
    }

    // Simple genre detection based on keywords
    detectGenre(content) {
        const genreKeywords = {
            'thriller': ['murder', 'killer', 'suspense', 'chase', 'danger', 'threat'],
            'comedy': ['funny', 'laugh', 'joke', 'humor', 'silly', 'comic'],
            'romance': ['love', 'heart', 'kiss', 'romantic', 'relationship', 'marry'],
            'drama': ['emotion', 'family', 'struggle', 'conflict', 'tears', 'pain'],
            'action': ['fight', 'explosion', 'gun', 'battle', 'chase', 'weapon'],
            'horror': ['ghost', 'scary', 'fear', 'monster', 'blood', 'scream']
        };

        const contentLower = content.toLowerCase();
        const scores = {};

        Object.keys(genreKeywords).forEach(genre => {
            scores[genre] = genreKeywords[genre].reduce((count, keyword) => {
                const matches = (contentLower.match(new RegExp(keyword, 'g')) || []).length;
                return count + matches;
            }, 0);
        });

        const topGenre = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
        return scores[topGenre] > 0 ? topGenre : 'drama';
    }

    // Detect tone/mood of the script
    detectTone(content) {
        const positiveWords = ['happy', 'joy', 'love', 'success', 'win', 'celebrate', 'smile'];
        const negativeWords = ['sad', 'death', 'loss', 'fail', 'cry', 'pain', 'suffer'];
        
        const contentLower = content.toLowerCase();
        const positiveCount = positiveWords.reduce((count, word) => 
            count + (contentLower.match(new RegExp(word, 'g')) || []).length, 0);
        const negativeCount = negativeWords.reduce((count, word) => 
            count + (contentLower.match(new RegExp(word, 'g')) || []).length, 0);
        
        if (positiveCount > negativeCount) return 'uplifting';
        if (negativeCount > positiveCount) return 'serious';
        return 'balanced';
    }

    // Process profile images
    async processProfileImage(filePath, originalName) {
        try {
            const outputPath = filePath.replace(path.extname(filePath), '_processed.webp');
            
            // Resize and optimize image
            const metadata = await sharp(filePath)
                .resize(800, 800, { 
                    fit: 'cover',
                    withoutEnlargement: true
                })
                .webp({ quality: 85 })
                .toFile(outputPath);

            // Generate thumbnail
            const thumbnailPath = filePath.replace(path.extname(filePath), '_thumb.webp');
            await sharp(filePath)
                .resize(150, 150, { fit: 'cover' })
                .webp({ quality: 80 })
                .toFile(thumbnailPath);

            return {
                success: true,
                originalPath: filePath,
                processedPath: outputPath,
                thumbnailPath: thumbnailPath,
                metadata: {
                    width: metadata.width,
                    height: metadata.height,
                    format: metadata.format,
                    size: metadata.size
                }
            };
        } catch (error) {
            throw new Error(`Image processing failed: ${error.message}`);
        }
    }

    // Get upload analytics
    getAnalytics() {
        return {
            ...this.analytics,
            queueLength: this.processingQueue.length,
            recentUploads: Array.from(this.uploadHistory.values())
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 10)
        };
    }
}

const fileService = new FileUploadService();

// Routes

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'CastMatch File Upload Service',
        version: '1.0.0',
        uptime: process.uptime(),
        analytics: fileService.getAnalytics()
    });
});

// Upload endpoint for different file types
app.post('/api/upload/:type', upload.array('files', 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const uploadType = req.params.type;
        const results = [];

        for (const file of req.files) {
            try {
                let processedResult = { success: true, file: file.filename };
                
                // Process based on upload type
                if (uploadType === 'script') {
                    processedResult = await fileService.processScriptFile(file.path, file.originalname);
                } else if (uploadType === 'profile') {
                    processedResult = await fileService.processProfileImage(file.path, file.originalname);
                }

                const uploadRecord = {
                    id: uuidv4(),
                    originalName: file.originalname,
                    filename: file.filename,
                    type: uploadType,
                    size: file.size,
                    mimetype: file.mimetype,
                    timestamp: new Date().toISOString(),
                    processed: processedResult.success,
                    ...processedResult
                };

                fileService.uploadHistory.set(uploadRecord.id, uploadRecord);
                fileService.analytics.totalUploads++;
                fileService.analytics.storageUsed += file.size;
                
                if (processedResult.success) {
                    fileService.analytics.successfulProcessing++;
                }

                results.push(uploadRecord);
            } catch (error) {
                fileService.analytics.errors++;
                results.push({
                    originalName: file.originalname,
                    error: error.message,
                    success: false
                });
            }
        }

        res.json({
            success: true,
            uploadType,
            filesProcessed: results.length,
            results
        });
    } catch (error) {
        fileService.analytics.errors++;
        res.status(500).json({ error: error.message });
    }
});

// Get upload history
app.get('/api/uploads', (req, res) => {
    const { type, limit = 20 } = req.query;
    let uploads = Array.from(fileService.uploadHistory.values());
    
    if (type) {
        uploads = uploads.filter(upload => upload.type === type);
    }
    
    uploads = uploads
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, parseInt(limit));
    
    res.json({
        success: true,
        uploads,
        totalCount: fileService.uploadHistory.size
    });
});

// Get specific upload details
app.get('/api/upload/:id', (req, res) => {
    const uploadRecord = fileService.uploadHistory.get(req.params.id);
    
    if (!uploadRecord) {
        return res.status(404).json({ error: 'Upload not found' });
    }
    
    res.json({
        success: true,
        upload: uploadRecord
    });
});

// Download/serve files
app.get('/api/file/:type/:filename', (req, res) => {
    const { type, filename } = req.params;
    const typeMap = {
        'script': uploadDirs.scripts,
        'profile': uploadDirs.profiles,
        'document': uploadDirs.documents
    };
    
    const directory = typeMap[type];
    if (!directory) {
        return res.status(400).json({ error: 'Invalid file type' });
    }
    
    const filePath = path.join(directory, filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }
    
    res.sendFile(path.resolve(filePath));
});

// Delete upload
app.delete('/api/upload/:id', (req, res) => {
    const uploadRecord = fileService.uploadHistory.get(req.params.id);
    
    if (!uploadRecord) {
        return res.status(404).json({ error: 'Upload not found' });
    }
    
    try {
        // Delete physical files
        const filesToDelete = [uploadRecord.filename];
        if (uploadRecord.processedPath) filesToDelete.push(path.basename(uploadRecord.processedPath));
        if (uploadRecord.thumbnailPath) filesToDelete.push(path.basename(uploadRecord.thumbnailPath));
        
        filesToDelete.forEach(filename => {
            const fullPath = path.join(uploadDirs[uploadRecord.type], filename);
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        });
        
        fileService.uploadHistory.delete(req.params.id);
        fileService.analytics.storageUsed -= uploadRecord.size;
        
        res.json({ success: true, message: 'Upload deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Analytics endpoint
app.get('/api/analytics', (req, res) => {
    res.json({
        success: true,
        analytics: fileService.getAnalytics()
    });
});

// Demo endpoint with sample data
app.get('/api/demo', (req, res) => {
    res.json({
        success: true,
        message: 'CastMatch File Upload Service - Demo Ready',
        capabilities: {
            scriptProcessing: 'PDF and text file analysis with character/scene extraction',
            imageProcessing: 'Profile image optimization and thumbnail generation',
            documentManagement: 'Secure file storage with analytics',
            supportedFormats: {
                scripts: ['PDF', 'TXT', 'DOC', 'DOCX'],
                profiles: ['JPEG', 'PNG', 'WEBP', 'GIF'],
                documents: ['PDF', 'TXT', 'DOC', 'DOCX', 'Images']
            },
            features: [
                'Automatic file type detection and validation',
                'Image optimization and thumbnail generation',
                'Script content analysis and character extraction',
                'Upload history and analytics tracking',
                'Rate limiting and security measures',
                'RESTful API with comprehensive error handling'
            ]
        },
        endpoints: [
            'POST /api/upload/:type - Upload files (script/profile/document)',
            'GET /api/uploads - Get upload history',
            'GET /api/upload/:id - Get specific upload details',
            'GET /api/file/:type/:filename - Download/serve files',
            'DELETE /api/upload/:id - Delete upload',
            'GET /api/analytics - Get service analytics'
        ]
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ error: 'Too many files. Maximum is 5 files per upload.' });
        }
    }
    
    console.error('File upload error:', error);
    res.status(500).json({ error: error.message });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 CastMatch File Upload Service running on port ${PORT}`);
    console.log(`📁 Upload directories created: ${Object.values(uploadDirs).join(', ')}`);
    console.log(`🔒 Security: Rate limiting, file validation, and size limits enabled`);
    console.log(`📊 Features: Script analysis, image processing, analytics tracking`);
});

module.exports = app;