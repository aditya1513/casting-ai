'use client';

import { useState } from 'react';
import { Input } from '@heroui/react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="px-4 py-3">
      <div className="relative">
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Search projects, chats..."
          size="md"
          radius="lg"
          startContent={<MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />}
          className="w-full"
          classNames={{
            base: 'w-full',
            mainWrapper: 'w-full',
            input: [
              'text-sm',
              'placeholder:text-gray-400',
              'bg-gray-50',
              'border-0',
              'focus:bg-white',
            ],
            inputWrapper: [
              'shadow-none',
              'bg-gray-50',
              'border',
              'border-gray-200',
              'hover:border-gray-300',
              'focus-within:border-teal-600',
              'focus-within:bg-white',
              'transition-all',
              'duration-200',
            ],
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </div>
    </div>
  );
}
