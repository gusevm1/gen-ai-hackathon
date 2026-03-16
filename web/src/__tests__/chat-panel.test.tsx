import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock @ai-sdk/react useChat
vi.mock('@ai-sdk/react', () => ({
  useChat: () => ({
    messages: [],
    setMessages: vi.fn(),
    sendMessage: vi.fn(),
    status: 'ready' as const,
    id: 'test-chat-id',
    error: undefined,
    regenerate: vi.fn(),
    stop: vi.fn(),
    resumeStream: vi.fn(),
    addToolResult: vi.fn(),
    addToolOutput: vi.fn(),
    addToolApprovalResponse: vi.fn(),
    clearError: vi.fn(),
  }),
}))

// Mock 'ai' module for DefaultChatTransport
vi.mock('ai', () => ({
  DefaultChatTransport: vi.fn().mockImplementation(() => ({})),
}))

// Mock persistence (already tested separately)
vi.mock('@/lib/chat/persistence', () => ({
  saveMessages: vi.fn(),
  loadMessages: vi.fn().mockReturnValue([]),
}))

import { ChatPanel } from '@/components/chat/chat-panel'

describe('ChatPanel', () => {
  const defaultProps = {
    profileId: 'test-profile-id',
    onFieldsExtracted: vi.fn(),
  }

  it('renders a toggle button with "Chat with AI" text when closed', () => {
    render(<ChatPanel {...defaultProps} />)
    expect(screen.getByText('Chat with AI')).toBeDefined()
  })

  it('clicking the toggle button opens the chat panel with header', () => {
    render(<ChatPanel {...defaultProps} />)
    fireEvent.click(screen.getByText('Chat with AI'))
    expect(screen.getByText('Preference Discovery Chat')).toBeDefined()
  })

  it('clicking the X close button hides the chat panel', () => {
    render(<ChatPanel {...defaultProps} />)
    // Open panel
    fireEvent.click(screen.getByText('Chat with AI'))
    expect(screen.getByText('Preference Discovery Chat')).toBeDefined()

    // Close panel
    const closeButton = screen.getByLabelText('Close chat')
    fireEvent.click(closeButton)

    // Header should be gone, toggle button should be back
    expect(screen.queryByText('Preference Discovery Chat')).toBeNull()
    expect(screen.getByText('Chat with AI')).toBeDefined()
  })

  it('renders ChatMessages and ChatInput when open', () => {
    render(<ChatPanel {...defaultProps} />)
    fireEvent.click(screen.getByText('Chat with AI'))

    // ChatMessages shows empty state
    expect(screen.getByText('Start chatting to discover your preferences')).toBeDefined()
    // ChatInput shows input
    expect(screen.getByPlaceholderText('Ask about your ideal home...')).toBeDefined()
  })
})
