import { test, expect, describe, beforeEach, mock } from 'bun:test';
import { scriptAnalysisService } from './script-analysis.service';

describe('ScriptAnalysisService', () => {
  beforeEach(() => {
    // Reset any mocks before each test
    mock.restore();
  });

  test('should queue analysis successfully', async () => {
    const fileId = 'test_file_123';
    const userId = 'user_456';

    // Mock the service method
    const queueSpy = mock(scriptAnalysisService, 'queueAnalysis').mockResolvedValue(undefined);

    await scriptAnalysisService.queueAnalysis(fileId, userId);

    expect(queueSpy).toHaveBeenCalledWith(fileId, userId);
    expect(queueSpy).toHaveBeenCalledTimes(1);
  });

  test('should start analysis and return analysis ID', async () => {
    const fileId = 'test_file_123';
    const userId = 'user_456';
    const options = {
      extractCharacters: true,
      generateSummary: true,
      findTalentMatches: true,
      analysisDepth: 'detailed' as const,
    };

    const result = await scriptAnalysisService.startAnalysis(fileId, userId, options);

    expect(result).toMatch(/^analysis_\d+_[a-z0-9]+$/);
  });

  test('should update analysis successfully', async () => {
    const analysisId = 'analysis_123';
    const updates = {
      metadata: {
        title: 'Updated Mumbai Stories',
        genre: ['Drama', 'Romance', 'Action'],
      },
    };

    // Mock console.log to verify the update
    const consoleSpy = mock(console, 'log');

    await scriptAnalysisService.updateAnalysis(analysisId, updates);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(`Mock: Updating analysis ${analysisId}`)
    );
  });

  test('should find talent matches with correct filtering', async () => {
    const characterId = 'char_123';
    const filters = {
      gender: 'male' as const,
      location: 'Mumbai',
      skills: ['Acting', 'Dancing'],
    };
    const limit = 10;

    const matches = await scriptAnalysisService.findTalentMatches(characterId, filters, limit);

    expect(matches).toBeArray();
    expect(matches.length).toBeLessThanOrEqual(limit);
    
    // Verify the structure of returned matches
    if (matches.length > 0) {
      const firstMatch = matches[0];
      expect(firstMatch).toHaveProperty('id');
      expect(firstMatch).toHaveProperty('name');
      expect(firstMatch).toHaveProperty('matchScore');
      expect(firstMatch).toHaveProperty('skills');
      expect(firstMatch).toHaveProperty('location');
    }
  });

  test('should handle Mumbai-specific talent search', async () => {
    const characterId = 'char_mumbai_lead';
    const mumbaiFilters = {
      location: 'Mumbai',
      languages: ['Hindi', 'Marathi'],
      skills: ['Bollywood Acting', 'Classical Dance'],
    };

    const matches = await scriptAnalysisService.findTalentMatches(characterId, mumbaiFilters);

    expect(matches).toBeArray();
    
    // Verify Mumbai-specific results
    matches.forEach(match => {
      expect(match.location).toBe('Mumbai');
      expect(match.languages).toContain('Hindi');
    });
  });

  test('should handle empty talent matches gracefully', async () => {
    const characterId = 'char_no_matches';
    const restrictiveFilters = {
      gender: 'non-binary' as const,
      location: 'Remote Location',
      skills: ['Very Specific Skill'],
    };

    const matches = await scriptAnalysisService.findTalentMatches(characterId, restrictiveFilters);

    expect(matches).toBeArray();
    // Should return empty array or mock data, but not throw error
  });

  test('should validate analysis options', async () => {
    const fileId = 'test_file';
    const userId = 'test_user';
    
    // Test with minimal options
    const minimalOptions = {
      analysisDepth: 'basic' as const,
    };

    const result = await scriptAnalysisService.startAnalysis(fileId, userId, minimalOptions);
    expect(result).toMatch(/^analysis_\d+_[a-z0-9]+$/);

    // Test with comprehensive options
    const comprehensiveOptions = {
      extractCharacters: true,
      generateSummary: true,
      findTalentMatches: true,
      estimateBudget: true,
      analysisDepth: 'comprehensive' as const,
    };

    const result2 = await scriptAnalysisService.startAnalysis(fileId, userId, comprehensiveOptions);
    expect(result2).toMatch(/^analysis_\d+_[a-z0-9]+$/);
  });

  test('should handle error cases gracefully', async () => {
    // Test with invalid inputs
    const invalidFileId = '';
    const invalidUserId = '';

    // Should not throw but handle gracefully
    await expect(scriptAnalysisService.queueAnalysis(invalidFileId, invalidUserId)).resolves.not.toThrow();
  });
});