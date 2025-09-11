/**
 * Demo Routes for AI Agents Server
 * Demonstration endpoints for showcasing AI capabilities
 */

import { Router } from 'express';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/demo/complete-workflow
 * Demonstrate complete casting workflow
 */
router.get('/complete-workflow', async (req, res, next) => {
  try {
    logger.info('Executing demo complete workflow');

    // Simulate a complete casting workflow
    const workflowSteps = [
      {
        step: 'script_analysis',
        status: 'completed',
        result: {
          characters: [
            {
              name: 'Raj Sharma',
              role: 'Lead Actor',
              ageRange: '25-35',
              description: 'Charismatic lead with strong screen presence'
            },
            {
              name: 'Meera Gupta', 
              role: 'Female Lead',
              ageRange: '22-30',
              description: 'Talented actress with dance background'
            }
          ],
          scenes: 45,
          estimatedShootDays: 60
        },
        duration: '2.3s'
      },
      {
        step: 'talent_discovery',
        status: 'completed',
        result: {
          candidatesFound: 127,
          topMatches: 15,
          averageMatch: '87%'
        },
        duration: '1.8s'
      },
      {
        step: 'application_screening',
        status: 'completed',
        result: {
          applicationsScreened: 89,
          shortlisted: 23,
          rejected: 66
        },
        duration: '1.2s'
      },
      {
        step: 'scheduling_optimization',
        status: 'completed',
        result: {
          auditionsScheduled: 23,
          daysRequired: 3,
          efficiency: '94%'
        },
        duration: '0.9s'
      },
      {
        step: 'communication_generation',
        status: 'completed',
        result: {
          invitationsSent: 23,
          confirmationsReceived: 21,
          responseRate: '91%'
        },
        duration: '0.7s'
      }
    ];

    const summary = {
      totalSteps: workflowSteps.length,
      completedSteps: workflowSteps.filter(s => s.status === 'completed').length,
      totalDuration: '7.0s',
      efficiency: '96%',
      outcome: 'Successful casting workflow completed',
    };

    res.json({
      success: true,
      data: {
        workflow: workflowSteps,
        summary,
        projectDetails: {
          title: 'Mumbai Dreams - Web Series',
          genre: 'Drama',
          platform: 'Netflix India',
          budget: '₹5 crore',
          shootingLocation: 'Mumbai',
          language: 'Hindi'
        },
        aiInsights: [
          'Strong talent pool available for lead roles',
          'Recommend focusing on actors with dance background for musical sequences',
          'Budget allocation optimal for talent acquisition',
          'Schedule allows for adequate rehearsal time'
        ],
        nextSteps: [
          'Conduct shortlisted auditions',
          'Finalize cast based on chemistry reads',
          'Negotiate contracts with selected talent',
          'Begin pre-production planning'
        ],
        metrics: {
          timeToCompletion: '7.0 seconds',
          costEfficiency: '94%',
          qualityScore: '9.2/10',
          stakeholderSatisfaction: '96%'
        },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/demo/sample-analysis
 * Show sample script analysis results
 */
router.get('/sample-analysis', async (req, res) => {
  res.json({
    success: true,
    data: {
      sample: 'script_analysis',
      characters: [
        {
          name: 'Arjun Malhotra',
          role: 'Protagonist',
          ageRange: '28-35',
          description: 'Ambitious tech entrepreneur from Mumbai',
          screenTime: '45%',
          importance: 'Primary',
          requirements: {
            languages: ['Hindi', 'English'],
            skills: ['Business presentation', 'Emotional range'],
            physicalAttributes: 'Athletic build, confident demeanor'
          }
        }
      ],
      insights: [
        'Script focuses on contemporary Mumbai startup culture',
        'Requires bilingual actors comfortable with tech terminology',
        'Strong emotional arc requires experienced performers'
      ]
    }
  });
});

export { router as demoRouter };