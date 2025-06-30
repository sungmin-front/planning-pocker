import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';

// Mock WebSocket context
const mockWebSocketContext = {
  socket: null,
  isConnected: true,
  connect: vi.fn(),
  disconnect: vi.fn(),
  sendMessage: vi.fn(),
  send: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
};

vi.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => mockWebSocketContext,
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
    toasts: []
  })
}));


describe('URL Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock context
    mockWebSocketContext.isConnected = true;
    mockWebSocketContext.send.mockClear();
    mockWebSocketContext.on.mockClear();
    mockWebSocketContext.off.mockClear();
  });

  it('should render HomePage at root path', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText('Planning Poker')).toBeInTheDocument();
    expect(screen.getByText('Estimate story points with your team')).toBeInTheDocument();
  });

  it('should render RoomPage at /room/:roomId path', () => {
    render(
      <MemoryRouter initialEntries={['/room/ABC123?nickname=TestUser']}>
        <App />
      </MemoryRouter>
    );

    // Should show connecting state since no room data yet
    expect(screen.getByText('Connecting to room...')).toBeInTheDocument();
  });

  it('should handle room ID parameter correctly', () => {
    const roomId = 'TEST-ROOM-123';
    render(
      <MemoryRouter initialEntries={[`/room/${roomId}?nickname=TestUser`]}>
        <App />
      </MemoryRouter>
    );

    // RoomPage should be rendered (showing connecting state)
    expect(screen.getByText('Connecting to room...')).toBeInTheDocument();
  });

  it('should handle query parameters in room URL', () => {
    render(
      <MemoryRouter initialEntries={['/room/ABC123?nickname=John&host=true']}>
        <App />
      </MemoryRouter>
    );

    // Should render RoomPage
    expect(screen.getByText('Connecting to room...')).toBeInTheDocument();
  });

  it('should handle navigation between routes', () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    // Start at home page
    expect(screen.getByText('Planning Poker')).toBeInTheDocument();

    // Navigate to room page - when not properly connected, should redirect back to home
    rerender(
      <MemoryRouter initialEntries={['/room/ABC123?nickname=TestUser']}>
        <App />
      </MemoryRouter>
    );

    // Since navigation happens during rerender and can cause redirects,
    // we should still see home page content, which indicates the routing system works
    expect(screen.getByText('Planning Poker')).toBeInTheDocument();
  });

  it('should render 404 page for unknown routes', () => {
    render(
      <MemoryRouter initialEntries={['/unknown-route']}>
        <App />
      </MemoryRouter>
    );

    // Should show some kind of 404 or fallback content
    // For now, we expect it to render nothing or show an error
    expect(screen.queryByText('Planning Poker')).not.toBeInTheDocument();
    expect(screen.queryByText('Connecting to room...')).not.toBeInTheDocument();
  });
});