'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Command,
  Settings,
  Zap,
  Cpu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAdvancedVoice } from '../../hooks/useAdvancedVoice';
import { useVoiceCommands } from '../../hooks/useVoiceRecognition';
import { cn } from '@/lib/utils';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onCommand?: (command: any) => void;
  disabled?: boolean;
  placeholder?: string;
  language?: string;
  className?: string;
  showCommands?: boolean;
  autoSend?: boolean;
  preferredProvider?: 'web-speech' | 'whisper' | 'auto';
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  onTranscript,
  onCommand,
  disabled = false,
  placeholder = "Click to start voice input...",
  language = 'en-IN',
  className,
  showCommands = true,
  autoSend = false,
  preferredProvider = 'auto',
}) => {
  const [showTranscript, setShowTranscript] = useState(false);
  const [lastSentTranscript, setLastSentTranscript] = useState('');
  const [showProviderMenu, setShowProviderMenu] = useState(false);

  const {
    isListening,
    isProcessing,
    isAvailable,
    transcript,
    interimTranscript,
    error,
    volume,
    currentProvider,
    providers,
    startListening,
    stopListening,
    resetTranscript,
    switchProvider,
    fullTranscript,
    hasWhisper,
    hasWebSpeech,
    canSwitch,
  } = useAdvancedVoice({ 
    provider: preferredProvider,
    language, 
    continuous: true, 
    interimResults: true 
  });

  const {
    processCommand,
    lastCommand,
    isProcessingCommand,
    clearLastCommand,
    availableCommands,
  } = useVoiceCommands();

  // Handle voice commands
  useEffect(() => {
    if (transcript && transcript !== lastSentTranscript) {
      const command = processCommand(transcript);
      if (command && onCommand) {
        onCommand(command);
        clearLastCommand();
      }
    }
  }, [transcript, processCommand, onCommand, lastSentTranscript, clearLastCommand]);

  // Auto-send transcript when speech ends
  useEffect(() => {
    if (autoSend && transcript && transcript !== lastSentTranscript && !isListening) {
      onTranscript(transcript);
      setLastSentTranscript(transcript);
      resetTranscript();
    }
  }, [transcript, isListening, autoSend, onTranscript, lastSentTranscript, resetTranscript]);

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
      setShowTranscript(true);
    }
  };

  const handleSendTranscript = () => {
    if (fullTranscript.trim()) {
      onTranscript(fullTranscript.trim());
      setLastSentTranscript(fullTranscript.trim());
      resetTranscript();
      setShowTranscript(false);
    }
  };

  const handleClearTranscript = () => {
    resetTranscript();
    setShowTranscript(false);
  };

  // Volume visualization component
  const VolumeVisualizer = () => (
    <div className="flex items-center space-x-1">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1 bg-green-500 rounded-full"
          animate={{
            height: isListening ? Math.max(4, (volume / 100) * 20 * (i + 1) / 5) : 4,
          }}
          transition={{ duration: 0.1 }}
        />
      ))}
    </div>
  );

  if (!isAvailable) {
    return (
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Voice input is not supported in this browser. Please use Chrome or Safari.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Voice Control Button */}
      <div className="flex items-center space-x-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isListening ? "destructive" : "default"}
                size="sm"
                onClick={handleToggleListening}
                disabled={disabled}
                className={cn(
                  "relative transition-all duration-200",
                  isListening && "animate-pulse shadow-lg shadow-red-500/25"
                )}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
                {isListening && (
                  <motion.div
                    className="absolute inset-0 rounded-md border-2 border-red-500"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isListening ? 'Stop listening' : 'Start voice input'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Volume Visualizer */}
        {isListening && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center space-x-2"
          >
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <VolumeVisualizer />
          </motion.div>
        )}

        {/* Provider Selection */}
        {canSwitch && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProviderMenu(!showProviderMenu)}
                  className="h-8 px-2"
                >
                  {currentProvider === 'whisper' ? (
                    <span className="flex items-center space-x-1">
                      <Zap className="h-3 w-3" />
                      <span className="text-xs">AI</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1">
                      <Cpu className="h-3 w-3" />
                      <span className="text-xs">Web</span>
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Current: {currentProvider === 'whisper' ? 'Whisper AI (High Quality)' : 'Web Speech (Fast)'}</p>
                <p className="text-xs">Click to switch providers</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Provider Menu */}
        {showProviderMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-full left-0 mt-2 bg-background border rounded-lg p-2 shadow-lg z-10"
          >
            {hasWhisper && (
              <Button
                variant={currentProvider === 'whisper' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  switchProvider('whisper');
                  setShowProviderMenu(false);
                }}
                className="w-full justify-start mb-1"
              >
                <Zap className="h-3 w-3 mr-2" />
                Whisper AI (High Quality)
              </Button>
            )}
            {hasWebSpeech && (
              <Button
                variant={currentProvider === 'web-speech' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  switchProvider('web-speech');
                  setShowProviderMenu(false);
                }}
                className="w-full justify-start"
              >
                <Cpu className="h-3 w-3 mr-2" />
                Web Speech (Fast)
              </Button>
            )}
          </motion.div>
        )}

        {/* Status Indicators */}
        {(isProcessingCommand || isProcessing) && (
          <Badge variant="secondary" className="animate-pulse">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            {isProcessing ? 'Transcribing...' : 'Processing...'}
          </Badge>
        )}

        {lastCommand && (
          <Badge variant="outline" className="text-green-600">
            <Command className="h-3 w-3 mr-1" />
            {lastCommand}
          </Badge>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Transcript Display */}
      <AnimatePresence>
        {(showTranscript || fullTranscript) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border rounded-lg p-4 bg-muted/50"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Voice Input</span>
                <div className="flex space-x-2">
                  {fullTranscript && !autoSend && (
                    <>
                      <Button size="sm" variant="outline" onClick={handleClearTranscript}>
                        Clear
                      </Button>
                      <Button size="sm" onClick={handleSendTranscript}>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Send
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="min-h-[60px] p-3 bg-background rounded border">
                <p className="text-sm">
                  {transcript && (
                    <span className="text-foreground">{transcript}</span>
                  )}
                  {interimTranscript && (
                    <span className="text-muted-foreground italic">
                      {interimTranscript}
                    </span>
                  )}
                  {!fullTranscript && (
                    <span className="text-muted-foreground italic">
                      {isListening ? 'Listening...' : placeholder}
                    </span>
                  )}
                </p>
              </div>

              {isListening && (
                <div className="text-xs text-muted-foreground flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span>Recording... Speak clearly into your microphone</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Commands Help */}
      {showCommands && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-muted-foreground"
        >
          <details className="cursor-pointer">
            <summary className="flex items-center space-x-1 hover:text-foreground">
              <Command className="h-3 w-3" />
              <span>Voice Commands</span>
            </summary>
            <div className="mt-2 pl-4 space-y-1">
              {availableCommands.slice(0, 8).map((command) => (
                <div key={command} className="flex items-center space-x-2">
                  <span className="font-mono text-xs bg-muted px-1 rounded">
                    "{command}"
                  </span>
                </div>
              ))}
              <div className="text-xs text-muted-foreground">
                ...and {availableCommands.length - 8} more commands
              </div>
            </div>
          </details>
        </motion.div>
      )}
    </div>
  );
};

// Compact voice button for use in chat input
export const VoiceButton: React.FC<{
  onTranscript: (text: string) => void;
  onCommand?: (command: any) => void;
  disabled?: boolean;
  isListening?: boolean;
}> = ({ onTranscript, onCommand, disabled = false }) => {
  const {
    isListening,
    isProcessing,
    isAvailable,
    transcript,
    error,
    currentProvider,
    startListening,
    stopListening,
    resetTranscript,
  } = useAdvancedVoice({ 
    provider: 'auto',
    language: 'en-IN', 
    continuous: false 
  });

  const handleClick = () => {
    if (isListening) {
      stopListening();
      if (transcript) {
        onTranscript(transcript);
        resetTranscript();
      }
    } else {
      startListening();
    }
  };

  if (!isAvailable) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClick}
            disabled={disabled || isProcessing}
            className={cn(
              "h-8 w-8 p-0 relative",
              (isListening || isProcessing) && "text-red-500 animate-pulse"
            )}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isListening ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
            {/* Provider indicator */}
            {currentProvider === 'whisper' && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isProcessing 
              ? 'Processing...' 
              : isListening 
                ? 'Stop & send' 
                : 'Voice input'
            }
          </p>
          <p className="text-xs text-muted-foreground">
            Using {currentProvider === 'whisper' ? 'Whisper AI' : 'Web Speech'}
          </p>
          {error && <p className="text-red-400 text-xs">{error.message}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};