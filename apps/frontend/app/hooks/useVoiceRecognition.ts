'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface VoiceRecognitionConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

interface VoiceRecognitionError {
  error: string;
  message: string;
}

export const useVoiceRecognition = (config: VoiceRecognitionConfig = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<VoiceRecognitionError | null>(null);
  const [volume, setVolume] = useState(0);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const volumeAnalyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();

  const {
    language = 'en-IN', // Default to Indian English
    continuous = true,
    interimResults = true,
    maxAlternatives = 1,
  } = config;

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = 
      window.SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
      
      const recognition = new SpeechRecognition();
      recognition.lang = language;
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.maxAlternatives = maxAlternatives;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        console.log('🎤 Voice recognition started');
      };

      recognition.onend = () => {
        setIsListening(false);
        console.log('🎤 Voice recognition ended');
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;

          if (result.isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
          setInterimTranscript('');
        } else {
          setInterimTranscript(interimTranscript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('🎤 Voice recognition error:', event.error);
        setError({
          error: event.error,
          message: getErrorMessage(event.error),
        });
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
      console.warn('🎤 Speech recognition not supported in this browser');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [language, continuous, interimResults, maxAlternatives]);

  // Volume analysis for visual feedback
  const initVolumeAnalysis = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);
      volumeAnalyserRef.current = analyser;

      const updateVolume = () => {
        if (!volumeAnalyserRef.current) return;

        const dataArray = new Uint8Array(volumeAnalyserRef.current.frequencyBinCount);
        volumeAnalyserRef.current.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
        setVolume(Math.min(100, (average / 255) * 100));

        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (err) {
      console.error('🎤 Error initializing volume analysis:', err);
    }
  }, []);

  const startListening = useCallback(async () => {
    if (!isSupported || !recognitionRef.current) {
      setError({
        error: 'not-supported',
        message: 'Speech recognition is not supported in this browser',
      });
      return;
    }

    try {
      setTranscript('');
      setInterimTranscript('');
      setError(null);
      
      await initVolumeAnalysis();
      recognitionRef.current.start();
    } catch (err: any) {
      console.error('🎤 Error starting recognition:', err);
      setError({
        error: 'start-error',
        message: err.message || 'Failed to start voice recognition',
      });
    }
  }, [isSupported, initVolumeAnalysis]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    setVolume(0);
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'no-speech':
        return 'No speech detected. Please try speaking clearly.';
      case 'audio-capture':
        return 'Audio capture failed. Please check your microphone.';
      case 'not-allowed':
        return 'Microphone permission denied. Please enable microphone access.';
      case 'network':
        return 'Network error. Please check your connection.';
      case 'language-not-supported':
        return 'Selected language is not supported.';
      case 'service-not-allowed':
        return 'Speech recognition service is not allowed.';
      default:
        return 'An error occurred with voice recognition.';
    }
  };

  return {
    // State
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    volume,

    // Actions
    startListening,
    stopListening,
    resetTranscript,

    // Computed
    hasTranscript: transcript.length > 0 || interimTranscript.length > 0,
    fullTranscript: transcript + interimTranscript,
  };
};

// Command recognition hook for specific voice commands
export const useVoiceCommands = () => {
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [isProcessingCommand, setIsProcessingCommand] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);

  const commands = {
    // Chat and messaging commands
    'send message': () => ({ action: 'send_message', priority: 'high' }),
    'clear chat': () => ({ action: 'clear_chat', priority: 'medium' }),
    'new conversation': () => ({ action: 'new_conversation', priority: 'medium' }),
    'clear input': () => ({ action: 'clear_input', priority: 'medium' }),
    'repeat last message': () => ({ action: 'repeat_message', priority: 'low' }),
    
    // Navigation commands
    'go to dashboard': () => ({ action: 'navigate', target: '/dashboard', priority: 'high' }),
    'show dashboard': () => ({ action: 'navigate', target: '/dashboard', priority: 'high' }),
    'show talents': () => ({ action: 'navigate', target: '/talents', priority: 'high' }),
    'browse talents': () => ({ action: 'navigate', target: '/talents', priority: 'high' }),
    'open projects': () => ({ action: 'navigate', target: '/projects', priority: 'high' }),
    'my projects': () => ({ action: 'navigate', target: '/projects', priority: 'high' }),
    'go to profile': () => ({ action: 'navigate', target: '/profile', priority: 'medium' }),
    'show auditions': () => ({ action: 'navigate', target: '/auditions', priority: 'high' }),
    'go back': () => ({ action: 'navigate_back', priority: 'medium' }),
    'go home': () => ({ action: 'navigate', target: '/', priority: 'medium' }),
    
    // Search commands - Mumbai casting specific
    'search for': (text: string) => ({ action: 'search', query: text, priority: 'high' }),
    'find actor': (text: string) => ({ action: 'talent_search', query: text, type: 'actor', priority: 'high' }),
    'find actress': (text: string) => ({ action: 'talent_search', query: text, type: 'actress', priority: 'high' }),
    'find dancer': (text: string) => ({ action: 'talent_search', query: text, type: 'dancer', priority: 'high' }),
    'find singer': (text: string) => ({ action: 'talent_search', query: text, type: 'singer', priority: 'high' }),
    'find model': (text: string) => ({ action: 'talent_search', query: text, type: 'model', priority: 'high' }),
    'search bollywood': (text: string) => ({ action: 'talent_search', query: text, genre: 'bollywood', priority: 'high' }),
    'search television': (text: string) => ({ action: 'talent_search', query: text, genre: 'television', priority: 'high' }),
    'search web series': (text: string) => ({ action: 'talent_search', query: text, genre: 'web-series', priority: 'high' }),
    
    // Casting-specific commands
    'create new project': () => ({ action: 'create_project', priority: 'high' }),
    'schedule audition': (text: string) => ({ action: 'schedule_audition', details: text, priority: 'high' }),
    'add to shortlist': () => ({ action: 'add_shortlist', priority: 'medium' }),
    'remove from shortlist': () => ({ action: 'remove_shortlist', priority: 'medium' }),
    'mark as favorite': () => ({ action: 'favorite', priority: 'medium' }),
    'contact talent': () => ({ action: 'contact_talent', priority: 'high' }),
    'view portfolio': () => ({ action: 'view_portfolio', priority: 'medium' }),
    'check availability': () => ({ action: 'check_availability', priority: 'high' }),
    
    // Voice and playback commands
    'stop listening': () => ({ action: 'stop_voice', priority: 'high' }),
    'start listening': () => ({ action: 'start_voice', priority: 'high' }),
    'mute voice': () => ({ action: 'mute_voice', priority: 'medium' }),
    'unmute voice': () => ({ action: 'unmute_voice', priority: 'medium' }),
    'switch to whisper': () => ({ action: 'switch_provider', provider: 'whisper', priority: 'low' }),
    'switch to web speech': () => ({ action: 'switch_provider', provider: 'web-speech', priority: 'low' }),
    'read response': () => ({ action: 'read_response', priority: 'medium' }),
    
    // UI commands
    'toggle dark mode': () => ({ action: 'toggle_theme', priority: 'low' }),
    'toggle light mode': () => ({ action: 'toggle_theme', priority: 'low' }),
    'increase font size': () => ({ action: 'font_size', direction: 'increase', priority: 'low' }),
    'decrease font size': () => ({ action: 'font_size', direction: 'decrease', priority: 'low' }),
    'scroll up': () => ({ action: 'scroll', direction: 'up', priority: 'medium' }),
    'scroll down': () => ({ action: 'scroll', direction: 'down', priority: 'medium' }),
    'go to top': () => ({ action: 'scroll', direction: 'top', priority: 'medium' }),
    'go to bottom': () => ({ action: 'scroll', direction: 'bottom', priority: 'medium' }),
    
    // Filter commands for talent search
    'filter by age': (text: string) => ({ action: 'filter', type: 'age', value: text, priority: 'medium' }),
    'filter by location': (text: string) => ({ action: 'filter', type: 'location', value: text, priority: 'medium' }),
    'filter by experience': (text: string) => ({ action: 'filter', type: 'experience', value: text, priority: 'medium' }),
    'filter by language': (text: string) => ({ action: 'filter', type: 'language', value: text, priority: 'medium' }),
    'clear filters': () => ({ action: 'clear_filters', priority: 'medium' }),
    'show filters': () => ({ action: 'show_filters', priority: 'low' }),
    
    // Help commands
    'help': () => ({ action: 'show_help', priority: 'low' }),
    'show commands': () => ({ action: 'show_commands', priority: 'low' }),
    'what can you do': () => ({ action: 'show_capabilities', priority: 'low' }),
    'voice tutorial': () => ({ action: 'voice_tutorial', priority: 'low' }),
  };

  const processCommand = useCallback((transcript: string) => {
    setIsProcessingCommand(true);
    
    const lowerTranscript = transcript.toLowerCase().trim();
    
    // Add to command history
    setCommandHistory(prev => [...prev.slice(-9), lowerTranscript]);
    
    try {
      // Check for exact matches first (highest priority)
      for (const [command, handler] of Object.entries(commands)) {
        if (lowerTranscript === command) {
          const result = handler(transcript);
          setLastCommand(command);
          setIsProcessingCommand(false);
          console.log(`🎤 Executed command: "${command}"`, result);
          return result;
        }
      }

      // Check for partial matches with parameters
      for (const [command, handler] of Object.entries(commands)) {
        if (lowerTranscript.startsWith(command + ' ')) {
          const parameter = lowerTranscript.substring(command.length).trim();
          if (parameter.length > 0) {
            const result = handler(parameter);
            setLastCommand(command);
            setIsProcessingCommand(false);
            console.log(`🎤 Executed command: "${command}" with parameter: "${parameter}"`, result);
            return result;
          }
        }
      }

      // Check for flexible matching (fuzzy matching for common commands)
      const flexibleMatches = [
        { patterns: ['send', 'submit', 'post'], command: 'send message' },
        { patterns: ['clear', 'reset', 'delete'], command: 'clear chat' },
        { patterns: ['new', 'start', 'create'], command: 'new conversation' },
        { patterns: ['dashboard', 'home', 'main'], command: 'go to dashboard' },
        { patterns: ['talents', 'actors', 'artists'], command: 'show talents' },
        { patterns: ['projects', 'work', 'jobs'], command: 'open projects' },
        { patterns: ['auditions', 'casting', 'tryouts'], command: 'show auditions' },
        { patterns: ['back', 'previous', 'return'], command: 'go back' },
        { patterns: ['help', 'assist', 'support'], command: 'help' },
      ];

      for (const { patterns, command } of flexibleMatches) {
        if (patterns.some(pattern => lowerTranscript.includes(pattern))) {
          const handler = commands[command as keyof typeof commands];
          if (handler) {
            const result = handler('');
            setLastCommand(command);
            setIsProcessingCommand(false);
            console.log(`🎤 Executed flexible command: "${command}" from pattern match`);
            return result;
          }
        }
      }

      // Check for casting-specific terms and context
      if (lowerTranscript.includes('find') || lowerTranscript.includes('search')) {
        // Extract entity type and search term
        const actorTerms = ['actor', 'actress', 'performer', 'artist'];
        const dancerTerms = ['dancer', 'choreographer', 'background dancer'];
        const singerTerms = ['singer', 'vocalist', 'playback singer'];
        const modelTerms = ['model', 'fashion model', 'commercial model'];
        
        let entityType = 'actor'; // default
        let searchTerm = '';
        
        if (actorTerms.some(term => lowerTranscript.includes(term))) {
          entityType = 'actor';
        } else if (dancerTerms.some(term => lowerTranscript.includes(term))) {
          entityType = 'dancer';
        } else if (singerTerms.some(term => lowerTranscript.includes(term))) {
          entityType = 'singer';
        } else if (modelTerms.some(term => lowerTranscript.includes(term))) {
          entityType = 'model';
        }
        
        // Extract search term (everything after "find" or "search")
        const findIndex = lowerTranscript.indexOf('find');
        const searchIndex = lowerTranscript.indexOf('search');
        const startIndex = Math.max(findIndex, searchIndex);
        
        if (startIndex !== -1) {
          searchTerm = lowerTranscript.substring(startIndex + (findIndex > searchIndex ? 4 : 6)).trim();
          // Remove entity type from search term
          const allTerms = [...actorTerms, ...dancerTerms, ...singerTerms, ...modelTerms];
          for (const term of allTerms) {
            searchTerm = searchTerm.replace(term, '').trim();
          }
        }
        
        const result = {
          action: 'talent_search',
          query: searchTerm,
          type: entityType,
          priority: 'high',
        };
        
        setLastCommand(`find ${entityType}`);
        setIsProcessingCommand(false);
        console.log(`🎤 Executed intelligent search: "${entityType}" with query: "${searchTerm}"`);
        return result;
      }

      // No command matched
      setIsProcessingCommand(false);
      console.log(`🎤 No command matched for: "${lowerTranscript}"`);
      return null;

    } catch (error) {
      console.error('🎤 Error processing voice command:', error);
      setIsProcessingCommand(false);
      return null;
    }
  }, []);

  const clearLastCommand = useCallback(() => {
    setLastCommand(null);
  }, []);

  const getCommandSuggestions = useCallback((input: string) => {
    const lowerInput = input.toLowerCase();
    return Object.keys(commands)
      .filter(cmd => cmd.includes(lowerInput))
      .slice(0, 5)
      .sort((a, b) => {
        // Prioritize commands that start with the input
        const aStarts = a.startsWith(lowerInput);
        const bStarts = b.startsWith(lowerInput);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.length - b.length;
      });
  }, []);

  const getCommandsByCategory = useCallback(() => {
    const categories = {
      'Chat & Messaging': Object.keys(commands).filter(cmd => 
        ['send', 'clear', 'new', 'repeat'].some(word => cmd.includes(word))
      ),
      'Navigation': Object.keys(commands).filter(cmd => 
        ['go', 'show', 'open', 'browse'].some(word => cmd.includes(word))
      ),
      'Search & Discovery': Object.keys(commands).filter(cmd => 
        ['search', 'find', 'filter'].some(word => cmd.includes(word))
      ),
      'Casting Actions': Object.keys(commands).filter(cmd => 
        ['schedule', 'shortlist', 'contact', 'audition', 'create'].some(word => cmd.includes(word))
      ),
      'Voice Control': Object.keys(commands).filter(cmd => 
        ['listening', 'voice', 'mute', 'switch', 'read'].some(word => cmd.includes(word))
      ),
      'Interface': Object.keys(commands).filter(cmd => 
        ['toggle', 'scroll', 'font', 'theme'].some(word => cmd.includes(word))
      ),
      'Help & Support': Object.keys(commands).filter(cmd => 
        ['help', 'tutorial', 'commands', 'what'].some(word => cmd.includes(word))
      ),
    };
    return categories;
  }, []);

  const isCommandValid = useCallback((command: string): boolean => {
    const lowerCommand = command.toLowerCase().trim();
    return Object.keys(commands).some(cmd => 
      lowerCommand === cmd || lowerCommand.startsWith(cmd + ' ')
    );
  }, []);

  const getRecentCommands = useCallback(() => {
    return commandHistory.slice(-5).reverse();
  }, [commandHistory]);

  const clearCommandHistory = useCallback(() => {
    setCommandHistory([]);
  }, []);

  return {
    // Core functionality
    processCommand,
    lastCommand,
    isProcessingCommand,
    clearLastCommand,
    
    // Command discovery
    availableCommands: Object.keys(commands),
    getCommandSuggestions,
    getCommandsByCategory,
    isCommandValid,
    
    // History management
    commandHistory,
    getRecentCommands,
    clearCommandHistory,
    
    // Metadata
    totalCommands: Object.keys(commands).length,
    commandCategories: Object.keys(getCommandsByCategory()),
  };
};