'use client';

import { useState, useRef, useEffect } from 'react';
import { Button, Textarea } from '@heroui/react';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';

interface InputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading?: boolean;
  placeholder?: string;
}

export default function InputArea({
  value,
  onChange,
  onSend,
  isLoading = false,
  placeholder = 'Ask about talents, schedule auditions, analyze scripts...',
}: InputAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) {
        onSend();
      }
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 120); // Max 120px
      textarea.style.height = `${newHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [value]);

  return (
    <div className="bg-white border-t border-gray-200 px-6 py-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative">
          <div className="bg-gray-50 rounded-3xl border border-gray-200 hover:border-gray-300 focus-within:border-teal-500 transition-all duration-200 shadow-sm">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={e => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full px-6 py-4 pr-14 bg-transparent border-none outline-none resize-none text-sm placeholder:text-gray-500 min-h-[48px] max-h-[120px]"
              style={{ minHeight: '48px' }}
              disabled={isLoading}
            />

            {/* Send Button */}
            <div className="absolute right-3 bottom-3">
              <Button
                isIconOnly
                size="sm"
                radius="full"
                className="w-8 h-8 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                onClick={onSend}
                isDisabled={!value.trim() || isLoading}
                isLoading={isLoading}
              >
                <PaperAirplaneIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Character Count */}
          {value.length > 500 && (
            <div className="flex justify-end mt-2">
              <span className={`text-xs ${value.length > 1000 ? 'text-red-500' : 'text-gray-400'}`}>
                {value.length}/1000
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
