'use client';

import React from 'react';
import { ChatContainerV2 } from '@/app/components/chat';
import { ThemeToggleCompact } from '@/app/components/theme/ThemeToggle';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import './chat-v2.css';

export default function ChatV2Page() {
  const router = useRouter();

  const handleTalentAction = {
    onViewProfile: (talentId: string) => {
      router.push(`/talents/${talentId}`);
    },
    onScheduleAudition: (talentId: string) => {
      router.push(`/auditions/schedule?talent=${talentId}`);
    },
    onAddToShortlist: (talentId: string) => {
      // Add to shortlist logic
      console.log('Adding to shortlist:', talentId);
    },
  };

  return (
    <div className="chat-v2-page">
      {/* Mobile Header */}
      <div className="chat-v2-page__mobile-header">
        <button
          onClick={() => router.back()}
          className="chat-v2-page__back-button"
          aria-label="Go back"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <h1 className="chat-v2-page__mobile-title">CastMatch AI</h1>

        <ThemeToggleCompact className="chat-v2-page__theme-toggle" />
      </div>

      {/* Desktop Sidebar */}
      <motion.aside
        initial={{ x: -300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="chat-v2-page__sidebar"
      >
        <div className="chat-v2-page__sidebar-header">
          <div className="chat-v2-page__logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span>CastMatch</span>
          </div>
          <ThemeToggleCompact />
        </div>

        <nav className="chat-v2-page__nav">
          <h2 className="chat-v2-page__nav-title">Quick Actions</h2>

          <button className="chat-v2-page__nav-item chat-v2-page__nav-item--active">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <span>AI Chat</span>
          </button>

          <button className="chat-v2-page__nav-item" onClick={() => router.push('/talents')}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
            <span>Browse Talent</span>
          </button>

          <button className="chat-v2-page__nav-item" onClick={() => router.push('/projects')}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
            <span>My Projects</span>
          </button>

          <button className="chat-v2-page__nav-item" onClick={() => router.push('/auditions')}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Auditions</span>
          </button>
        </nav>

        <div className="chat-v2-page__sidebar-footer">
          <div className="chat-v2-page__user">
            <div className="chat-v2-page__user-avatar">
              <span>CD</span>
            </div>
            <div className="chat-v2-page__user-info">
              <div className="chat-v2-page__user-name">Casting Director</div>
              <div className="chat-v2-page__user-role">Premium Account</div>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Chat Area */}
      <main className="chat-v2-page__main">
        <ChatContainerV2
          conversationId="main"
          title="AI Casting Assistant"
          subtitle="Find perfect talent with AI-powered recommendations"
          onTalentAction={handleTalentAction}
        />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="chat-v2-page__mobile-nav">
        <button className="chat-v2-page__mobile-nav-item chat-v2-page__mobile-nav-item--active">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          <span>Chat</span>
        </button>

        <button className="chat-v2-page__mobile-nav-item" onClick={() => router.push('/talents')}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
          <span>Talent</span>
        </button>

        <button className="chat-v2-page__mobile-nav-item" onClick={() => router.push('/projects')}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
          </svg>
          <span>Projects</span>
        </button>

        <button className="chat-v2-page__mobile-nav-item" onClick={() => router.push('/profile')}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
}
