import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import DashboardPage from '../page';

// Mock the child components
jest.mock('../components/Sidebar', () => {
  return function MockSidebar() {
    return <div data-testid="sidebar">Sidebar</div>;
  };
});

jest.mock('../components/MainContent', () => {
  return function MockMainContent({
    messages,
    input,
    isLoading,
    onInputChange,
    onSendMessage,
    onQuickAction,
  }: any) {
    return (
      <div data-testid="main-content">
        <div data-testid="messages-count">{messages.length}</div>
        <div data-testid="input-value">{input}</div>
        <div data-testid="loading-state">{isLoading.toString()}</div>
        <button onClick={() => onInputChange('test input')}>Change Input</button>
        <button onClick={onSendMessage}>Send Message</button>
        <button onClick={() => onQuickAction?.('find-male-lead')}>
          Quick Action: Find Male Lead
        </button>
        <button onClick={() => onQuickAction?.('schedule-auditions')}>
          Quick Action: Schedule Auditions
        </button>
        <button onClick={() => onQuickAction?.('analyze-script')}>
          Quick Action: Analyze Script
        </button>
        <button onClick={() => onQuickAction?.('budget-planning')}>
          Quick Action: Budget Planning
        </button>
      </div>
    );
  };
});

jest.mock('../components/Shared/MobileMenu', () => {
  return function MockMobileMenu() {
    return <div data-testid="mobile-menu">Mobile Menu</div>;
  };
});

jest.mock('../components/Shared/LiveRegion', () => {
  return function MockLiveRegion({ message }: any) {
    return (
      <div data-testid="live-region" aria-live="polite">
        {message}
      </div>
    );
  };
});

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('DashboardPage - Quick Actions Auto-send', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('Functional Testing', () => {
    it('should auto-send message when "Find Male Lead" quick action is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: 'Here are suitable male lead actors',
          source: 'public_mock_agents',
          talentCards: [],
        }),
      });

      const { getByText, getByTestId } = render(<DashboardPage />);

      // Initially no messages
      expect(getByTestId('messages-count')).toHaveTextContent('0');

      // Click quick action
      fireEvent.click(getByText('Quick Action: Find Male Lead'));

      // Check that input was populated
      expect(getByTestId('input-value')).toHaveTextContent(
        'Find me suitable male lead actors for Mumbai Dreams'
      );

      // Check loading state is true
      expect(getByTestId('loading-state')).toHaveTextContent('true');

      // Wait for API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/conversations/messages',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: 'Find me suitable male lead actors for Mumbai Dreams',
              projectId: 'mumbai-dreams',
            }),
          })
        );
      });

      // Wait for messages to update
      await waitFor(() => {
        expect(getByTestId('messages-count')).toHaveTextContent('2'); // User message + AI response
      });

      // Check loading state is false
      expect(getByTestId('loading-state')).toHaveTextContent('false');

      // Check input was cleared
      expect(getByTestId('input-value')).toHaveTextContent('');
    });

    it('should auto-send message for all quick action types', async () => {
      const quickActions = [
        {
          button: 'Quick Action: Schedule Auditions',
          message: 'Help me schedule auditions for this week',
        },
        {
          button: 'Quick Action: Analyze Script',
          message: 'Analyze the script and suggest character requirements',
        },
        {
          button: 'Quick Action: Budget Planning',
          message: 'Help me plan the casting budget for this project',
        },
      ];

      for (const action of quickActions) {
        mockFetch.mockClear();
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            content: 'AI response',
            source: 'public_mock_agents',
            talentCards: [],
          }),
        });

        const { getByText, getByTestId } = render(<DashboardPage />);

        fireEvent.click(getByText(action.button));

        expect(getByTestId('input-value')).toHaveTextContent(action.message);

        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalledWith(
            '/api/conversations/messages',
            expect.objectContaining({
              body: expect.stringContaining(action.message),
            })
          );
        });
      }
    });

    it('should populate and clear input field during quick action process', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: 'AI response',
          source: 'public_mock_agents',
        }),
      });

      const { getByText, getByTestId } = render(<DashboardPage />);

      // Initially empty
      expect(getByTestId('input-value')).toHaveTextContent('');

      // Click quick action
      fireEvent.click(getByText('Quick Action: Find Male Lead'));

      // Input should be populated
      expect(getByTestId('input-value')).toHaveTextContent(
        'Find me suitable male lead actors for Mumbai Dreams'
      );

      // Wait for process to complete
      await waitFor(() => {
        expect(getByTestId('loading-state')).toHaveTextContent('false');
      });

      // Input should be cleared
      expect(getByTestId('input-value')).toHaveTextContent('');
    });
  });

  describe('Error Handling Testing', () => {
    it('should handle API failure gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { getByText, getByTestId } = render(<DashboardPage />);

      fireEvent.click(getByText('Quick Action: Find Male Lead'));

      await waitFor(() => {
        expect(getByTestId('messages-count')).toHaveTextContent('2'); // User message + error message
      });

      expect(getByTestId('loading-state')).toHaveTextContent('false');
      expect(getByTestId('live-region')).toHaveTextContent(
        'Error occurred while sending message. Please try again.'
      );
    });

    it('should fall back from authenticated to public endpoint on auth failure', async () => {
      // Mock user as authenticated (temporarily set for this test)
      const originalUser = (DashboardPage as any).user;
      (DashboardPage as any).user = { id: 'test-user' };

      // First call fails (authenticated endpoint)
      mockFetch.mockRejectedValueOnce(new Error('Auth failed'));

      // Second call succeeds (public endpoint)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: 'Fallback response',
          source: 'fallback_mock_agents',
        }),
      });

      const { getByText, getByTestId } = render(<DashboardPage />);

      fireEvent.click(getByText('Quick Action: Find Male Lead'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      // Should have called both endpoints
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        '/api/conversations/protected',
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        '/api/conversations/messages',
        expect.any(Object)
      );

      // Reset user
      (DashboardPage as any).user = originalUser;
    });

    it('should display appropriate error message when API returns error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      });

      const { getByText, getByTestId } = render(<DashboardPage />);

      fireEvent.click(getByText('Quick Action: Find Male Lead'));

      await waitFor(() => {
        expect(getByTestId('loading-state')).toHaveTextContent('false');
      });

      expect(getByTestId('live-region')).toHaveTextContent(
        'Error occurred while sending message. Please try again.'
      );
    });
  });

  describe('State Management Testing', () => {
    it('should update message state correctly during quick action', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: 'AI response',
          source: 'public_mock_agents',
          talentCards: [{ id: '1', name: 'Actor 1' }],
        }),
      });

      const { getByText, getByTestId } = render(<DashboardPage />);

      expect(getByTestId('messages-count')).toHaveTextContent('0');

      fireEvent.click(getByText('Quick Action: Find Male Lead'));

      // Should add user message immediately
      await waitFor(() => {
        expect(Number(getByTestId('messages-count').textContent)).toBeGreaterThanOrEqual(1);
      });

      // Should add AI response after API call
      await waitFor(() => {
        expect(getByTestId('messages-count')).toHaveTextContent('2');
      });
    });

    it('should update loading state correctly during quick action', async () => {
      let resolvePromise: any;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce({
        ok: true,
        json: () => promise,
      });

      const { getByText, getByTestId } = render(<DashboardPage />);

      expect(getByTestId('loading-state')).toHaveTextContent('false');

      fireEvent.click(getByText('Quick Action: Find Male Lead'));

      // Should set loading to true immediately
      expect(getByTestId('loading-state')).toHaveTextContent('true');

      // Resolve the promise
      resolvePromise({
        content: 'AI response',
        source: 'public_mock_agents',
      });

      // Should set loading to false after completion
      await waitFor(() => {
        expect(getByTestId('loading-state')).toHaveTextContent('false');
      });
    });

    it('should update live region announcements during quick action', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: 'AI response',
          source: 'public_mock_agents',
        }),
      });

      const { getByText, getByTestId } = render(<DashboardPage />);

      fireEvent.click(getByText('Quick Action: Find Male Lead'));

      // Should announce sending message
      expect(getByTestId('live-region')).toHaveTextContent('Sending message...');

      // Should announce when using public agents
      await waitFor(() => {
        expect(getByTestId('live-region')).toHaveTextContent(
          expect.stringContaining('Using public agents')
        );
      });

      // Should announce when response received
      await waitFor(() => {
        expect(getByTestId('live-region')).toHaveTextContent(
          expect.stringContaining('AI response received')
        );
      });
    });
  });

  describe('Integration Testing', () => {
    it('should handle rapid consecutive quick action clicks', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            content: `Response ${callCount}`,
            source: 'public_mock_agents',
          }),
        });
      });

      const { getByText } = render(<DashboardPage />);

      // Click multiple quick actions rapidly
      fireEvent.click(getByText('Quick Action: Find Male Lead'));
      fireEvent.click(getByText('Quick Action: Schedule Auditions'));

      // Both should be processed
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    it('should work correctly with different project contexts', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: 'AI response',
          source: 'public_mock_agents',
        }),
      });

      const { getByText } = render(<DashboardPage />);

      fireEvent.click(getByText('Quick Action: Find Male Lead'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/conversations/messages',
          expect.objectContaining({
            body: expect.stringContaining('"projectId":"mumbai-dreams"'),
          })
        );
      });
    });
  });

  describe('Accessibility Testing', () => {
    it('should announce status updates to screen readers via live region', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: 'AI response',
          source: 'public_mock_agents',
        }),
      });

      const { getByText, getByTestId } = render(<DashboardPage />);

      const liveRegion = getByTestId('live-region');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');

      fireEvent.click(getByText('Quick Action: Find Male Lead'));

      // Check that live region updates are announced
      expect(liveRegion.textContent).toBeTruthy();

      await waitFor(() => {
        expect(liveRegion.textContent).toContain('AI response received');
      });
    });

    it('should maintain keyboard navigation during quick action process', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: 'AI response',
          source: 'public_mock_agents',
        }),
      });

      const { getByText } = render(<DashboardPage />);

      const quickActionButton = getByText('Quick Action: Find Male Lead');

      // Simulate keyboard activation
      fireEvent.keyDown(quickActionButton, { key: 'Enter' });
      fireEvent.click(quickActionButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });
});
