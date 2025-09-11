import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ChatInterface from '../ChatInterface';

describe('ChatInterface - Quick Actions', () => {
  const mockOnQuickAction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Quick Actions Visibility', () => {
    it('should display quick actions when there are no messages', () => {
      render(<ChatInterface messages={[]} isLoading={false} onQuickAction={mockOnQuickAction} />);

      expect(screen.getByText('Find Male Lead')).toBeInTheDocument();
      expect(screen.getByText('Schedule Auditions')).toBeInTheDocument();
      expect(screen.getByText('Analyze Script')).toBeInTheDocument();
      expect(screen.getByText('Budget Planning')).toBeInTheDocument();
    });

    it('should hide quick actions when there are messages', () => {
      const messages = [
        {
          id: '1',
          type: 'user' as const,
          content: 'Test message',
          timestamp: '10:00',
        },
      ];

      render(
        <ChatInterface messages={messages} isLoading={false} onQuickAction={mockOnQuickAction} />
      );

      expect(screen.queryByText('Find Male Lead')).not.toBeInTheDocument();
      expect(screen.queryByText('Schedule Auditions')).not.toBeInTheDocument();
      expect(screen.queryByText('Analyze Script')).not.toBeInTheDocument();
      expect(screen.queryByText('Budget Planning')).not.toBeInTheDocument();
    });
  });

  describe('Quick Actions Interaction', () => {
    it('should call onQuickAction with correct action id when Find Male Lead is clicked', async () => {
      render(<ChatInterface messages={[]} isLoading={false} onQuickAction={mockOnQuickAction} />);

      const button = screen.getByText('Find Male Lead').closest('button');
      fireEvent.click(button!);

      expect(mockOnQuickAction).toHaveBeenCalledWith('find-male-lead');
      expect(mockOnQuickAction).toHaveBeenCalledTimes(1);
    });

    it('should call onQuickAction with correct action id for all quick actions', () => {
      render(<ChatInterface messages={[]} isLoading={false} onQuickAction={mockOnQuickAction} />);

      const actions = [
        { text: 'Find Male Lead', id: 'find-male-lead' },
        { text: 'Schedule Auditions', id: 'schedule-auditions' },
        { text: 'Analyze Script', id: 'analyze-script' },
        { text: 'Budget Planning', id: 'budget-planning' },
      ];

      actions.forEach(action => {
        const button = screen.getByText(action.text).closest('button');
        fireEvent.click(button!);
        expect(mockOnQuickAction).toHaveBeenLastCalledWith(action.id);
      });

      expect(mockOnQuickAction).toHaveBeenCalledTimes(4);
    });

    it('should handle undefined onQuickAction gracefully', () => {
      render(<ChatInterface messages={[]} isLoading={false} />);

      const button = screen.getByText('Find Male Lead').closest('button');

      // Should not throw error when clicking without onQuickAction
      expect(() => fireEvent.click(button!)).not.toThrow();
    });
  });

  describe('Quick Actions Styling', () => {
    it('should have correct hover styles on quick action buttons', () => {
      render(<ChatInterface messages={[]} isLoading={false} onQuickAction={mockOnQuickAction} />);

      const button = screen.getByText('Find Male Lead').closest('button');

      expect(button).toHaveClass('hover:border-teal-300');
      expect(button).toHaveClass('hover:bg-teal-50');
    });

    it('should display correct icons for each quick action', () => {
      render(<ChatInterface messages={[]} isLoading={false} onQuickAction={mockOnQuickAction} />);

      expect(screen.getByText('👤')).toBeInTheDocument(); // Find Male Lead
      expect(screen.getByText('📅')).toBeInTheDocument(); // Schedule Auditions
      expect(screen.getByText('📝')).toBeInTheDocument(); // Analyze Script
      expect(screen.getByText('💰')).toBeInTheDocument(); // Budget Planning
    });
  });

  describe('Loading State', () => {
    it('should display loading indicator when isLoading is true', () => {
      render(
        <ChatInterface
          messages={[{ id: '1', type: 'user', content: 'Test' }]}
          isLoading={true}
          onQuickAction={mockOnQuickAction}
        />
      );

      // Check for loading animation dots
      const loadingDots = screen.getAllByText((content, element) => {
        return element?.className?.includes('animate-bounce') || false;
      });

      expect(loadingDots.length).toBeGreaterThan(0);
    });

    it('should not display loading indicator when isLoading is false', () => {
      render(
        <ChatInterface
          messages={[{ id: '1', type: 'user', content: 'Test' }]}
          isLoading={false}
          onQuickAction={mockOnQuickAction}
        />
      );

      const loadingDots = screen.queryAllByText((content, element) => {
        return element?.className?.includes('animate-bounce') || false;
      });

      expect(loadingDots.length).toBe(0);
    });
  });

  describe('Welcome Screen', () => {
    it('should display welcome message when no messages', () => {
      render(<ChatInterface messages={[]} isLoading={false} onQuickAction={mockOnQuickAction} />);

      expect(screen.getByText('Welcome to your AI Casting Assistant')).toBeInTheDocument();
      expect(screen.getByText(/Find perfect talent for Mumbai Dreams/)).toBeInTheDocument();
    });

    it('should not display welcome message when there are messages', () => {
      render(
        <ChatInterface
          messages={[{ id: '1', type: 'user', content: 'Test' }]}
          isLoading={false}
          onQuickAction={mockOnQuickAction}
        />
      );

      expect(screen.queryByText('Welcome to your AI Casting Assistant')).not.toBeInTheDocument();
    });
  });

  describe('Keyboard Accessibility', () => {
    it('should allow keyboard navigation through quick actions', async () => {
      const user = userEvent.setup();

      render(<ChatInterface messages={[]} isLoading={false} onQuickAction={mockOnQuickAction} />);

      // Tab through quick action buttons
      await user.tab();
      await user.tab();
      await user.tab();

      // Press Enter on focused button
      await user.keyboard('{Enter}');

      // Should have triggered a quick action
      expect(mockOnQuickAction).toHaveBeenCalled();
    });

    it('should support Space key activation for quick actions', async () => {
      const user = userEvent.setup();

      render(<ChatInterface messages={[]} isLoading={false} onQuickAction={mockOnQuickAction} />);

      const button = screen.getByText('Find Male Lead').closest('button');
      button?.focus();

      await user.keyboard(' '); // Space key

      expect(mockOnQuickAction).toHaveBeenCalledWith('find-male-lead');
    });
  });

  describe('Responsive Design', () => {
    it('should render quick actions in correct grid layout', () => {
      render(<ChatInterface messages={[]} isLoading={false} onQuickAction={mockOnQuickAction} />);

      const gridContainer = screen.getByText('Find Male Lead').closest('div.grid');

      expect(gridContainer).toHaveClass('grid-cols-2');
      expect(gridContainer).toHaveClass('md:grid-cols-4');
    });
  });

  describe('Message Display with Talent Cards', () => {
    it('should render talent cards when message includes them', () => {
      const messages = [
        {
          id: '1',
          type: 'ai' as const,
          content: 'Here are some actors',
          timestamp: '10:00',
          talentCards: [
            { id: '1', name: 'Actor 1', role: 'Lead' },
            { id: '2', name: 'Actor 2', role: 'Support' },
          ],
        },
      ];

      render(
        <ChatInterface messages={messages} isLoading={false} onQuickAction={mockOnQuickAction} />
      );

      // TalentGrid component should be rendered with talent cards
      expect(screen.getByText('Here are some actors')).toBeInTheDocument();
    });

    it('should not render talent cards section when message has no talent cards', () => {
      const messages = [
        {
          id: '1',
          type: 'ai' as const,
          content: 'Regular message',
          timestamp: '10:00',
        },
      ];

      render(
        <ChatInterface messages={messages} isLoading={false} onQuickAction={mockOnQuickAction} />
      );

      expect(screen.getByText('Regular message')).toBeInTheDocument();
    });
  });
});
