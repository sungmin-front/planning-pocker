import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';

// Mock the socket module
vi.mock('@/socket', () => {
  const mockInstance = {
    configure: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    send: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    isConnected: vi.fn().mockReturnValue(true),
    getConnectionState: vi.fn().mockReturnValue(1)
  };

  return {
    getWebSocketInstance: vi.fn().mockReturnValue(mockInstance)
  };
});

// Mock environment variables
vi.stubGlobal('import', {
  meta: {
    env: {
      VITE_WEBSOCKET_URL: 'ws://localhost:8080'
    }
  }
});

describe('URL Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    // Navigate to room page
    rerender(
      <MemoryRouter initialEntries={['/room/ABC123?nickname=TestUser']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText('Connecting to room...')).toBeInTheDocument();
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