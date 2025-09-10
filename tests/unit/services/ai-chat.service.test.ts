/**
 * AI Chat Service Unit Tests
 * Comprehensive test coverage for AI chat service
 */

import { AIChatService } from '../../../src/services/ai-chat.service';
import axios from 'axios';
import { CacheManager } from '../../../src/config/redis';
import { logger } from '../../../src/utils/logger';
import { AppError } from '../../../src/utils/errors';

// Mock dependencies
jest.mock('axios');
jest.mock('../../../src/config/redis');
jest.mock('../../../src/utils/logger');

describe('AIChatService', () => {
  let aiChatService: AIChatService;
  let mockCacheManager: jest.Mocked<CacheManager>;
  const mockAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock cache manager
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
      flush: jest.fn(),
      hget: jest.fn(),
      hset: jest.fn(),
      hdel: jest.fn(),
    } as any;
    
    (CacheManager as jest.MockedClass<typeof CacheManager>).mockImplementation(
      () => mockCacheManager
    );
    
    aiChatService = new AIChatService();
  });

  describe('sendMessage', () => {
    const mockMessage = {
      userId: 'user_123',
      conversationId: 'conv_123',
      message: 'Find me actors for a romantic lead role',
      context: {
        project: 'New Bollywood Movie',
        role: 'Romantic Lead',
      },
    };

    it('should successfully send message and receive AI response', async () => {
      const mockAIResponse = {
        data: {
          response: 'Based on your requirements for a romantic lead role, I recommend...',
          suggestions: [
            { actorId: 'actor_1', name: 'Actor One', matchScore: 0.95 },
            { actorId: 'actor_2', name: 'Actor Two', matchScore: 0.92 },
          ],
          metadata: {
            processingTime: 1250,
            model: 'claude-3',
          },
        },
      };

      mockAxios.post.mockResolvedValue(mockAIResponse);
      mockCacheManager.get.mockResolvedValue(null); // No cached response

      const result = await aiChatService.sendMessage(mockMessage);

      expect(result).toHaveProperty('response');
      expect(result.response).toBe(mockAIResponse.data.response);
      expect(result).toHaveProperty('suggestions');
      expect(result.suggestions).toHaveLength(2);
      
      // Verify AI service was called
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/ai/chat'),
        expect.objectContaining({
          message: mockMessage.message,
          userId: mockMessage.userId,
          conversationId: mockMessage.conversationId,
        }),
        expect.any(Object)
      );
      
      // Verify response was cached
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should return cached response when available', async () => {
      const cachedResponse = {
        response: 'Cached response for romantic lead',
        suggestions: [],
        cached: true,
      };

      mockCacheManager.get.mockResolvedValue(JSON.stringify(cachedResponse));

      const result = await aiChatService.sendMessage(mockMessage);

      expect(result).toEqual(cachedResponse);
      expect(mockAxios.post).not.toHaveBeenCalled();
    });

    it('should handle AI service errors gracefully', async () => {
      mockAxios.post.mockRejectedValue(new Error('AI Service unavailable'));
      mockCacheManager.get.mockResolvedValue(null);

      await expect(aiChatService.sendMessage(mockMessage)).rejects.toThrow(
        'Failed to process message'
      );
      
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('AI chat error'),
        expect.any(Object)
      );
    });

    it('should validate message length', async () => {
      const longMessage = {
        ...mockMessage,
        message: 'a'.repeat(10001), // Exceeds max length
      };

      await expect(aiChatService.sendMessage(longMessage)).rejects.toThrow(
        'Message exceeds maximum length'
      );
    });

    it('should handle rate limiting', async () => {
      mockCacheManager.get.mockResolvedValue('10'); // User has sent 10 messages
      
      const rateLimitedMessage = {
        ...mockMessage,
        userId: 'rate_limited_user',
      };

      await expect(aiChatService.sendMessage(rateLimitedMessage)).rejects.toThrow(
        'Rate limit exceeded'
      );
    });
  });

  describe('getConversationHistory', () => {
    it('should retrieve conversation history', async () => {
      const conversationId = 'conv_123';
      const mockHistory = {
        data: {
          messages: [
            {
              id: 'msg_1',
              role: 'user',
              content: 'Find actors for action role',
              timestamp: new Date().toISOString(),
            },
            {
              id: 'msg_2',
              role: 'assistant',
              content: 'Here are some recommendations...',
              timestamp: new Date().toISOString(),
            },
          ],
          metadata: {
            totalMessages: 2,
            startDate: new Date().toISOString(),
          },
        },
      };

      mockAxios.get.mockResolvedValue(mockHistory);

      const result = await aiChatService.getConversationHistory(conversationId);

      expect(result).toHaveProperty('messages');
      expect(result.messages).toHaveLength(2);
      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining(`/conversations/${conversationId}`),
        expect.any(Object)
      );
    });

    it('should handle empty conversation history', async () => {
      const conversationId = 'new_conv';
      mockAxios.get.mockResolvedValue({ data: { messages: [] } });

      const result = await aiChatService.getConversationHistory(conversationId);

      expect(result.messages).toHaveLength(0);
    });

    it('should cache conversation history', async () => {
      const conversationId = 'conv_123';
      const mockHistory = {
        data: {
          messages: [
            { id: 'msg_1', content: 'Test message' },
          ],
        },
      };

      mockAxios.get.mockResolvedValue(mockHistory);
      mockCacheManager.get.mockResolvedValue(null);

      await aiChatService.getConversationHistory(conversationId);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining(conversationId),
        expect.any(String),
        expect.any(Number)
      );
    });
  });

  describe('analyzeScript', () => {
    it('should analyze script and extract character requirements', async () => {
      const scriptContent = 'FADE IN: A romantic scene...';
      const mockAnalysis = {
        data: {
          characters: [
            {
              name: 'Lead Actor',
              description: '25-35 years, romantic hero',
              traits: ['charming', 'confident'],
            },
            {
              name: 'Lead Actress',
              description: '22-30 years, strong personality',
              traits: ['independent', 'witty'],
            },
          ],
          genres: ['Romance', 'Drama'],
          summary: 'A romantic drama about...',
        },
      };

      mockAxios.post.mockResolvedValue(mockAnalysis);

      const result = await aiChatService.analyzeScript(scriptContent);

      expect(result).toHaveProperty('characters');
      expect(result.characters).toHaveLength(2);
      expect(result).toHaveProperty('genres');
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/ai/analyze-script'),
        expect.objectContaining({ script: scriptContent }),
        expect.any(Object)
      );
    });

    it('should handle script analysis errors', async () => {
      const scriptContent = 'Invalid script';
      mockAxios.post.mockRejectedValue(new Error('Analysis failed'));

      await expect(aiChatService.analyzeScript(scriptContent)).rejects.toThrow(
        'Script analysis failed'
      );
    });

    it('should validate script length', async () => {
      const tooLongScript = 'a'.repeat(1000001); // Exceeds max length

      await expect(aiChatService.analyzeScript(tooLongScript)).rejects.toThrow(
        'Script exceeds maximum length'
      );
    });
  });

  describe('generateCastingRecommendations', () => {
    const mockRequirements = {
      projectId: 'proj_123',
      roles: [
        {
          title: 'Lead Actor',
          ageRange: { min: 25, max: 35 },
          gender: 'male',
          characteristics: ['tall', 'athletic'],
        },
      ],
      budget: 1000000,
      timeline: '3 months',
    };

    it('should generate casting recommendations based on requirements', async () => {
      const mockRecommendations = {
        data: {
          recommendations: [
            {
              roleTitle: 'Lead Actor',
              candidates: [
                {
                  id: 'actor_1',
                  name: 'John Doe',
                  matchScore: 0.95,
                  availability: true,
                  rate: 50000,
                },
                {
                  id: 'actor_2',
                  name: 'Mike Smith',
                  matchScore: 0.90,
                  availability: true,
                  rate: 45000,
                },
              ],
            },
          ],
          totalCost: 95000,
          feasibility: 'high',
        },
      };

      mockAxios.post.mockResolvedValue(mockRecommendations);

      const result = await aiChatService.generateCastingRecommendations(mockRequirements);

      expect(result).toHaveProperty('recommendations');
      expect(result.recommendations[0].candidates).toHaveLength(2);
      expect(result).toHaveProperty('totalCost');
      expect(result.feasibility).toBe('high');
    });

    it('should handle budget constraints in recommendations', async () => {
      const lowBudgetRequirements = {
        ...mockRequirements,
        budget: 10000,
      };

      const mockLimitedRecommendations = {
        data: {
          recommendations: [
            {
              roleTitle: 'Lead Actor',
              candidates: [
                {
                  id: 'actor_3',
                  name: 'New Actor',
                  matchScore: 0.75,
                  availability: true,
                  rate: 5000,
                },
              ],
            },
          ],
          totalCost: 5000,
          feasibility: 'moderate',
          budgetWarning: 'Limited options due to budget constraints',
        },
      };

      mockAxios.post.mockResolvedValue(mockLimitedRecommendations);

      const result = await aiChatService.generateCastingRecommendations(lowBudgetRequirements);

      expect(result.recommendations[0].candidates).toHaveLength(1);
      expect(result).toHaveProperty('budgetWarning');
    });

    it('should cache recommendations for similar requirements', async () => {
      const mockRecommendations = {
        data: { recommendations: [] },
      };

      mockAxios.post.mockResolvedValue(mockRecommendations);
      mockCacheManager.get.mockResolvedValue(null);

      await aiChatService.generateCastingRecommendations(mockRequirements);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        300 // 5 minutes cache
      );
    });
  });

  describe('searchTalent', () => {
    const searchQuery = {
      query: 'experienced action hero',
      filters: {
        ageRange: { min: 30, max: 45 },
        location: 'Mumbai',
        languages: ['Hindi', 'English'],
      },
      limit: 10,
    };

    it('should search talent based on natural language query', async () => {
      const mockSearchResults = {
        data: {
          results: [
            {
              id: 'actor_1',
              name: 'Action Star',
              matchScore: 0.92,
              experience: '10 years',
              portfolio: ['Movie1', 'Movie2'],
            },
          ],
          totalResults: 1,
          searchId: 'search_123',
        },
      };

      mockAxios.post.mockResolvedValue(mockSearchResults);

      const result = await aiChatService.searchTalent(searchQuery);

      expect(result).toHaveProperty('results');
      expect(result.results).toHaveLength(1);
      expect(result.results[0].matchScore).toBeGreaterThan(0.9);
    });

    it('should apply filters correctly in talent search', async () => {
      mockAxios.post.mockResolvedValue({
        data: { results: [], totalResults: 0 },
      });

      await aiChatService.searchTalent(searchQuery);

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          query: searchQuery.query,
          filters: expect.objectContaining({
            ageRange: searchQuery.filters.ageRange,
            location: searchQuery.filters.location,
          }),
        }),
        expect.any(Object)
      );
    });

    it('should handle empty search results', async () => {
      mockAxios.post.mockResolvedValue({
        data: {
          results: [],
          totalResults: 0,
          message: 'No matching talent found',
        },
      });

      const result = await aiChatService.searchTalent(searchQuery);

      expect(result.results).toHaveLength(0);
      expect(result).toHaveProperty('message');
    });
  });

  describe('getAIInsights', () => {
    it('should provide AI insights for casting decisions', async () => {
      const castingData = {
        projectId: 'proj_123',
        selectedActors: ['actor_1', 'actor_2'],
        roles: ['Lead', 'Supporting'],
      };

      const mockInsights = {
        data: {
          chemistry: {
            score: 0.88,
            analysis: 'Good on-screen chemistry predicted',
          },
          budgetOptimization: {
            currentCost: 100000,
            suggestedOptimization: 'Consider negotiating package deals',
            potentialSavings: 15000,
          },
          riskAssessment: {
            level: 'low',
            factors: ['All actors available', 'Good track record'],
          },
          recommendations: [
            'Schedule chemistry reading',
            'Confirm availability for entire schedule',
          ],
        },
      };

      mockAxios.post.mockResolvedValue(mockInsights);

      const result = await aiChatService.getAIInsights(castingData);

      expect(result).toHaveProperty('chemistry');
      expect(result.chemistry.score).toBeGreaterThan(0.8);
      expect(result).toHaveProperty('budgetOptimization');
      expect(result).toHaveProperty('riskAssessment');
      expect(result.recommendations).toHaveLength(2);
    });

    it('should handle insights generation errors', async () => {
      const castingData = {
        projectId: 'proj_123',
        selectedActors: [],
      };

      mockAxios.post.mockRejectedValue(new Error('Insights generation failed'));

      await expect(aiChatService.getAIInsights(castingData)).rejects.toThrow(
        'Failed to generate insights'
      );
    });
  });

  describe('Memory Management', () => {
    it('should store conversation context in memory', async () => {
      const context = {
        userId: 'user_123',
        conversationId: 'conv_123',
        preferences: {
          genre: 'Action',
          budget: 'Medium',
        },
      };

      await aiChatService.storeContext(context);

      expect(mockCacheManager.hset).toHaveBeenCalledWith(
        expect.stringContaining('context'),
        context.conversationId,
        expect.any(String)
      );
    });

    it('should retrieve conversation context from memory', async () => {
      const conversationId = 'conv_123';
      const storedContext = {
        userId: 'user_123',
        preferences: { genre: 'Drama' },
      };

      mockCacheManager.hget.mockResolvedValue(JSON.stringify(storedContext));

      const result = await aiChatService.getContext(conversationId);

      expect(result).toEqual(storedContext);
    });

    it('should clear conversation context when needed', async () => {
      const conversationId = 'conv_123';

      await aiChatService.clearContext(conversationId);

      expect(mockCacheManager.hdel).toHaveBeenCalledWith(
        expect.any(String),
        conversationId
      );
    });
  });

  describe('Performance Optimization', () => {
    it('should batch process multiple messages efficiently', async () => {
      const messages = [
        { id: '1', content: 'Message 1' },
        { id: '2', content: 'Message 2' },
        { id: '3', content: 'Message 3' },
      ];

      const mockBatchResponse = {
        data: {
          responses: messages.map(m => ({
            id: m.id,
            response: `Response to ${m.content}`,
          })),
        },
      };

      mockAxios.post.mockResolvedValue(mockBatchResponse);

      const result = await aiChatService.batchProcess(messages);

      expect(result.responses).toHaveLength(3);
      expect(mockAxios.post).toHaveBeenCalledTimes(1); // Single batch call
    });

    it('should implement request throttling', async () => {
      const promises = [];
      
      // Simulate rapid requests
      for (let i = 0; i < 5; i++) {
        promises.push(
          aiChatService.sendMessage({
            userId: 'user_123',
            conversationId: `conv_${i}`,
            message: `Message ${i}`,
          })
        );
      }

      mockAxios.post.mockResolvedValue({ data: { response: 'OK' } });
      mockCacheManager.get.mockResolvedValue(null);

      // Should throttle requests
      await expect(Promise.all(promises)).rejects.toThrow();
    });
  });

  describe('Error Recovery', () => {
    it('should retry failed requests with exponential backoff', async () => {
      let attempts = 0;
      mockAxios.post.mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({ data: { response: 'Success' } });
      });

      const result = await aiChatService.sendMessageWithRetry({
        userId: 'user_123',
        message: 'Test message',
      });

      expect(result.response).toBe('Success');
      expect(mockAxios.post).toHaveBeenCalledTimes(3);
    });

    it('should fallback to simpler model on failure', async () => {
      mockAxios.post
        .mockRejectedValueOnce(new Error('Primary model failed'))
        .mockResolvedValueOnce({
          data: { response: 'Fallback response', model: 'simple' },
        });

      const result = await aiChatService.sendMessageWithFallback({
        userId: 'user_123',
        message: 'Test message',
      });

      expect(result.response).toBe('Fallback response');
      expect(result.model).toBe('simple');
    });
  });
});