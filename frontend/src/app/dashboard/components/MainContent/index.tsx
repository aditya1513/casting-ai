"use client";

import TopBar from "./TopBar";
import ChatInterface from "./ChatInterface";
import InputArea from "./InputArea";

interface MainContentProps {
  messages: any[];
  input: string;
  isLoading: boolean;
  currentProject: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
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
  onQuickAction
}: MainContentProps) {
  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-h-0">
      {/* Chat Interface */}
      <ChatInterface
        messages={messages}
        isLoading={isLoading}
        onQuickAction={onQuickAction}
      />
      
      {/* Input Area */}
      <InputArea
        value={input}
        onChange={onInputChange}
        onSend={onSendMessage}
        isLoading={isLoading}
      />
    </div>
  );
}