/**
 * CastMatch UAT Feedback Analyzer
 * Processes and prioritizes user feedback from UAT sessions
 */

class FeedbackAnalyzer {
    constructor() {
        this.feedbackData = [];
        this.priorities = {
            P0: [], // Critical - Block Release
            P1: [], // High - Fix Before Launch
            P2: [], // Medium - Post-Launch Week 1
            P3: []  // Low - Backlog
        };
        
        this.categories = {
            'Search & Discovery': [],
            'Profile Management': [],
            'Audition Flow': [],
            'Communication': [],
            'Mobile Experience': [],
            'Performance': [],
            'Accessibility': [],
            'UI/UX': []
        };
        
        this.metrics = {
            taskCompletionRate: 0,
            averageTaskTime: 0,
            errorRate: 0,
            userSatisfaction: 0,
            mobilePerformance: 0,
            accessibilityScore: 0
        };
    }
    
    /**
     * Process raw feedback from UAT sessions
     */
    processFeedback(sessionData) {
        const feedback = {
            sessionId: sessionData.sessionId,
            timestamp: sessionData.timestamp,
            tester: sessionData.tester,
            role: sessionData.role,
            issues: [],
            suggestions: [],
            metrics: {}
        };
        
        // Extract issues from each test step
        sessionData.steps.forEach(step => {
            if (step.issues && step.issues.trim()) {
                feedback.issues.push({
                    step: step.title,
                    description: step.issues,
                    severity: this.calculateSeverity(step),
                    category: this.categorizeIssue(step.title)
                });
            }
            
            // Collect metrics
            if (step.actualTime) {
                feedback.metrics[step.title] = {
                    targetTime: step.targetTime,
                    actualTime: step.actualTime,
                    variance: this.calculateVariance(step.targetTime, step.actualTime)
                };
            }
        });
        
        // Process overall feedback
        if (sessionData.overallFeedback) {
            feedback.suggestions = this.extractSuggestions(sessionData.overallFeedback);
        }
        
        feedback.overallRating = sessionData.overallRating;
        feedback.completionRate = this.calculateCompletionRate(sessionData);
        
        this.feedbackData.push(feedback);
        return feedback;
    }
    
    /**
     * Calculate issue severity based on impact
     */
    calculateSeverity(step) {
        const { completedActions, totalActions, actualTime, targetTime } = step;
        const completionRate = (completedActions / totalActions) * 100;
        const timeVariance = actualTime ? ((actualTime - targetTime) / targetTime) * 100 : 0;
        
        if (completionRate < 50 || timeVariance > 200) {
            return 'P0'; // Critical
        } else if (completionRate < 75 || timeVariance > 100) {
            return 'P1'; // High
        } else if (completionRate < 90 || timeVariance > 50) {
            return 'P2'; // Medium
        } else {
            return 'P3'; // Low
        }
    }
    
    /**
     * Categorize issue based on step title
     */
    categorizeIssue(stepTitle) {
        const categories = {
            'search': 'Search & Discovery',
            'filter': 'Search & Discovery',
            'browse': 'Search & Discovery',
            'profile': 'Profile Management',
            'audition': 'Audition Flow',
            'message': 'Communication',
            'contact': 'Communication',
            'mobile': 'Mobile Experience',
            'load': 'Performance',
            'performance': 'Performance'
        };
        
        const lowerTitle = stepTitle.toLowerCase();
        for (const [keyword, category] of Object.entries(categories)) {
            if (lowerTitle.includes(keyword)) {
                return category;
            }
        }
        
        return 'UI/UX';
    }
    
    /**
     * Extract actionable suggestions from feedback text
     */
    extractSuggestions(feedbackText) {
        const suggestions = [];
        const sentences = feedbackText.split(/[.!?]+/);
        
        const actionWords = ['add', 'include', 'improve', 'fix', 'make', 'should', 'need', 'want', 'would like', 'suggest', 'recommend'];
        
        sentences.forEach(sentence => {
            const lower = sentence.toLowerCase();
            if (actionWords.some(word => lower.includes(word))) {
                suggestions.push({
                    text: sentence.trim(),
                    type: this.classifySuggestion(sentence)
                });
            }
        });
        
        return suggestions;
    }
    
    /**
     * Classify suggestion type
     */
    classifySuggestion(suggestion) {
        const lower = suggestion.toLowerCase();
        
        if (lower.includes('bug') || lower.includes('error') || lower.includes('crash')) {
            return 'Bug Fix';
        } else if (lower.includes('slow') || lower.includes('performance') || lower.includes('load')) {
            return 'Performance';
        } else if (lower.includes('ui') || lower.includes('design') || lower.includes('look')) {
            return 'UI Enhancement';
        } else if (lower.includes('feature') || lower.includes('add') || lower.includes('new')) {
            return 'Feature Request';
        } else {
            return 'General Improvement';
        }
    }
    
    /**
     * Calculate completion rate for session
     */
    calculateCompletionRate(sessionData) {
        let totalActions = 0;
        let completedActions = 0;
        
        sessionData.steps.forEach(step => {
            totalActions += step.totalActions || 0;
            completedActions += step.completedActions || 0;
        });
        
        return totalActions > 0 ? ((completedActions / totalActions) * 100).toFixed(1) : 0;
    }
    
    /**
     * Calculate time variance
     */
    calculateVariance(target, actual) {
        if (!target || !actual) return 0;
        return ((actual - target) / target * 100).toFixed(1);
    }
    
    /**
     * Prioritize all collected feedback
     */
    prioritizeFeedback() {
        // Reset priority buckets
        this.priorities = { P0: [], P1: [], P2: [], P3: [] };
        
        // Aggregate all issues
        const allIssues = [];
        this.feedbackData.forEach(session => {
            session.issues.forEach(issue => {
                allIssues.push({
                    ...issue,
                    sessionId: session.sessionId,
                    tester: session.tester
                });
            });
        });
        
        // Group by severity
        allIssues.forEach(issue => {
            this.priorities[issue.severity].push(issue);
        });
        
        // Sort within each priority by frequency
        Object.keys(this.priorities).forEach(priority => {
            this.priorities[priority] = this.groupByFrequency(this.priorities[priority]);
        });
        
        return this.priorities;
    }
    
    /**
     * Group issues by frequency
     */
    groupByFrequency(issues) {
        const grouped = {};
        
        issues.forEach(issue => {
            const key = `${issue.category}:${issue.description.substring(0, 50)}`;
            if (!grouped[key]) {
                grouped[key] = {
                    ...issue,
                    occurrences: 1,
                    testers: [issue.tester]
                };
            } else {
                grouped[key].occurrences++;
                if (!grouped[key].testers.includes(issue.tester)) {
                    grouped[key].testers.push(issue.tester);
                }
            }
        });
        
        // Convert to array and sort by occurrences
        return Object.values(grouped).sort((a, b) => b.occurrences - a.occurrences);
    }
    
    /**
     * Calculate overall metrics
     */
    calculateMetrics() {
        if (this.feedbackData.length === 0) return this.metrics;
        
        // Task completion rate
        const completionRates = this.feedbackData.map(f => parseFloat(f.completionRate));
        this.metrics.taskCompletionRate = (completionRates.reduce((a, b) => a + b, 0) / completionRates.length).toFixed(1);
        
        // Average task times
        const allTimes = [];
        this.feedbackData.forEach(session => {
            Object.values(session.metrics || {}).forEach(metric => {
                if (metric.actualTime) {
                    allTimes.push(parseFloat(metric.actualTime));
                }
            });
        });
        
        if (allTimes.length > 0) {
            this.metrics.averageTaskTime = (allTimes.reduce((a, b) => a + b, 0) / allTimes.length).toFixed(1);
        }
        
        // Error rate (percentage of sessions with P0/P1 issues)
        const sessionsWithCriticalIssues = this.feedbackData.filter(session => 
            session.issues.some(issue => issue.severity === 'P0' || issue.severity === 'P1')
        ).length;
        this.metrics.errorRate = ((sessionsWithCriticalIssues / this.feedbackData.length) * 100).toFixed(1);
        
        // User satisfaction (from overall ratings)
        const ratings = this.feedbackData.map(f => {
            const match = f.overallRating?.match(/(\d)/);
            return match ? parseInt(match[1]) : 3;
        });
        this.metrics.userSatisfaction = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
        
        return this.metrics;
    }
    
    /**
     * Generate executive summary
     */
    generateSummary() {
        const metrics = this.calculateMetrics();
        const priorities = this.prioritizeFeedback();
        
        return {
            summary: {
                totalSessions: this.feedbackData.length,
                totalTesters: new Set(this.feedbackData.map(f => f.tester)).size,
                dateRange: this.getDateRange(),
                overallStatus: this.getOverallStatus()
            },
            metrics: metrics,
            criticalIssues: priorities.P0.slice(0, 5),
            topSuggestions: this.getTopSuggestions(),
            categoryBreakdown: this.getCategoryBreakdown(),
            recommendations: this.generateRecommendations()
        };
    }
    
    /**
     * Get date range of testing
     */
    getDateRange() {
        if (this.feedbackData.length === 0) return 'No data';
        
        const dates = this.feedbackData.map(f => new Date(f.timestamp));
        const min = new Date(Math.min(...dates));
        const max = new Date(Math.max(...dates));
        
        return `${min.toLocaleDateString()} - ${max.toLocaleDateString()}`;
    }
    
    /**
     * Determine overall status
     */
    getOverallStatus() {
        const metrics = this.calculateMetrics();
        
        if (parseFloat(metrics.taskCompletionRate) >= 95 && 
            parseFloat(metrics.errorRate) < 5 &&
            parseFloat(metrics.userSatisfaction) >= 4.5) {
            return '✅ Ready for Production';
        } else if (parseFloat(metrics.taskCompletionRate) >= 90 && 
                   parseFloat(metrics.errorRate) < 10) {
            return '⚠️ Minor Issues to Address';
        } else {
            return '❌ Significant Issues - Not Ready';
        }
    }
    
    /**
     * Get top suggestions
     */
    getTopSuggestions() {
        const allSuggestions = [];
        
        this.feedbackData.forEach(session => {
            session.suggestions.forEach(suggestion => {
                allSuggestions.push(suggestion);
            });
        });
        
        // Group similar suggestions
        const grouped = {};
        allSuggestions.forEach(suggestion => {
            const key = suggestion.type;
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(suggestion.text);
        });
        
        return grouped;
    }
    
    /**
     * Get breakdown by category
     */
    getCategoryBreakdown() {
        const breakdown = {};
        
        Object.keys(this.categories).forEach(category => {
            breakdown[category] = {
                issues: 0,
                avgSeverity: null
            };
        });
        
        this.feedbackData.forEach(session => {
            session.issues.forEach(issue => {
                if (breakdown[issue.category]) {
                    breakdown[issue.category].issues++;
                }
            });
        });
        
        return breakdown;
    }
    
    /**
     * Generate actionable recommendations
     */
    generateRecommendations() {
        const recommendations = [];
        const metrics = this.calculateMetrics();
        const priorities = this.prioritizeFeedback();
        
        // Based on metrics
        if (parseFloat(metrics.taskCompletionRate) < 95) {
            recommendations.push({
                type: 'Usability',
                action: 'Simplify user flows and improve navigation clarity',
                priority: 'High'
            });
        }
        
        if (parseFloat(metrics.averageTaskTime) > 3) {
            recommendations.push({
                type: 'Performance',
                action: 'Optimize page load times and reduce steps in critical paths',
                priority: 'High'
            });
        }
        
        if (priorities.P0.length > 0) {
            recommendations.push({
                type: 'Critical Fixes',
                action: `Address ${priorities.P0.length} critical issues before launch`,
                priority: 'Blocker'
            });
        }
        
        if (parseFloat(metrics.userSatisfaction) < 4) {
            recommendations.push({
                type: 'User Experience',
                action: 'Conduct design review and implement UI improvements',
                priority: 'Medium'
            });
        }
        
        return recommendations;
    }
}

// Export for use in Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FeedbackAnalyzer;
}

// Example usage
function analyzeMockData() {
    const analyzer = new FeedbackAnalyzer();
    
    // Mock session data
    const mockSession = {
        sessionId: 'UAT-TEST001',
        timestamp: new Date().toISOString(),
        tester: 'Raj Kumar',
        role: 'Casting Director',
        steps: [
            {
                title: 'Search Initiation',
                completedActions: 4,
                totalActions: 4,
                targetTime: 30,
                actualTime: 25,
                issues: ''
            },
            {
                title: 'Filter Application',
                completedActions: 5,
                totalActions: 6,
                targetTime: 45,
                actualTime: 60,
                issues: 'Filter dropdown was slow to load on mobile'
            },
            {
                title: 'Browse Results',
                completedActions: 5,
                totalActions: 5,
                targetTime: 60,
                actualTime: 55,
                issues: ''
            },
            {
                title: 'View Profile',
                completedActions: 4,
                totalActions: 5,
                targetTime: 30,
                actualTime: 45,
                issues: 'Videos took too long to load'
            },
            {
                title: 'Create Shortlist',
                completedActions: 6,
                totalActions: 6,
                targetTime: 45,
                actualTime: 40,
                issues: ''
            }
        ],
        overallFeedback: 'The platform is quite good but needs performance improvements. Would like to see bulk actions for shortlists. The search feature should include voice input for faster searching.',
        overallRating: '4 - Good'
    };
    
    // Process feedback
    const processed = analyzer.processFeedback(mockSession);
    console.log('Processed Feedback:', processed);
    
    // Generate summary
    const summary = analyzer.generateSummary();
    console.log('Executive Summary:', JSON.stringify(summary, null, 2));
    
    return summary;
}

// Run if called directly
if (typeof window !== 'undefined') {
    window.FeedbackAnalyzer = FeedbackAnalyzer;
    window.analyzeMockData = analyzeMockData;
}