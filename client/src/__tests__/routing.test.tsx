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

  it('should render RoomPage at /:roomId path', () => {
    render(
      <MemoryRouter initialEntries={['/ABC123?nickname=TestUser']}>
        <App />
      </MemoryRouter>
    );

    // Should show nickname input form since no room/currentPlayer data yet
    expect(screen.getByText('Join Room ABC123')).toBeInTheDocument();
  });

  it('should handle room ID parameter correctly', () => {
    const roomId = 'TEST-ROOM-123';
    render(
      <MemoryRouter initialEntries={[`/${roomId}?nickname=TestUser`]}>
        <App />
      </MemoryRouter>
    );

    // RoomPage should be rendered (showing nickname input form)
    expect(screen.getByText(`Join Room ${roomId}`)).toBeInTheDocument();
  });

  it('should handle query parameters in room URL', () => {
    render(
      <MemoryRouter initialEntries={['/ABC123?nickname=John&host=true']}>
        <App />
      </MemoryRouter>
    );

    // Should render RoomPage with nickname input form
    expect(screen.getByText('Join Room ABC123')).toBeInTheDocument();
  });

  it('should handle navigation between routes', () => {
    // Start at room page - should show nickname input form
    render(
      <MemoryRouter initialEntries={['/ABC123?nickname=TestUser']}>
        <App />
      </MemoryRouter>
    );

    // Should show RoomPage with nickname input form
    expect(screen.getByText('Join Room ABC123')).toBeInTheDocument();
  });

  it('should treat unknown routes as room IDs', () => {
    render(
      <MemoryRouter initialEntries={['/unknown-route']}>
        <App />
      </MemoryRouter>
    );

    // Since we use /:roomId as catch-all, should render RoomPage with the unknown route as roomId
    expect(screen.getByText('Join Room unknown-route')).toBeInTheDocument();
    expect(screen.queryByText('Planning Poker')).not.toBeInTheDocument();
  });
});