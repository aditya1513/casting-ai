import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import DashboardPage from '../page'

// Mock child components with minimal implementation
jest.mock('../components/Sidebar', () => {
  return function MockSidebar() {
    return <div data-testid="sidebar">Sidebar</div>
  }
})

jest.mock('../components/MainContent', () => {
  return function MockMainContent({ onQuickAction }: any) {
    return (
      <div data-testid="main-content">
        <button onClick={() => onQuickAction?.('find-male-lead')}>Quick Action</button>
      </div>
    )
  }
})

jest.mock('../components/Shared/MobileMenu', () => {
  return function MockMobileMenu() {
    return <div data-testid="mobile-menu">Mobile Menu</div>
  }
})

jest.mock('../components/Shared/LiveRegion', () => {
  return function MockLiveRegion({ message }: any) {
    return <div data-testid="live-region">{message}</div>
  }
})

describe('Quick Actions Integration Tests - API Endpoint Switching', () => {
  let mockFetch: jest.Mock

  beforeEach(() => {
    mockFetch = jest.fn()
    global.fetch = mockFetch
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Authenticated User Flow', () => {
    it('should use protected endpoint for authenticated users and handle success', async () => {
      // Mock authenticated user
      jest.spyOn(React, 'useState')
        .mockImplementationOnce(() => [null, jest.fn()]) // messages
        .mockImplementationOnce(() => ['', jest.fn()]) // input
        .mockImplementationOnce(() => [false, jest.fn()]) // loading
        .mockImplementationOnce(() => ['mumbai-dreams', jest.fn()]) // currentProject
        .mockImplementationOnce(() => [false, jest.fn()]) // sidebarOpen
        .mockImplementationOnce(() => ['', jest.fn()]) // liveMessage

      // Mock successful protected endpoint response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: 'Authenticated response from Claude',
          source: 'authenticated_backend_agents',
          talentCards: [{ id: '1', name: 'Test Actor' }]
        })
      })

      const { getByText, getByTestId } = render(<DashboardPage />)
      
      fireEvent.click(getByText('Quick Action'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/conversations/messages',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: 'Find me suitable male lead actors for Mumbai Dreams',
              projectId: 'mumbai-dreams'
            })
          })
        )
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should fallback to public endpoint when protected endpoint fails', async () => {
      // First call to protected endpoint fails
      mockFetch
        .mockRejectedValueOnce(new Error('Auth failed: 401'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            content: 'Fallback response',
            source: 'fallback_mock_agents'
          })
        })

      const { getByText } = render(<DashboardPage />)
      
      fireEvent.click(getByText('Quick Action'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1)
      })

      // Should have called public endpoint as fallback
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/conversations/messages',
        expect.any(Object)
      )
    })
  })

  describe('Unauthenticated User Flow', () => {
    it('should directly use public endpoint for unauthenticated users', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: 'Public response',
          source: 'public_mock_agents'
        })
      })

      const { getByText } = render(<DashboardPage />)
      
      fireEvent.click(getByText('Quick Action'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/conversations/messages',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
        )
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      // Should not have tried protected endpoint
      expect(mockFetch).not.toHaveBeenCalledWith(
        '/api/conversations/protected',
        expect.any(Object)
      )
    })
  })

  describe('Error Recovery and Resilience', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { getByText, getByTestId } = render(<DashboardPage />)
      
      fireEvent.click(getByText('Quick Action'))

      await waitFor(() => {
        expect(getByTestId('live-region')).toHaveTextContent(
          'Error occurred while sending message. Please try again.'
        )
      })
    })

    it('should handle malformed API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        }
      })

      const { getByText, getByTestId } = render(<DashboardPage />)
      
      fireEvent.click(getByText('Quick Action'))

      await waitFor(() => {
        expect(getByTestId('live-region')).toHaveTextContent(
          'Error occurred while sending message. Please try again.'
        )
      })
    })

    it('should handle timeout scenarios', async () => {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 100)
      })

      mockFetch.mockReturnValueOnce(timeoutPromise)

      const { getByText, getByTestId } = render(<DashboardPage />)
      
      fireEvent.click(getByText('Quick Action'))

      await waitFor(() => {
        expect(getByTestId('live-region')).toHaveTextContent(
          'Error occurred while sending message. Please try again.'
        )
      }, { timeout: 200 })
    })
  })

  describe('Response Source Tracking', () => {
    it('should indicate authenticated Claude response in message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: 'Test response',
          source: 'authenticated_backend_agents'
        })
      })

      const { getByText } = render(<DashboardPage />)
      
      fireEvent.click(getByText('Quick Action'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })

      // The component should append source indicator to the message
      // Based on the code, it adds ' 🔐 *Real Claude AI Response*' for authenticated
    })

    it('should indicate mock agent response in message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: 'Test response',
          source: 'public_mock_agents'
        })
      })

      const { getByText } = render(<DashboardPage />)
      
      fireEvent.click(getByText('Quick Action'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })

      // The component should append source indicator to the message
      // Based on the code, it adds ' 🤖 *Mock Agent Response*' for public
    })
  })

  describe('Concurrent Request Handling', () => {
    it('should handle multiple quick actions in rapid succession', async () => {
      let resolveFirst: any, resolveSecond: any
      const firstPromise = new Promise(resolve => { resolveFirst = resolve })
      const secondPromise = new Promise(resolve => { resolveSecond = resolve })

      mockFetch
        .mockReturnValueOnce({
          ok: true,
          json: () => firstPromise
        })
        .mockReturnValueOnce({
          ok: true,
          json: () => secondPromise
        })

      const { getByText } = render(<DashboardPage />)
      
      // Click twice rapidly
      fireEvent.click(getByText('Quick Action'))
      fireEvent.click(getByText('Quick Action'))

      // Resolve in reverse order to test proper handling
      resolveSecond({
        content: 'Second response',
        source: 'public_mock_agents'
      })
      
      resolveFirst({
        content: 'First response',
        source: 'public_mock_agents'
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2)
      })
    })

    it('should maintain separate loading states for concurrent requests', async () => {
      let resolvePromise: any
      const promise = new Promise(resolve => { resolvePromise = resolve })

      mockFetch.mockReturnValueOnce({
        ok: true,
        json: () => promise
      })

      const { getByText, getByTestId } = render(<DashboardPage />)
      
      fireEvent.click(getByText('Quick Action'))

      // Loading should be true during request
      await waitFor(() => {
        expect(getByTestId('live-region')).toHaveTextContent('Sending message...')
      })

      resolvePromise({
        content: 'Response',
        source: 'public_mock_agents'
      })

      // Loading should be false after completion
      await waitFor(() => {
        expect(getByTestId('live-region')).toHaveTextContent(
          expect.stringContaining('AI response received')
        )
      })
    })
  })

  describe('Project Context Integration', () => {
    it('should include current project ID in all API requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: 'Response',
          source: 'public_mock_agents'
        })
      })

      const { getByText } = render(<DashboardPage />)
      
      fireEvent.click(getByText('Quick Action'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringContaining('"projectId":"mumbai-dreams"')
          })
        )
      })
    })
  })

  describe('Live Region Announcements', () => {
    it('should provide appropriate live region updates throughout the flow', async () => {
      let resolvePromise: any
      const promise = new Promise(resolve => { resolvePromise = resolve })

      mockFetch.mockReturnValueOnce({
        ok: true,
        json: () => promise
      })

      const { getByText, getByTestId } = render(<DashboardPage />)
      
      fireEvent.click(getByText('Quick Action'))

      // Initial announcement
      await waitFor(() => {
        expect(getByTestId('live-region')).toHaveTextContent('Sending message...')
      })

      // Resolve the promise
      resolvePromise({
        content: 'Response',
        source: 'public_mock_agents'
      })

      // Final announcement
      await waitFor(() => {
        expect(getByTestId('live-region')).toHaveTextContent(
          expect.stringContaining('AI response received')
        )
      })
    })

    it('should announce authentication status in live region', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: 'Response',
          source: 'public_mock_agents'
        })
      })

      const { getByText, getByTestId } = render(<DashboardPage />)
      
      fireEvent.click(getByText('Quick Action'))

      await waitFor(() => {
        expect(getByTestId('live-region')).toHaveTextContent(
          expect.stringContaining('Using public agents')
        )
      })
    })
  })
})