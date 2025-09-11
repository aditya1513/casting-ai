import { test, expect, describe, beforeEach, mock } from 'bun:test';
import { renderHook, act } from '@testing-library/react';
import { useAdvancedVoice } from './useAdvancedVoice';

// Mock tRPC
const mockMutate = mock(() => Promise.resolve({ success: true }));
mock.module('../lib/trpc', () => ({
  trpc: {
    voice: {
      synthesize: { mutate: mockMutate },
      transcribe: { mutate: mockMutate },
    },
  },
}));

// Mock Web Speech API
const mockSpeechRecognition = {
  start: mock(),
  stop: mock(),
  abort: mock(),
  addEventListener: mock(),
  removeEventListener: mock(),
  continuous: false,
  interimResults: false,
  lang: 'en-US',
};

const mockSpeechSynthesis = {
  speak: mock(),
  cancel: mock(),
  pause: mock(),
  resume: mock(),
  getVoices: mock(() => []),
  addEventListener: mock(),
  removeEventListener: mock(),
};

beforeEach(() => {
  global.SpeechRecognition = mock(() => mockSpeechRecognition);
  global.webkitSpeechRecognition = global.SpeechRecognition;
  global.speechSynthesis = mockSpeechSynthesis;
  mock.restore();
});

describe('useAdvancedVoice', () => {
  test('should initialize with correct default state', () => {
    const { result } = renderHook(() => useAdvancedVoice());

    expect(result.current.isListening).toBe(false);
    expect(result.current.isSpeaking).toBe(false);
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.currentProvider).toBe('webspeech');
    expect(result.current.transcript).toBe('');
    expect(result.current.confidence).toBe(0);
    expect(result.current.error).toBeNull();
  });

  test('should start listening with Web Speech API', async () => {
    const { result } = renderHook(() => useAdvancedVoice());

    await act(async () => {
      await result.current.startListening();
    });

    expect(result.current.isListening).toBe(true);
    expect(mockSpeechRecognition.start).toHaveBeenCalled();
  });

  test('should stop listening', async () => {
    const { result } = renderHook(() => useAdvancedVoice());

    // Start listening first
    await act(async () => {
      await result.current.startListening();
    });

    await act(async () => {
      result.current.stopListening();
    });

    expect(result.current.isListening).toBe(false);
    expect(mockSpeechRecognition.stop).toHaveBeenCalled();
  });

  test('should switch between providers', async () => {
    const { result } = renderHook(() => useAdvancedVoice());

    expect(result.current.currentProvider).toBe('webspeech');

    await act(async () => {
      result.current.switchProvider('whisper');
    });

    expect(result.current.currentProvider).toBe('whisper');
  });

  test('should handle speech synthesis', async () => {
    const { result } = renderHook(() => useAdvancedVoice());

    const testText = 'Hello, this is a test message for CastMatch.';

    await act(async () => {
      await result.current.speak(testText);
    });

    expect(result.current.isSpeaking).toBe(true);
    expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
  });

  test('should handle Mumbai casting specific commands', async () => {
    const onCommandRecognized = mock();
    const { result } = renderHook(() => useAdvancedVoice({
      onCommandRecognized,
    }));

    // Mock speech recognition result for casting command
    const mockEvent = {
      results: [[{
        transcript: 'find actors in Mumbai for lead role',
        confidence: 0.9,
      }]],
      resultIndex: 0,
    };

    await act(async () => {
      await result.current.startListening();
      // Simulate speech recognition result
      result.current.handleSpeechResult(mockEvent as any);
    });

    expect(result.current.transcript).toBe('find actors in Mumbai for lead role');
    expect(result.current.confidence).toBe(0.9);
    expect(onCommandRecognized).toHaveBeenCalledWith({
      command: 'find actors in Mumbai for lead role',
      intent: 'search',
      confidence: 0.9,
    });
  });

  test('should handle voice command intents', async () => {
    const onCommandRecognized = mock();
    const { result } = renderHook(() => useAdvancedVoice({
      onCommandRecognized,
    }));

    const commands = [
      { text: 'upload new script', expectedIntent: 'upload' },
      { text: 'show me analytics dashboard', expectedIntent: 'navigation' },
      { text: 'find female actors aged 25 to 30', expectedIntent: 'search' },
      { text: 'schedule audition for tomorrow', expectedIntent: 'schedule' },
      { text: 'call Priya Sharma', expectedIntent: 'communication' },
    ];

    for (const { text, expectedIntent } of commands) {
      const mockEvent = {
        results: [[{ transcript: text, confidence: 0.8 }]],
        resultIndex: 0,
      };

      await act(async () => {
        result.current.handleSpeechResult(mockEvent as any);
      });

      expect(onCommandRecognized).toHaveBeenCalledWith({
        command: text,
        intent: expectedIntent,
        confidence: 0.8,
      });
    }
  });

  test('should handle low confidence results', async () => {
    const onCommandRecognized = mock();
    const { result } = renderHook(() => useAdvancedVoice({
      onCommandRecognized,
    }));

    const mockEvent = {
      results: [[{
        transcript: 'unclear speech',
        confidence: 0.3, // Low confidence
      }]],
      resultIndex: 0,
    };

    await act(async () => {
      result.current.handleSpeechResult(mockEvent as any);
    });

    expect(result.current.transcript).toBe('unclear speech');
    expect(result.current.confidence).toBe(0.3);
    // Should not trigger command recognition for low confidence
    expect(onCommandRecognized).not.toHaveBeenCalled();
  });

  test('should handle errors gracefully', async () => {
    const { result } = renderHook(() => useAdvancedVoice());

    // Mock speech recognition error
    const mockError = new Error('Speech recognition failed');
    mockSpeechRecognition.start.mockImplementationOnce(() => {
      throw mockError;
    });

    await act(async () => {
      await result.current.startListening();
    });

    expect(result.current.error).toBe('Speech recognition failed');
    expect(result.current.isListening).toBe(false);
  });

  test('should fallback to Whisper when Web Speech fails', async () => {
    const { result } = renderHook(() => useAdvancedVoice({
      enableFallback: true,
    }));

    // Mock Web Speech API failure
    mockSpeechRecognition.start.mockImplementationOnce(() => {
      throw new Error('Web Speech not supported');
    });

    await act(async () => {
      await result.current.startListening();
    });

    expect(result.current.currentProvider).toBe('whisper');
    expect(result.current.error).toBeNull();
  });

  test('should handle multilingual input (Hindi/English)', async () => {
    const onCommandRecognized = mock();
    const { result } = renderHook(() => useAdvancedVoice({
      onCommandRecognized,
      language: 'hi-IN', // Hindi language
    }));

    const hindiCommands = [
      { text: 'नया स्क्रिप्ट अपलोड करें', expectedIntent: 'upload' },
      { text: 'मुंबई में अभिनेता खोजें', expectedIntent: 'search' },
    ];

    for (const { text, expectedIntent } of hindiCommands) {
      const mockEvent = {
        results: [[{ transcript: text, confidence: 0.85 }]],
        resultIndex: 0,
      };

      await act(async () => {
        result.current.handleSpeechResult(mockEvent as any);
      });

      expect(onCommandRecognized).toHaveBeenCalledWith({
        command: text,
        intent: expectedIntent,
        confidence: 0.85,
      });
    }
  });

  test('should manage voice command history', async () => {
    const { result } = renderHook(() => useAdvancedVoice());

    const commands = [
      'find actors in Mumbai',
      'upload script file',
      'show analytics',
    ];

    for (const command of commands) {
      const mockEvent = {
        results: [[{ transcript: command, confidence: 0.8 }]],
        resultIndex: 0,
      };

      await act(async () => {
        result.current.handleSpeechResult(mockEvent as any);
      });
    }

    expect(result.current.commandHistory).toHaveLength(3);
    expect(result.current.commandHistory[0]).toMatchObject({
      transcript: 'find actors in Mumbai',
      confidence: 0.8,
    });
  });

  test('should provide voice command suggestions', () => {
    const { result } = renderHook(() => useAdvancedVoice());

    const suggestions = result.current.getCommandSuggestions();

    expect(suggestions).toBeArray();
    expect(suggestions.length).toBeGreaterThan(0);
    
    // Should include Mumbai casting specific commands
    const suggestionTexts = suggestions.map(s => s.text);
    expect(suggestionTexts).toContain('Find actors in Mumbai');
    expect(suggestionTexts).toContain('Upload new script');
    expect(suggestionTexts).toContain('Show analytics dashboard');
  });

  test('should cleanup resources on unmount', () => {
    const { unmount } = renderHook(() => useAdvancedVoice());

    unmount();

    expect(mockSpeechRecognition.removeEventListener).toHaveBeenCalled();
    expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
  });
});