'use client';

import { Button } from '@heroui/react';
import { PlusIcon } from '@heroicons/react/24/outline';

interface NewChatButtonProps {
  onClick: () => void;
}

export default function NewChatButton({ onClick }: NewChatButtonProps) {
  return (
    <div className="px-4 pb-4">
      <Button
        onClick={onClick}
        className="w-full h-12 font-medium text-white shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200"
        color="default"
        size="lg"
        radius="lg"
        startContent={<PlusIcon className="h-4 w-4" />}
        style={{
          background: 'linear-gradient(135deg, #FF6B5A 0%, #FF5722 100%)',
        }}
      >
        New Chat
      </Button>
    </div>
  );
}
