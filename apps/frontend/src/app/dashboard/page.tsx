'use client';

import { useState } from 'react';
import { useUser, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import MobileMenu from './components/Shared/MobileMenu';
import LiveRegion from './components/Shared/LiveRegion';

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentProject, setCurrentProject] = useState('mumbai-dreams');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [liveMessage, setLiveMessage] = useState('');

  const sendMessage = async (messageContent?: string) => {
    const content = messageContent || input;
    if (!content.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setLiveMessage('Processing with Enhanced AI...');

    if (!messageContent) {
      setInput('');
    }

    try {
      // Use Enhanced AI system through tRPC
      setLiveMessage('Connecting to Enhanced AI agents...');
      
      const response = await fetch('/api/trpc/enhancedAi.runCastingWorkflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: content,
          projectDetails: {
            title: currentProject || 'Current Project',
            type: 'Web Series',
            budget: 50000000,
            timeline: '3 months'
          },
          preferences: {
            talentLocation: 'Mumbai',
            experienceLevel: 'advanced'
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Enhanced AI failed: ${response.status}`);
      }

      const result = await response.json();
      
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: result.result?.castingPlan || result.error?.message || 'Enhanced AI processing complete',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        metadata: {
          agentType: 'Enhanced Casting Director',
          sessionId: result.result?.workflowDetails?.sessionId,
          agentHandoffs: result.result?.workflowDetails?.agentHandoffs || 0,
          toolsUsed: result.result?.workflowDetails?.toolsUsed || 0,
          workflowStep: 'complete_casting'
        },
        talentCards: [], // TODO: Extract from Enhanced AI response
      };

      setMessages(prev => [...prev, aiMessage]);
      setLiveMessage('Enhanced AI workflow completed successfully ✨');
    } catch (error) {
      console.error('Enhanced AI Error:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai' as const,
        content: "I'm having trouble with the Enhanced AI system. Let me try the simple chat instead...",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMessage]);
      setLiveMessage('Enhanced AI unavailable, using fallback system.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (action: string) => {
    const enhancedWorkflows: { [key: string]: any } = {
      // Enhanced AI Workflows
      'complete-casting': {
        endpoint: 'runCastingWorkflow',
        data: {
          script: 'I need a complete casting strategy for a romantic thriller web series set in Mumbai with 6 main characters and 15 supporting roles. Focus on diverse talent with strong dramatic range.',
          projectDetails: {
            title: 'Mumbai Dreams - Complete Casting',
            type: 'Web Series',
            budget: 75000000,
            timeline: '4 months'
          },
          preferences: {
            talentLocation: 'Mumbai',
            experienceLevel: 'advanced'
          }
        }
      },
      'talent-discovery': {
        endpoint: 'runTalentDiscovery',
        data: {
          roleDescription: 'Looking for breakthrough talent for lead roles in upcoming OTT series. Need actors with strong dramatic range and screen presence.',
          requirements: {
            ageRange: '25-35',
            skills: ['dramatic acting', 'method acting', 'physical theatre'],
            experience: 'intermediate to advanced',
            location: 'Mumbai',
            languages: ['Hindi', 'English', 'Marathi']
          },
          preferences: {
            diversityFocus: true,
            newcomerFriendly: true,
            budgetTier: 'medium'
          }
        }
      },
      'script-analysis': {
        endpoint: 'quickScriptAnalysis',
        data: {
          script: 'FADE IN: INT. MUMBAI APARTMENT - NIGHT. RAVI (28), a software engineer turned investigative journalist, discovers a conspiracy that threatens the city. His girlfriend PRIYA (26), a lawyer, becomes his ally. They must outwit the antagonist MALHOTRA (45), a corrupt politician with deep connections.',
          focus: ['character analysis', 'casting requirements', 'age demographics', 'talent recommendations']
        }
      },
      'schedule-optimization': {
        endpoint: 'runScheduleOptimization',
        data: {
          talents: [
            { id: '1', name: 'Ravi Kumar', availability: { weekdays: true, weekends: false } },
            { id: '2', name: 'Priya Sharma', availability: { weekdays: true, weekends: true } },
            { id: '3', name: 'Sanjay Malhotra', availability: { weekdays: false, weekends: true } }
          ],
          constraints: {
            dateRange: {
              start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              end: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString()
            },
            dailyHours: { start: '09:00', end: '18:00' },
            roomsAvailable: 3,
            panelMembers: ['Director', 'Casting Director', 'Producer']
          },
          preferences: {
            prioritizeTravel: true,
            bufferTime: 30,
            groupSimilarRoles: true
          }
        }
      }
    };

    const workflow = enhancedWorkflows[action];
    if (workflow) {
      // Execute Enhanced AI workflow directly
      setLoading(true);
      setLiveMessage(`Executing ${action} workflow with Enhanced AI...`);

      // Add user action message
      const userMessage = {
        id: Date.now().toString(),
        type: 'user' as const,
        content: `🚀 Triggered: ${action.replace('-', ' ').toUpperCase()} workflow`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, userMessage]);

      try {
        // Call Enhanced AI endpoint
        const response = await fetch(`/api/trpc/enhancedAi.${workflow.endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workflow.data),
        });

        if (!response.ok) {
          throw new Error(`Enhanced AI workflow failed: ${response.status}`);
        }

        const result = await response.json();

        const aiMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai' as const,
          content: result.result?.output || result.result?.castingPlan || result.result?.analysis || 'Enhanced AI workflow completed successfully ✨',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          metadata: {
            agentType: `Enhanced ${action.replace('-', ' ')} Agent`,
            sessionId: result.result?.sessionId,
            agentHandoffs: result.result?.agentHandoffs || result.result?.workflowDetails?.agentHandoffs || 0,
            toolsUsed: result.result?.toolsUsed || result.result?.workflowDetails?.toolsUsed || 0,
            workflowStep: action
          },
          talentCards: result.result?.talentMatches || result.result?.recommendations || [],
        };

        setMessages(prev => [...prev, aiMessage]);
        setLiveMessage(`✨ ${action.replace('-', ' ')} workflow completed successfully!`);
      } catch (error) {
        console.error(`Enhanced AI ${action} workflow error:`, error);
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai' as const,
          content: `I encountered an issue with the ${action.replace('-', ' ')} workflow. Let me try a simpler approach instead.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, errorMessage]);
        setLiveMessage(`${action} workflow failed, falling back to basic chat.`);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Fallback to simple message for unknown actions
    console.log(`Unknown quick action: ${action}`);
    await sendMessage(`Execute ${action.replace('-', ' ')} workflow`);
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput('');
  };

  const handleProjectSelect = (projectId: string) => {
    setCurrentProject(projectId);
    console.log('Selected project:', projectId);
  };

  const handleChatSelect = (chatId: string) => {
    console.log('Selected chat:', chatId);
  };

  const handleSettingsClick = () => {
    console.log('Settings clicked');
  };

  const handleHelpClick = () => {
    console.log('Help clicked');
  };

  const handleUpgradeClick = () => {
    console.log('Upgrade clicked');
  };

  const handleNotificationsClick = () => {
    console.log('Notifications clicked');
  };

  // Show loading while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SignedIn>
        <div className="flex h-screen bg-gray-50 relative">
          {/* Live Region for Accessibility Announcements */}
          <LiveRegion message={liveMessage} priority="polite" />

          {/* Mobile Menu Toggle */}
          <MobileMenu isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

          {/* Enhanced Sidebar */}
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onNewChat={() => {
              handleNewChat();
              setSidebarOpen(false);
            }}
            onProjectSelect={projectId => {
              handleProjectSelect(projectId);
              setSidebarOpen(false);
            }}
            onChatSelect={chatId => {
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
      </SignedIn>

      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
