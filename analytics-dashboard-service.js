// CastMatch Analytics Dashboard Service
// Advanced real-time analytics and performance monitoring for casting operations

const express = require('express');
const cors = require('cors');
const EventEmitter = require('events');

class AnalyticsEngine extends EventEmitter {
    constructor() {
        super();
        this.metrics = {
            // System Performance Metrics
            system: {
                uptime: process.uptime(),
                startTime: new Date(),
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage(),
                nodeVersion: process.version,
                platform: process.platform
            },
            
            // Service-Specific Metrics
            services: {
                backend: { status: 'unknown', responseTime: 0, requests: 0, errors: 0 },
                scriptAnalysis: { status: 'unknown', responseTime: 0, requests: 0, accuracy: 91 },
                voiceIntegration: { status: 'unknown', responseTime: 0, requests: 0, accuracy: 89 },
                database: { status: 'unknown', responseTime: 0, connections: 0, queries: 0 },
                redis: { status: 'unknown', responseTime: 0, hits: 0, misses: 0 }
            },
            
            // Business Analytics
            casting: {
                totalProjects: 0,
                activeProjects: 0,
                completedProjects: 0,
                totalTalents: 0,
                activeTalents: 0,
                auditionsScheduled: 0,
                auditionsCompleted: 0,
                averageMatchScore: 0.82,
                successfulCastings: 0
            },
            
            // AI Performance Analytics
            ai: {
                conversationSessions: 0,
                messagesSent: 0,
                messagesReceived: 0,
                averageResponseTime: 1.2,
                scriptAnalysisCount: 0,
                charactersExtracted: 0,
                voiceCommandsProcessed: 0,
                intentRecognitionRate: 0.89,
                aiAccuracy: 0.91
            },
            
            // User Activity Analytics
            users: {
                totalUsers: 0,
                activeUsers: 0,
                dailyActiveUsers: 0,
                sessionDuration: 0,
                actionsByType: {
                    search: 0,
                    create: 0,
                    analyze: 0,
                    schedule: 0,
                    voice: 0
                },
                geographicDistribution: {
                    'Mumbai': 45,
                    'Delhi': 25,
                    'Bangalore': 15,
                    'Chennai': 10,
                    'Others': 5
                }
            },
            
            // Performance Trends
            trends: {
                hourly: Array(24).fill(0).map((_, i) => ({ hour: i, requests: Math.floor(Math.random() * 100) })),
                daily: Array(7).fill(0).map((_, i) => ({ 
                    day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i], 
                    users: Math.floor(Math.random() * 500) + 100,
                    projects: Math.floor(Math.random() * 50) + 10
                })),
                monthly: Array(12).fill(0).map((_, i) => ({
                    month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
                    revenue: Math.floor(Math.random() * 100000) + 50000,
                    users: Math.floor(Math.random() * 2000) + 500
                }))
            }
        };
        
        this.alerts = [];
        this.realtimeData = new Map();
        this.startTime = Date.now();
        this.requestCount = 0;
        
        // Initialize real-time monitoring
        this.initializeMonitoring();
    }
    
    // Initialize real-time monitoring systems
    initializeMonitoring() {
        // Update system metrics every 30 seconds
        setInterval(() => {
            this.updateSystemMetrics();
        }, 30000);
        
        // Generate simulated business events
        setInterval(() => {
            this.simulateBusinessActivity();
        }, 10000);
        
        // Check for alerts every minute
        setInterval(() => {
            this.checkAlerts();
        }, 60000);
        
        console.log('🔍 Analytics monitoring system initialized');
    }
    
    // Update system performance metrics
    updateSystemMetrics() {
        this.metrics.system.uptime = process.uptime();
        this.metrics.system.memoryUsage = process.memoryUsage();
        this.metrics.system.cpuUsage = process.cpuUsage();
        
        // Update service health simulation
        const services = Object.keys(this.metrics.services);
        services.forEach(service => {
            this.metrics.services[service].status = Math.random() > 0.1 ? 'healthy' : 'warning';
            this.metrics.services[service].responseTime = Math.round((Math.random() * 1000 + 100) * 100) / 100;
        });
        
        this.emit('systemMetricsUpdated', this.metrics.system);
    }
    
    // Simulate business activity for demo purposes
    simulateBusinessActivity() {
        // Simulate casting activity
        if (Math.random() > 0.7) {
            this.recordEvent('project_created', { projectType: 'series', genre: 'thriller' });
        }
        
        if (Math.random() > 0.6) {
            this.recordEvent('talent_search', { criteria: 'age:25-35,genre:action' });
        }
        
        if (Math.random() > 0.8) {
            this.recordEvent('audition_scheduled', { talentId: `talent-${Math.floor(Math.random() * 1000)}` });
        }
        
        if (Math.random() > 0.5) {
            this.recordEvent('ai_interaction', { 
                type: Math.random() > 0.5 ? 'chat' : 'voice',
                duration: Math.floor(Math.random() * 300) + 30
            });
        }
    }
    
    // Record business events
    recordEvent(eventType, data = {}) {
        const event = {
            type: eventType,
            timestamp: new Date(),
            data: data,
            id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
        };
        
        // Update relevant metrics based on event type
        switch (eventType) {
            case 'project_created':
                this.metrics.casting.totalProjects++;
                this.metrics.casting.activeProjects++;
                break;
                
            case 'talent_search':
                this.metrics.users.actionsByType.search++;
                break;
                
            case 'audition_scheduled':
                this.metrics.casting.auditionsScheduled++;
                this.metrics.users.actionsByType.schedule++;
                break;
                
            case 'script_analyzed':
                this.metrics.ai.scriptAnalysisCount++;
                this.metrics.users.actionsByType.analyze++;
                break;
                
            case 'voice_command':
                this.metrics.ai.voiceCommandsProcessed++;
                this.metrics.users.actionsByType.voice++;
                break;
                
            case 'ai_interaction':
                if (data.type === 'chat') {
                    this.metrics.ai.messagesSent++;
                }
                break;
        }
        
        // Store real-time data
        const hour = new Date().getHours();
        const currentHourData = this.realtimeData.get(hour) || { events: [], count: 0 };
        currentHourData.events.push(event);
        currentHourData.count++;
        this.realtimeData.set(hour, currentHourData);
        
        this.emit('eventRecorded', event);
        
        console.log(`[Analytics] Event recorded: ${eventType}`, data);
    }
    
    // Check for system alerts and notifications
    checkAlerts() {
        const now = new Date();
        
        // Memory usage alert
        const memUsage = this.metrics.system.memoryUsage.heapUsed / this.metrics.system.memoryUsage.heapTotal;
        if (memUsage > 0.8) {
            this.addAlert('warning', 'High memory usage detected', `Memory usage is at ${Math.round(memUsage * 100)}%`);
        }
        
        // Service health alerts
        Object.entries(this.metrics.services).forEach(([service, data]) => {
            if (data.status === 'error') {
                this.addAlert('error', `Service ${service} is down`, 'Immediate attention required');
            } else if (data.responseTime > 3000) {
                this.addAlert('warning', `Service ${service} slow response`, `Response time: ${data.responseTime}ms`);
            }
        });
        
        // Business metric alerts
        if (this.metrics.casting.activeProjects < 5) {
            this.addAlert('info', 'Low active project count', 'Consider marketing initiatives');
        }
        
        if (this.metrics.ai.intentRecognitionRate < 0.8) {
            this.addAlert('warning', 'AI accuracy below threshold', 'Voice recognition needs attention');
        }
    }
    
    // Add system alert
    addAlert(level, title, message) {
        const alert = {
            id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            level: level, // info, warning, error, critical
            title: title,
            message: message,
            timestamp: new Date(),
            acknowledged: false
        };
        
        this.alerts.unshift(alert);
        
        // Keep only last 50 alerts
        if (this.alerts.length > 50) {
            this.alerts = this.alerts.slice(0, 50);
        }
        
        this.emit('alertAdded', alert);
        
        console.log(`[Analytics] Alert added: [${level.toUpperCase()}] ${title} - ${message}`);
    }
    
    // Get comprehensive analytics data
    getAnalytics() {
        return {
            ...this.metrics,
            alerts: this.alerts.filter(a => !a.acknowledged).slice(0, 10),
            realtime: {
                currentHour: new Date().getHours(),
                eventsThisHour: this.realtimeData.get(new Date().getHours())?.count || 0,
                totalEvents: Array.from(this.realtimeData.values()).reduce((sum, data) => sum + data.count, 0),
                lastUpdated: new Date().toISOString()
            },
            performance: {
                requestsPerSecond: this.calculateRPS(),
                averageResponseTime: this.calculateAverageResponseTime(),
                errorRate: this.calculateErrorRate(),
                successRate: (1 - this.calculateErrorRate()) * 100
            }
        };
    }
    
    // Calculate requests per second
    calculateRPS() {
        const uptime = Math.max(process.uptime(), 1);
        return Math.round((this.requestCount / uptime) * 100) / 100;
    }
    
    // Calculate average response time
    calculateAverageResponseTime() {
        const services = Object.values(this.metrics.services);
        const totalResponseTime = services.reduce((sum, service) => sum + service.responseTime, 0);
        return Math.round((totalResponseTime / services.length) * 100) / 100;
    }
    
    // Calculate error rate
    calculateErrorRate() {
        const services = Object.values(this.metrics.services);
        const errorCount = services.filter(service => service.status === 'error').length;
        return errorCount / services.length;
    }
    
    // Get real-time metrics for live dashboard updates
    getRealtimeMetrics() {
        const currentHour = new Date().getHours();
        const hourlyData = [];
        
        for (let i = 0; i < 24; i++) {
            const data = this.realtimeData.get(i) || { count: 0, events: [] };
            hourlyData.push({
                hour: i,
                events: data.count,
                active: i === currentHour
            });
        }
        
        return {
            hourlyActivity: hourlyData,
            systemHealth: {
                cpu: Math.random() * 100,
                memory: (this.metrics.system.memoryUsage.heapUsed / this.metrics.system.memoryUsage.heapTotal) * 100,
                uptime: process.uptime()
            },
            activeUsers: Math.floor(Math.random() * 150) + 50,
            requestsPerSecond: this.calculateRPS(),
            timestamp: new Date().toISOString()
        };
    }
    
    // Generate performance reports
    generateReport(type = 'daily', startDate = null, endDate = null) {
        const report = {
            type: type,
            generatedAt: new Date().toISOString(),
            period: {
                start: startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                end: endDate || new Date().toISOString()
            },
            summary: {
                totalProjects: this.metrics.casting.totalProjects,
                totalTalents: this.metrics.casting.totalTalents,
                auditionsScheduled: this.metrics.casting.auditionsScheduled,
                aiInteractions: this.metrics.ai.messagesSent + this.metrics.ai.voiceCommandsProcessed,
                averageResponseTime: this.calculateAverageResponseTime(),
                successRate: (1 - this.calculateErrorRate()) * 100
            },
            details: {
                serviceDevelopment: this.metrics.services,
                userActivity: this.metrics.users.actionsByType,
                geographicDistribution: this.metrics.users.geographicDistribution,
                trends: this.metrics.trends,
                topAlerts: this.alerts.slice(0, 5)
            },
            recommendations: this.generateRecommendations()
        };
        
        return report;
    }
    
    // Generate AI-powered recommendations based on analytics
    generateRecommendations() {
        const recommendations = [];
        
        // Performance recommendations
        if (this.calculateAverageResponseTime() > 2000) {
            recommendations.push({
                type: 'performance',
                priority: 'high',
                title: 'Optimize Response Times',
                description: 'Average response time is above 2 seconds. Consider caching strategies or service scaling.',
                impact: 'User experience improvement'
            });
        }
        
        // Business recommendations
        if (this.metrics.casting.totalProjects < 20) {
            recommendations.push({
                type: 'business',
                priority: 'medium',
                title: 'Increase Project Volume',
                description: 'Current project count is below optimal. Consider marketing campaigns or partnership opportunities.',
                impact: 'Revenue growth'
            });
        }
        
        // AI recommendations
        if (this.metrics.ai.intentRecognitionRate < 0.85) {
            recommendations.push({
                type: 'ai',
                priority: 'medium',
                title: 'Improve AI Accuracy',
                description: 'Voice and chat AI accuracy can be improved with additional training data and model refinement.',
                impact: 'User satisfaction'
            });
        }
        
        // User experience recommendations
        const totalActions = Object.values(this.metrics.users.actionsByType).reduce((a, b) => a + b, 0);
        if (totalActions < 100) {
            recommendations.push({
                type: 'user_experience',
                priority: 'low',
                title: 'Enhance User Engagement',
                description: 'User interaction levels are below average. Consider UI/UX improvements or feature enhancements.',
                impact: 'User retention'
            });
        }
        
        return recommendations;
    }
    
    // Acknowledge an alert
    acknowledgeAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            alert.acknowledgedAt = new Date();
            this.emit('alertAcknowledged', alert);
            return true;
        }
        return false;
    }
}

// Express.js server for Analytics Dashboard Service
const app = express();
app.use(cors());
app.use(express.json());

const analytics = new AnalyticsEngine();

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'CastMatch Analytics Dashboard Service',
        version: '1.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Get comprehensive analytics data
app.get('/api/analytics', (req, res) => {
    try {
        analytics.requestCount++;
        const analyticsData = analytics.getAnalytics();
        
        res.json({
            success: true,
            analytics: analyticsData
        });
    } catch (error) {
        console.error('[Analytics] Error retrieving analytics:', error);
        res.status(500).json({
            error: 'Failed to retrieve analytics',
            details: error.message
        });
    }
});

// Get real-time metrics for live updates
app.get('/api/analytics/realtime', (req, res) => {
    try {
        analytics.requestCount++;
        const realtimeData = analytics.getRealtimeMetrics();
        
        res.json({
            success: true,
            realtime: realtimeData
        });
    } catch (error) {
        console.error('[Analytics] Error retrieving realtime metrics:', error);
        res.status(500).json({
            error: 'Failed to retrieve realtime metrics',
            details: error.message
        });
    }
});

// Record custom business event
app.post('/api/analytics/event', (req, res) => {
    try {
        const { type, data = {} } = req.body;
        
        if (!type) {
            return res.status(400).json({
                error: 'Event type is required'
            });
        }
        
        analytics.recordEvent(type, data);
        analytics.requestCount++;
        
        res.json({
            success: true,
            message: 'Event recorded successfully',
            eventType: type
        });
    } catch (error) {
        console.error('[Analytics] Error recording event:', error);
        res.status(500).json({
            error: 'Failed to record event',
            details: error.message
        });
    }
});

// Generate analytics report
app.post('/api/analytics/report', (req, res) => {
    try {
        const { type = 'daily', startDate, endDate } = req.body;
        
        const report = analytics.generateReport(type, startDate, endDate);
        analytics.requestCount++;
        
        res.json({
            success: true,
            report: report
        });
    } catch (error) {
        console.error('[Analytics] Error generating report:', error);
        res.status(500).json({
            error: 'Failed to generate report',
            details: error.message
        });
    }
});

// Get current alerts
app.get('/api/analytics/alerts', (req, res) => {
    try {
        const { acknowledged = false } = req.query;
        
        let alerts = analytics.alerts;
        if (acknowledged === 'false') {
            alerts = alerts.filter(alert => !alert.acknowledged);
        }
        
        res.json({
            success: true,
            alerts: alerts.slice(0, 20), // Limit to 20 most recent
            total: alerts.length
        });
    } catch (error) {
        console.error('[Analytics] Error retrieving alerts:', error);
        res.status(500).json({
            error: 'Failed to retrieve alerts',
            details: error.message
        });
    }
});

// Acknowledge an alert
app.post('/api/analytics/alerts/:alertId/acknowledge', (req, res) => {
    try {
        const { alertId } = req.params;
        
        const acknowledged = analytics.acknowledgeAlert(alertId);
        
        if (acknowledged) {
            res.json({
                success: true,
                message: 'Alert acknowledged successfully'
            });
        } else {
            res.status(404).json({
                error: 'Alert not found'
            });
        }
    } catch (error) {
        console.error('[Analytics] Error acknowledging alert:', error);
        res.status(500).json({
            error: 'Failed to acknowledge alert',
            details: error.message
        });
    }
});

// Demo endpoint with sample analytics
app.get('/api/analytics/demo', (req, res) => {
    try {
        // Generate some demo events
        const demoEvents = [
            { type: 'project_created', data: { genre: 'thriller', location: 'Mumbai' } },
            { type: 'talent_search', data: { criteria: 'age:25-35', results: 15 } },
            { type: 'script_analyzed', data: { characters: 8, genre: 'action' } },
            { type: 'voice_command', data: { command: 'find actors for comedy', success: true } },
            { type: 'audition_scheduled', data: { talent: 'Demo Actor', date: '2025-09-09' } }
        ];
        
        demoEvents.forEach(event => {
            analytics.recordEvent(event.type, event.data);
        });
        
        // Add a demo alert
        analytics.addAlert('info', 'Demo Mode Active', 'Analytics dashboard is running in demonstration mode with simulated data');
        
        const analyticsData = analytics.getAnalytics();
        
        res.json({
            success: true,
            demo: true,
            message: 'Demo analytics generated with sample casting data',
            analytics: analyticsData
        });
    } catch (error) {
        console.error('[Analytics] Demo error:', error);
        res.status(500).json({
            error: 'Demo generation failed',
            details: error.message
        });
    }
});

// Server-Sent Events for real-time dashboard updates
app.get('/api/analytics/stream', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    console.log('[Analytics] Client connected to real-time stream');

    // Send initial data
    res.write(`data: ${JSON.stringify({
        type: 'init',
        data: analytics.getRealtimeMetrics()
    })}\n\n`);

    // Set up real-time updates every 5 seconds
    const interval = setInterval(() => {
        const realtimeData = analytics.getRealtimeMetrics();
        res.write(`data: ${JSON.stringify({
            type: 'update',
            data: realtimeData
        })}\n\n`);
    }, 5000);

    // Listen for analytics events
    const eventListener = (event) => {
        res.write(`data: ${JSON.stringify({
            type: 'event',
            data: event
        })}\n\n`);
    };

    const alertListener = (alert) => {
        res.write(`data: ${JSON.stringify({
            type: 'alert',
            data: alert
        })}\n\n`);
    };

    analytics.on('eventRecorded', eventListener);
    analytics.on('alertAdded', alertListener);

    // Clean up on client disconnect
    req.on('close', () => {
        console.log('[Analytics] Client disconnected from real-time stream');
        clearInterval(interval);
        analytics.removeListener('eventRecorded', eventListener);
        analytics.removeListener('alertAdded', alertListener);
    });
});

const PORT = process.env.ANALYTICS_PORT || 8003;

app.listen(PORT, () => {
    console.log(`📊 CastMatch Analytics Dashboard Service running on port ${PORT}`);
    console.log(`📈 Health check: http://localhost:${PORT}/health`);
    console.log(`📊 Analytics data: http://localhost:${PORT}/api/analytics`);
    console.log(`🔴 Real-time stream: http://localhost:${PORT}/api/analytics/stream`);
    console.log(`🎬 Demo: http://localhost:${PORT}/api/analytics/demo`);
    console.log('✨ Advanced analytics and monitoring ready!');
    
    // Generate some initial demo data
    setTimeout(() => {
        analytics.recordEvent('system_startup', { service: 'analytics-dashboard' });
    }, 1000);
});

module.exports = { AnalyticsEngine, app };