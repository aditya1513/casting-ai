'use client';

import { useUser } from '@clerk/nextjs';
import EnhancedChatInterface from './EnhancedChatInterface';

interface MainContentProps {
  messages: any[];
  input: string;
  isLoading: boolean;
  currentProject: string;
  onInputChange: (value: string) => void;
  onSendMessage: (message?: string) => Promise<void>;
  onProjectChange: (projectId: string) => void;
  onNotificationsClick: () => void;
  onSettingsClick: () => void;
  onQuickAction?: (action: string) => void;
}

export default function MainContent({
  messages,
  input,
  isLoading,
  currentProject,
  onInputChange,
  onSendMessage,
  onProjectChange,
  onNotificationsClick,
  onSettingsClick,
  onQuickAction,
}: MainContentProps) {
  const { user } = useUser();

  const handleSendMessage = async (message: string) => {
    await onSendMessage(message);
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-h-0">
      {/* Enhanced Chat Interface */}
      <EnhancedChatInterface 
        messages={messages}
        isLoading={isLoading}
        onQuickAction={onQuickAction}
        onSendMessage={handleSendMessage}
        userId={user?.id}
      />
    </div>
  );
}
