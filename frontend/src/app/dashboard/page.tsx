"use client";

import { useState } from "react";
// import { useUser } from '@auth0/nextjs-auth0/client';
import Sidebar from "./components/Sidebar";
import MainContent from "./components/MainContent";
import MobileMenu from "./components/Shared/MobileMenu";
import LiveRegion from "./components/Shared/LiveRegion";

export default function DashboardPage() {
  // const { user } = useUser();
  const user = null; // Temporary for testing
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentProject, setCurrentProject] = useState("mumbai-dreams");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [liveMessage, setLiveMessage] = useState("");

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { 
      id: Date.now().toString(), 
      type: "user" as const, 
      content: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setLiveMessage("Sending message...");
    
    try {
      // Try authenticated endpoint first if user is logged in
      let response: Response;
      let data: any;
      let apiSource = 'mock_agents';
      
      if (user) {
        try {
          setLiveMessage("Using authenticated Claude agents...");
          response = await fetch("/api/conversations/protected", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: input, projectId: currentProject }),
          });
          
          if (response.ok) {
            data = await response.json();
            apiSource = data.source || 'authenticated_backend_agents';
          } else {
            throw new Error(`Auth failed: ${response.status}`);
          }
        } catch (authError) {
          console.log('Authenticated request failed, falling back to public endpoint:', authError);
          // Fall back to public endpoint
          response = await fetch("/api/conversations/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: input, projectId: currentProject }),
          });
          data = await response.json();
          apiSource = data.source || 'fallback_mock_agents';
        }
      } else {
        // User not authenticated, use public endpoint
        setLiveMessage("Using public agents (sign in for real Claude agents)...");
        response = await fetch("/api/conversations/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: input, projectId: currentProject }),
        });
        data = await response.json();
        apiSource = data.source || 'public_mock_agents';
      }
      
      const sourceInfo = apiSource === 'authenticated_backend_agents' ? 
        ' 🔐 *Real Claude AI Response*' : 
        ' 🤖 *Mock Agent Response*';
      
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: "ai" as const,
        content: data.content + sourceInfo,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        talentCards: data.talentCards || []
      };
      
      setMessages((prev) => [...prev, aiMessage]);
      setInput("");
      setLiveMessage(`${user ? 'Authenticated' : 'Public'} AI response received from ${apiSource}`);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: "ai" as const,
        content: "Sorry, I'm having trouble connecting. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMessage]);
      setLiveMessage("Error occurred while sending message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (action: string) => {
    const quickMessages: { [key: string]: string } = {
      // Quick Actions
      "find-male-lead": "Find me suitable male lead actors for romantic drama in Mumbai Dreams",
      "schedule-auditions": "Help me schedule auditions for this week",
      "analyze-script": "Analyze the script and suggest character requirements",
      "optimize-budget": "Help me optimize the casting budget for this project",
      
      // Specialist Agents
      "callback-notifications": "Send callback notifications to selected actors for Mumbai Dreams",
      "research-background": "Research background of shortlisted talent for character fit",
      "compare-candidates": "Compare top 3 candidates for villain role in Mumbai Dreams",
      "track-progress": "Track project progress and milestones for casting",
      
      // Advanced Actions
      "handle-withdrawal": "Handle actor withdrawal emergency - need immediate replacement strategy",
      "validate-decisions": "Validate final casting decisions before contract signing",
      "coordinate-team": "Coordinate with director and producers on casting choices"
    };
    
    const message = quickMessages[action];
    if (message) {
      setInput(message);
      
      // Auto-send the message immediately
      const userMessage = { 
        id: Date.now().toString(), 
        type: "user" as const, 
        content: message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages((prev) => [...prev, userMessage]);
      setLoading(true);
      setLiveMessage("Sending message...");
      
      try {
        // Try authenticated endpoint first if user is logged in
        let response: Response;
        let data: any;
        let apiSource = 'mock_agents';
        
        if (user) {
          try {
            setLiveMessage("Using authenticated Claude agents...");
            response = await fetch("/api/conversations/protected", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content: message, projectId: currentProject }),
            });
            
            if (response.ok) {
              data = await response.json();
              apiSource = data.source || 'authenticated_backend_agents';
            } else {
              throw new Error(`Auth failed: ${response.status}`);
            }
          } catch (authError) {
            console.log('Authenticated request failed, falling back to public endpoint:', authError);
            // Fall back to public endpoint
            response = await fetch("/api/conversations/messages", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content: message, projectId: currentProject }),
            });
            data = await response.json();
            apiSource = data.source || 'fallback_mock_agents';
          }
        } else {
          // User not authenticated, use public endpoint
          setLiveMessage("Using public agents (sign in for real Claude agents)...");
          response = await fetch("/api/conversations/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: message, projectId: currentProject }),
          });
          data = await response.json();
          apiSource = data.source || 'public_mock_agents';
        }
        
        const sourceInfo = apiSource === 'authenticated_backend_agents' ? 
          ' 🔐 *Real Claude AI Response*' : 
          ' 🤖 *Mock Agent Response*';
        
        const aiMessage = {
          id: (Date.now() + 1).toString(),
          type: "ai" as const,
          content: data.content + sourceInfo,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          talentCards: data.talentCards || []
        };
        
        setMessages((prev) => [...prev, aiMessage]);
        setInput("");
        setLiveMessage(`${user ? 'Authenticated' : 'Public'} AI response received from ${apiSource}`);
      } catch (error) {
        console.error("Error:", error);
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          type: "ai" as const,
          content: "Sorry, I'm having trouble connecting. Please try again.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev) => [...prev, errorMessage]);
        setLiveMessage("Error occurred while sending message. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
  };

  const handleProjectSelect = (projectId: string) => {
    setCurrentProject(projectId);
    console.log("Selected project:", projectId);
  };

  const handleChatSelect = (chatId: string) => {
    console.log("Selected chat:", chatId);
  };

  const handleSettingsClick = () => {
    console.log("Settings clicked");
  };

  const handleHelpClick = () => {
    console.log("Help clicked");
  };

  const handleUpgradeClick = () => {
    console.log("Upgrade clicked");
  };


  const handleNotificationsClick = () => {
    console.log("Notifications clicked");
  };

  return (
    <div className="flex h-screen bg-gray-50 relative">
      {/* Live Region for Accessibility Announcements */}
      <LiveRegion message={liveMessage} priority="polite" />
      
      {/* Mobile Menu Toggle */}
      <MobileMenu 
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      
      {/* Enhanced Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={() => {
          handleNewChat();
          setSidebarOpen(false);
        }}
        onProjectSelect={(projectId) => {
          handleProjectSelect(projectId);
          setSidebarOpen(false);
        }}
        onChatSelect={(chatId) => {
          handleChatSelect(chatId);
          setSidebarOpen(false);
        }}
        onSettingsClick={handleSettingsClick}
        onHelpClick={handleHelpClick}
        onUpgradeClick={handleUpgradeClick}
      />

      {/* Enhanced Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <MainContent
          messages={messages}
          input={input}
          isLoading={loading}
          currentProject={currentProject}
          onInputChange={setInput}
          onSendMessage={sendMessage}
          onProjectChange={handleProjectSelect}
          onNotificationsClick={handleNotificationsClick}
          onSettingsClick={handleSettingsClick}
          onQuickAction={handleQuickAction}
        />
      </div>
      
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}