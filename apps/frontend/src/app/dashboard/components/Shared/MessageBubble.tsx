'use client';

import { Avatar } from '@heroui/react';

interface MessageBubbleProps {
  type: 'user' | 'ai';
  content: string;
  timestamp?: string;
}

export default function MessageBubble({ type, content, timestamp }: MessageBubbleProps) {
  return (
    <div className={`flex gap-4 ${type === 'user' ? 'justify-end' : 'justify-start'}`}>
      {type === 'ai' && (
        <Avatar
          size="sm"
          classNames={{
            base: 'bg-gradient-to-br from-gray-700 to-gray-800 flex-shrink-0',
            name: 'text-white font-bold text-xs',
          }}
          name="AI"
        />
      )}

      <div className={`max-w-2xl ${type === 'user' ? 'order-first' : ''}`}>
        <div
          className={`px-4 py-3 rounded-2xl ${
            type === 'user'
              ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white ml-auto'
              : 'bg-white border border-gray-200 text-gray-900 shadow-sm'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>

        {timestamp && (
          <p
            className={`text-xs text-gray-400 mt-1 ${type === 'user' ? 'text-right' : 'text-left'}`}
          >
            {timestamp}
          </p>
        )}
      </div>

      {type === 'user' && (
        <Avatar
          size="sm"
          classNames={{
            base: 'bg-gradient-to-br from-teal-500 to-teal-600 flex-shrink-0',
            name: 'text-white font-medium text-xs',
          }}
          name="You"
        />
      )}
    </div>
  );
}
