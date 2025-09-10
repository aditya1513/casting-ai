"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Square, Loader2, Volume2, AlertCircle } from 'lucide-react'

export interface VoiceControlsProps {
  /** Callback when recording starts */
  onRecordingStart?: () => void
  /** Callback when recording stops with audio blob */
  onRecordingStop?: (audioBlob: Blob, duration: number) => void
  /** Callback for real-time transcription */
  onTranscription?: (text: string, isFinal: boolean) => void
  /** Enable real-time transcription */
  enableTranscription?: boolean
  /** Maximum recording duration in seconds */
  maxDuration?: number
  /** Auto-stop on silence detection */
  autoStopOnSilence?: boolean
  /** Silence threshold in milliseconds */
  silenceThreshold?: number
  /** Custom class name */
  className?: string
  /** Disabled state */
  disabled?: boolean
  /** Variant style */
  variant?: 'default' | 'compact' | 'floating'
}

/**
 * VoiceControls component for audio recording and transcription
 * Integrates with Web Speech API for real-time transcription
 */
export const VoiceControls: React.FC<VoiceControlsProps> = ({
  onRecordingStart,
  onRecordingStop,
  onTranscription,
  enableTranscription = false,
  maxDuration = 120,
  autoStopOnSilence = true,
  silenceThreshold = 2000,
  className,
  disabled = false,
  variant = 'default',
}) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const recognitionRef = useRef<any>(null)

  // Initialize speech recognition
  useEffect(() => {
    if (enableTranscription && typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'

        recognition.onresult = (event: any) => {
          const last = event.results.length - 1
          const transcript = event.results[last][0].transcript
          const isFinal = event.results[last].isFinal

          onTranscription?.(transcript, isFinal)
        }

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
          if (event.error === 'no-speech') {
            setError('No speech detected. Please try again.')
          }
        }

        recognitionRef.current = recognition
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [enableTranscription, onTranscription])

  // Audio level monitoring
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return

    const analyser = analyserRef.current
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    
    const checkLevel = () => {
      if (!isRecording) return

      analyser.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length
      const normalizedLevel = Math.min(100, (average / 128) * 100)
      
      setAudioLevel(normalizedLevel)

      // Silence detection
      if (autoStopOnSilence) {
        if (normalizedLevel < 5) {
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              if (isRecording) {
                stopRecording()
              }
            }, silenceThreshold)
          }
        } else {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current)
            silenceTimerRef.current = null
          }
        }
      }

      requestAnimationFrame(checkLevel)
    }

    checkLevel()
  }, [isRecording, autoStopOnSilence, silenceThreshold])

  // Start recording
  const startRecording = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Set up audio context for level monitoring
      audioContextRef.current = new AudioContext()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      source.connect(analyserRef.current)

      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        onRecordingStop?.(audioBlob, duration)
        cleanup()
      }

      mediaRecorder.start()
      setIsRecording(true)
      setDuration(0)
      onRecordingStart?.()

      // Start duration timer
      const startTime = Date.now()
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        setDuration(elapsed)
        
        if (elapsed >= maxDuration) {
          stopRecording()
        }
      }, 100)

      // Start audio level monitoring
      monitorAudioLevel()

      // Start speech recognition
      if (enableTranscription && recognitionRef.current) {
        recognitionRef.current.start()
      }
    } catch (err) {
      console.error('Error accessing microphone:', err)
      setError('Unable to access microphone. Please check permissions.')
      cleanup()
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      setIsProcessing(true)
      mediaRecorderRef.current.stop()
      
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }

  // Pause/Resume recording
  const togglePause = () => {
    if (!mediaRecorderRef.current) return

    if (isPaused) {
      mediaRecorderRef.current.resume()
      if (recognitionRef.current) {
        recognitionRef.current.start()
      }
    } else {
      mediaRecorderRef.current.pause()
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
    setIsPaused(!isPaused)
  }

  // Cleanup function
  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }
    
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    
    setIsRecording(false)
    setIsPaused(false)
    setIsProcessing(false)
    setAudioLevel(0)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [])

  // Format duration display
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (variant === 'compact') {
    return (
      <Button
        size="icon"
        variant={isRecording ? 'destructive' : 'outline'}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled || isProcessing}
        className={className}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isRecording ? (
          <MicOff className="w-4 h-4" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </Button>
    )
  }

  if (variant === 'floating') {
    return (
      <div className={cn(
        "fixed bottom-20 right-4 z-50",
        className
      )}>
        <Button
          size="icon-lg"
          variant={isRecording ? 'destructive' : 'primary'}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled || isProcessing}
          className="shadow-lg"
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isProcessing ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : isRecording ? (
            <MicOff className="w-6 h-6" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </Button>
        
        {isRecording && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
            {formatDuration(duration)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Main Record Button */}
      <Button
        size={isRecording ? 'icon' : 'default'}
        variant={isRecording ? 'destructive' : 'outline'}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled || isProcessing}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isRecording ? (
          <Square className="w-4 h-4" />
        ) : (
          <>
            <Mic className="w-4 h-4" />
            {!isRecording && <span className="ml-1">Record</span>}
          </>
        )}
      </Button>

      {/* Recording Controls */}
      {isRecording && (
        <>
          {/* Pause Button */}
          <Button
            size="icon"
            variant="ghost"
            onClick={togglePause}
            aria-label={isPaused ? 'Resume recording' : 'Pause recording'}
          >
            {isPaused ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </Button>

          {/* Duration Display */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-md">
            <Volume2 className={cn(
              "w-4 h-4 transition-opacity",
              audioLevel > 10 ? "opacity-100" : "opacity-30"
            )} />
            <span className="text-sm font-mono">{formatDuration(duration)}</span>
            
            {/* Audio Level Indicator */}
            <div className="w-16 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-100"
                style={{ width: `${audioLevel}%` }}
              />
            </div>
          </div>
        </>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="w-3 h-3" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}