"use client";

import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import CollapsibleSection from "./CollapsibleSection";

interface ChatItem {
  id: string;
  title: string;
  timestamp: string;
  timeAgo: string;
}

interface RecentChatsProps {
  chats: ChatItem[];
  onChatSelect: (chatId: string) => void;
}

const mockChats: ChatItem[] = [
  {
    id: "1",
    title: "Lead Actor Search",
    timestamp: "2024-09-09T13:00:00Z",
    timeAgo: "2h"
  },
  {
    id: "2",
    title: "Character Analysis Discussion",
    timestamp: "2024-09-08T15:30:00Z",
    timeAgo: "1d"
  },
  {
    id: "3",
    title: "Budget Planning Session",
    timestamp: "2024-09-06T10:15:00Z",
    timeAgo: "3d"
  },
  {
    id: "4",
    title: "Supporting Cast Requirements",
    timestamp: "2024-09-05T14:45:00Z",
    timeAgo: "4d"
  }
];

export default function RecentChats({ 
  chats = mockChats, 
  onChatSelect 
}: RecentChatsProps) {
  return (
    <CollapsibleSection
      title="Recent Chats"
      icon={<ChatBubbleLeftRightIcon className="h-4 w-4" />}
      defaultExpanded={true}
    >
      <div className="space-y-1">
        {chats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onChatSelect(chat.id)}
            className="w-full px-4 py-2.5 rounded-full text-left hover:bg-gray-50 transition-colors duration-200 group"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 truncate group-hover:text-gray-700">
                  {chat.title}
                </p>
              </div>
              <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                {chat.timeAgo}
              </span>
            </div>
          </button>
        ))}
      </div>
    </CollapsibleSection>
  );
}