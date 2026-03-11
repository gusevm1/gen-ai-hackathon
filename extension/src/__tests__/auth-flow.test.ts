import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleMessage, type AuthMessage } from '../entrypoints/background';

// Mock the supabase module
vi.mock('@/lib/supabase', () => {
  const mockAuth = {
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    getUser: vi.fn(),
  };
  return {
    supabase: { auth: mockAuth },
  };
});

// Import the mocked module
import { supabase } from '@/lib/supabase';

const mockAuth = supabase.auth as unknown as {
  signInWithPassword: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
  getSession: ReturnType<typeof vi.fn>;
  getUser: ReturnType<typeof vi.fn>;
};

describe('extension auth message flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('signIn message returns session data on success', async () => {
    const mockSession = {
      user: { id: 'user-1', email: 'test@example.com' },
      access_token: 'jwt-token',
    };
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { session: mockSession, user: mockSession.user },
      error: null,
    });

    const result = await handleMessage({
      action: 'signIn',
      credentials: { email: 'test@example.com', password: 'password123' },
    });

    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result).toEqual({
      data: { session: mockSession, user: mockSession.user },
      error: null,
    });
  });

  it('signIn message returns error on invalid credentials', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials' },
    });

    const result = await handleMessage({
      action: 'signIn',
      credentials: { email: 'wrong@example.com', password: 'bad' },
    });

    expect(result).toEqual({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials' },
    });
  });

  it('getSession message returns current session', async () => {
    const mockSession = {
      user: { id: 'user-1', email: 'test@example.com' },
      access_token: 'jwt-token',
    };
    mockAuth.getSession.mockResolvedValue({
      data: { session: mockSession },
    });

    const result = await handleMessage({ action: 'getSession' });

    expect(mockAuth.getSession).toHaveBeenCalled();
    expect(result).toEqual({ session: mockSession });
  });

  it('signOut message clears session', async () => {
    mockAuth.signOut.mockResolvedValue({ error: null });

    const result = await handleMessage({ action: 'signOut' });

    expect(mockAuth.signOut).toHaveBeenCalled();
    expect(result).toEqual({ error: null });
  });

  it('getUser message returns authenticated user', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };
    mockAuth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const result = await handleMessage({ action: 'getUser' });

    expect(mockAuth.getUser).toHaveBeenCalled();
    expect(result).toEqual({ user: mockUser, error: null });
  });
});
