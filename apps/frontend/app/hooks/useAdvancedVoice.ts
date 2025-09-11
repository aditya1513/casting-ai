'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface VoiceProvider {
  name: 'web-speech' | 'whisper';
  available: boolean;
  quality: 'high' | 'medium' | 'low';
}

interface VoiceConfig {
  provider?: 'web-speech' | 'whisper' | 'auto';
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  useWhisperFallback?: boolean;
}

interface VoiceResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  provider: 'web-speech' | 'whisper';
  processingTime?: number;
}

interface VoiceError {
  error: string;
  message: string;
  provider: string;
}

export const useAdvancedVoice = (config: VoiceConfig = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<VoiceError | null>(null);
  const [volume, setVolume] = useState(0);
  const [currentProvider, setCurrentProvider] = useState<'web-speech' | 'whisper'>('web-speech');
  const [providers, setProviders] = useState<VoiceProvider[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const volumeAnalyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();

  const {
    provider = 'auto',
    language = 'en-IN',
    continuous = true,
    interimResults = true,
    maxAlternatives = 1,
    useWhisperFallback = true,
  } = config;

  // Detect available providers
  useEffect(() => {
    const detectProviders = () => {
      const availableProviders: VoiceProvider[] = [];

      // Check Web Speech API
      if (typeof window !== 'undefined') {
        const SpeechRecognition = 
          window.SpeechRecognition || 
          (window as any).webkitSpeechRecognition;

        if (SpeechRecognition) {
          availableProviders.push({
            name: 'web-speech',
            available: true,
            quality: 'medium',
          });
        }

        // Check MediaRecorder for Whisper
        if (navigator.mediaDevices && MediaRecorder.isTypeSupported('audio/webm')) {
          availableProviders.push({
            name: 'whisper',
            available: true,
            quality: 'high',
          });
        }
      }

      setProviders(availableProviders);

      // Set default provider
      if (provider === 'auto') {
        if (availableProviders.find(p => p.name === 'whisper')) {
          setCurrentProvider('whisper');
        } else if (availableProviders.find(p => p.name === 'web-speech')) {
          setCurrentProvider('web-speech');
        }
      } else {
        setCurrentProvider(provider as 'web-speech' | 'whisper');
      }
    };

    detectProviders();
  }, [provider]);

  // Initialize Web Speech API
  useEffect(() => {
    if (currentProvider !== 'web-speech' || typeof window === 'undefined') return;

    const SpeechRecognition = 
      window.SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = language;
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.maxAlternatives = maxAlternatives;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        console.log('🎤 Web Speech recognition started');
      };

      recognition.onend = () => {
        setIsListening(false);
        console.log('🎤 Web Speech recognition ended');
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
        console.error('🎤 Web Speech error:', event.error);
        setError({
          error: event.error,
          message: getErrorMessage(event.error),
          provider: 'web-speech',
        });
        setIsListening(false);

        // Fallback to Whisper if enabled
        if (useWhisperFallback && providers.find(p => p.name === 'whisper')) {
          console.log('🎤 Falling back to Whisper...');
          setCurrentProvider('whisper');
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [currentProvider, language, continuous, interimResults, maxAlternatives, useWhisperFallback, providers]);

  // Volume analysis
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

  // Whisper transcription
  const transcribeWithWhisper = useCallback(async (audioBlob: Blob) => {
    setIsProcessing(true);
    const startTime = Date.now();

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('language', language.split('-')[0]); // Convert 'en-IN' to 'en'

      const response = await fetch('/api/ai/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`);
      }

      const result = await response.json();
      const processingTime = Date.now() - startTime;

      setTranscript(prev => prev + result.text);
      console.log(`🎤 Whisper transcription completed in ${processingTime}ms`);

      return {
        transcript: result.text,
        confidence: result.confidence || 0.9,
        isFinal: true,
        provider: 'whisper' as const,
        processingTime,
      };
    } catch (err: any) {
      console.error('🎤 Whisper transcription error:', err);
      setError({
        error: 'transcription-failed',
        message: err.message || 'Transcription failed',
        provider: 'whisper',
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [language]);

  // Start listening with current provider
  const startListening = useCallback(async () => {
    try {
      setTranscript('');
      setInterimTranscript('');
      setError(null);
      await initVolumeAnalysis();

      if (currentProvider === 'web-speech') {
        if (!recognitionRef.current) {
          throw new Error('Web Speech API not available');
        }
        recognitionRef.current.start();
      } else if (currentProvider === 'whisper') {
        if (!mediaStreamRef.current) {
          throw new Error('Media stream not available');
        }

        setIsListening(true);
        audioChunksRef.current = [];

        const mediaRecorder = new MediaRecorder(mediaStreamRef.current, {
          mimeType: 'audio/webm;codecs=opus',
        });

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await transcribeWithWhisper(audioBlob);
          setIsListening(false);
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
      }
    } catch (err: any) {
      console.error('🎤 Error starting voice recognition:', err);
      setError({
        error: 'start-error',
        message: err.message || 'Failed to start voice recognition',
        provider: currentProvider,
      });
    }
  }, [currentProvider, initVolumeAnalysis, transcribeWithWhisper]);

  const stopListening = useCallback(() => {
    if (currentProvider === 'web-speech' && recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    } else if (currentProvider === 'whisper' && mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    setVolume(0);
  }, [currentProvider, isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  const switchProvider = useCallback((newProvider: 'web-speech' | 'whisper') => {
    if (isListening) {
      stopListening();
    }
    setCurrentProvider(newProvider);
  }, [isListening, stopListening]);

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
      case 'transcription-failed':
        return 'Transcription failed. Please try again.';
      default:
        return 'An error occurred with voice recognition.';
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const isAvailable = providers.length > 0;
  const hasWhisper = providers.some(p => p.name === 'whisper');
  const hasWebSpeech = providers.some(p => p.name === 'web-speech');

  return {
    // State
    isListening,
    isProcessing,
    isAvailable,
    transcript,
    interimTranscript,
    error,
    volume,
    currentProvider,
    providers,

    // Actions
    startListening,
    stopListening,
    resetTranscript,
    switchProvider,

    // Computed
    hasTranscript: transcript.length > 0 || interimTranscript.length > 0,
    fullTranscript: transcript + interimTranscript,
    hasWhisper,
    hasWebSpeech,
    canSwitch: hasWhisper && hasWebSpeech,
  };
};