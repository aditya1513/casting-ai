const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const formidable = require('formidable');
const { v4: uuidv4 } = require('uuid');

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

    // Simple text-based script analysis without external dependencies
    analyzeScriptContent(content) {
        const lines = content.split('\n');
        const characters = new Set();
        const scenes = [];
        
        // Simple character detection (looking for uppercase names)
        const characterPattern = /^[A-Z][A-Z\s]{1,30}$/;
        const scenePattern = /(FADE IN|INT\.|EXT\.|SCENE|CHAPTER)/i;
        
        lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            
            // Detect potential character names
            if (characterPattern.test(trimmedLine) && trimmedLine.length < 40) {
                characters.add(trimmedLine);
            }
            
            // Detect scene breaks
            if (scenePattern.test(trimmedLine)) {
                scenes.push({
                    line: index + 1,
                    description: trimmedLine.substring(0, 100)
                });
            }
        });

        return {
            estimatedCharacters: Array.from(characters).slice(0, 15),
            estimatedScenes: scenes.length,
            sceneBreaks: scenes.slice(0, 8),
            genre: this.detectGenre(content),
            tone: this.detectTone(content)
        };
    }

    // Simple genre detection based on keywords
    detectGenre(content) {
        const genreKeywords = {
            'thriller': ['murder', 'killer', 'suspense', 'chase', 'danger', 'threat', 'mystery'],
            'comedy': ['funny', 'laugh', 'joke', 'humor', 'silly', 'comic', 'hilarious'],
            'romance': ['love', 'heart', 'kiss', 'romantic', 'relationship', 'marry', 'wedding'],
            'drama': ['emotion', 'family', 'struggle', 'conflict', 'tears', 'pain', 'life'],
            'action': ['fight', 'explosion', 'gun', 'battle', 'chase', 'weapon', 'combat'],
            'horror': ['ghost', 'scary', 'fear', 'monster', 'blood', 'scream', 'nightmare']
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
        const positiveWords = ['happy', 'joy', 'love', 'success', 'win', 'celebrate', 'smile', 'hope'];
        const negativeWords = ['sad', 'death', 'loss', 'fail', 'cry', 'pain', 'suffer', 'tragedy'];
        
        const contentLower = content.toLowerCase();
        const positiveCount = positiveWords.reduce((count, word) => 
            count + (contentLower.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
        const negativeCount = negativeWords.reduce((count, word) => 
            count + (contentLower.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
        
        if (positiveCount > negativeCount * 1.2) return 'uplifting';
        if (negativeCount > positiveCount * 1.2) return 'serious';
        return 'balanced';
    }

    // Process uploaded script files
    async processScriptFile(filePath, originalName, fileSize) {
        try {
            const fileExtension = path.extname(originalName).toLowerCase();
            let content = '';
            
            if (fileExtension === '.txt') {
                content = fs.readFileSync(filePath, 'utf8');
            } else if (['.pdf', '.doc', '.docx'].includes(fileExtension)) {
                // For demo purposes, simulate processing of other formats
                content = `Simulated content extraction from ${originalName}. ` +
                         `Character 1: JAMES - A determined young actor seeking his breakthrough role. ` +
                         `Character 2: MARIA - An experienced casting director with keen insight. ` +
                         `Scene 1: Interior office setting with dramatic lighting. ` +
                         `Scene 2: Exterior Mumbai street bustling with activity. ` +
                         `The script explores themes of ambition, talent, and the pursuit of dreams in the entertainment industry.`;
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
                pageCount: Math.ceil(content.length / 2500),
                processingNote: fileExtension !== '.txt' ? 'Note: Advanced processing requires additional dependencies' : null
            };
        } catch (error) {
            throw new Error(`Script processing failed: ${error.message}`);
        }
    }

    // Simple image processing (metadata only without sharp)
    async processProfileImage(filePath, originalName, fileSize) {
        try {
            // Basic image information without image processing library
            const stats = fs.statSync(filePath);
            
            return {
                success: true,
                originalPath: filePath,
                metadata: {
                    size: stats.size,
                    format: path.extname(originalName).toLowerCase().slice(1),
                    lastModified: stats.mtime
                },
                processingNote: 'Image optimization requires additional dependencies (sharp)'
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

    // Validate file type
    validateFileType(filename, uploadType) {
        const allowedTypes = {
            'script': ['.pdf', '.txt', '.doc', '.docx'],
            'profile': ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
            'document': ['.pdf', '.txt', '.doc', '.docx', '.jpg', '.jpeg', '.png']
        };
        
        const extension = path.extname(filename).toLowerCase();
        const allowed = allowedTypes[uploadType] || allowedTypes.document;
        
        return allowed.includes(extension);
    }
}

const fileService = new FileUploadService();

// Routes

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'CastMatch File Upload Service (Simplified)',
        version: '1.0.0',
        uptime: process.uptime(),
        analytics: fileService.getAnalytics(),
        note: 'Running without external image processing dependencies'
    });
});

// Upload endpoint for different file types using formidable
app.post('/api/upload/:type', (req, res) => {
    const uploadType = req.params.type;
    const form = formidable({
        uploadDir: uploadDirs[uploadType] || uploadDirs.documents,
        keepExtensions: true,
        maxFileSize: 50 * 1024 * 1024, // 50MB
        maxFiles: 5,
        filename: (name, ext, part, form) => {
            const uniqueId = uuidv4();
            const sanitizedName = part.originalFilename?.replace(/[^a-zA-Z0-9.-]/g, '_') || 'unnamed';
            return `${uniqueId}-${sanitizedName}`;
        }
    });

    form.parse(req, async (err, fields, files) => {
        if (err) {
            fileService.analytics.errors++;
            return res.status(400).json({ error: err.message });
        }

        try {
            const uploadedFiles = Array.isArray(files.files) ? files.files : (files.files ? [files.files] : []);
            
            if (uploadedFiles.length === 0) {
                return res.status(400).json({ error: 'No files uploaded' });
            }

            const results = [];

            for (const file of uploadedFiles) {
                try {
                    const originalName = file.originalFilename || 'unknown';
                    
                    // Validate file type
                    if (!fileService.validateFileType(originalName, uploadType)) {
                        throw new Error(`File type not allowed for ${uploadType} upload`);
                    }

                    let processedResult = { success: true };
                    
                    // Process based on upload type
                    if (uploadType === 'script') {
                        processedResult = await fileService.processScriptFile(file.filepath, originalName, file.size);
                    } else if (uploadType === 'profile') {
                        processedResult = await fileService.processProfileImage(file.filepath, originalName, file.size);
                    }

                    const uploadRecord = {
                        id: uuidv4(),
                        originalName: originalName,
                        filename: path.basename(file.filepath),
                        type: uploadType,
                        size: file.size,
                        mimetype: file.mimetype || 'application/octet-stream',
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
                    // Clean up file if processing failed
                    if (file.filepath && fs.existsSync(file.filepath)) {
                        fs.unlinkSync(file.filepath);
                    }
                    results.push({
                        originalName: file.originalFilename || 'unknown',
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
        // Delete physical file
        const filePath = path.join(uploadDirs[uploadRecord.type], uploadRecord.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
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
        message: 'CastMatch File Upload Service (Simplified) - Demo Ready',
        capabilities: {
            scriptProcessing: 'Text file analysis with character/scene extraction, PDF/DOC simulation',
            imageProcessing: 'Basic file metadata (full processing requires additional dependencies)',
            documentManagement: 'Secure file storage with analytics',
            supportedFormats: {
                scripts: ['TXT', 'PDF*', 'DOC*', 'DOCX*'],
                profiles: ['JPEG', 'PNG', 'WEBP', 'GIF'],
                documents: ['All supported formats']
            },
            notes: [
                '* PDF/DOC processing simulated - requires additional dependencies for full functionality',
                'Image optimization simulated - requires sharp library for full processing',
                'This version works without external binary dependencies'
            ]
        },
        features: [
            'Automatic file type detection and validation',
            'Basic script content analysis for text files',
            'Upload history and analytics tracking',
            'Rate limiting and security measures',
            'RESTful API with comprehensive error handling',
            'Simplified implementation without external dependencies'
        ],
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
    console.error('File upload error:', error);
    res.status(500).json({ error: error.message });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 CastMatch File Upload Service (Simplified) running on port ${PORT}`);
    console.log(`📁 Upload directories created: ${Object.values(uploadDirs).join(', ')}`);
    console.log(`🔒 Security: Rate limiting, file validation, and size limits enabled`);
    console.log(`📊 Features: Basic script analysis, file management, analytics tracking`);
    console.log(`ℹ️  Note: Running without external image processing dependencies`);
});

module.exports = app;