import { describe, it, expect, beforeEach } from 'vitest'
import type { UIMessage } from 'ai'
import { saveMessages, loadMessages } from '@/lib/chat/persistence'

const mockMessages: UIMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    parts: [{ type: 'text', text: 'I want a flat in Zurich' }],
  },
  {
    id: 'msg-2',
    role: 'assistant',
    parts: [{ type: 'text', text: 'Great! What is your budget?' }],
  },
]

describe('chat persistence', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('saveMessages writes JSON-serialized messages to sessionStorage with key chat-{profileId}', () => {
    saveMessages('profile-abc', mockMessages)
    const stored = sessionStorage.getItem('chat-profile-abc')
    expect(stored).not.toBeNull()
    expect(JSON.parse(stored!)).toEqual(mockMessages)
  })

  it('loadMessages returns parsed messages from sessionStorage for the given profileId', () => {
    sessionStorage.setItem('chat-profile-abc', JSON.stringify(mockMessages))
    const result = loadMessages('profile-abc')
    expect(result).toEqual(mockMessages)
  })

  it('loadMessages returns empty array when no stored messages exist', () => {
    const result = loadMessages('nonexistent-profile')
    expect(result).toEqual([])
  })

  it('loadMessages returns empty array when sessionStorage contains invalid JSON', () => {
    sessionStorage.setItem('chat-profile-bad', '{invalid json!!!')
    const result = loadMessages('profile-bad')
    expect(result).toEqual([])
  })

  it('saveMessages does not write when messages array is empty', () => {
    saveMessages('profile-empty', [])
    const stored = sessionStorage.getItem('chat-profile-empty')
    expect(stored).toBeNull()
  })
})
