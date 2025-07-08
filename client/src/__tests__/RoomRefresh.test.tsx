import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RoomPage } from '../pages/RoomPage';
import { RoomProvider } from '../contexts/RoomContext';
import { WebSocketProvider } from '../contexts/WebSocketContext';

// Mock WebSocket
const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.OPEN,
};

// Mock socket implementation
vi.mock('../socket', () => ({
  getWebSocketInstance: vi.fn(() => ({
    configure: vi.fn(),
    connect: vi.fn().mockResolvedValue(void 0),
    disconnect: vi.fn(),
    send: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    once: vi.fn(),
    isConnected: vi.fn(() => true),
    getConnectionState: vi.fn(() => WebSocket.OPEN),
    destroy: vi.fn(),
  })),
  WebSocketSingleton: vi.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Room Refresh Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  const renderRoomPage = (roomId: string, nickname?: string) => {
    const path = nickname ? `/room/${roomId}?nickname=${nickname}` : `/room/${roomId}`;
    
    return render(
      <MemoryRouter initialEntries={[path]}>
        <WebSocketProvider>
          <RoomProvider>
            <RoomPage />
          </RoomProvider>
        </WebSocketProvider>
      </MemoryRouter>
    );
  };

  describe('Session Persistence', () => {
    it('should save room session to localStorage when user joins a room', async () => {
      renderRoomPage('TEST123', 'TestUser');

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'planning-poker-session',
          expect.stringContaining('"roomId":"TEST123"')
        );
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'planning-poker-session',
          expect.stringContaining('"nickname":"TestUser"')
        );
      });
    });

    it('should restore room session from localStorage on page refresh', async () => {
      const sessionData = {
        roomId: 'TEST123',
        nickname: 'TestUser',
        timestamp: Date.now(),
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(sessionData));

      renderRoomPage('TEST123');

      await waitFor(() => {
        // Should not show join form when session exists
        expect(screen.queryByText('Join Room')).not.toBeInTheDocument();
        // Should show room content
        expect(screen.getByText('TEST123')).toBeInTheDocument();
      });
    });

    it('should clear expired session data', async () => {
      const expiredSessionData = {
        roomId: 'TEST123',
        nickname: 'TestUser',
        timestamp: Date.now() - (2 * 60 * 60 * 1000), // 2 hours ago
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredSessionData));

      renderRoomPage('TEST123');

      await waitFor(() => {
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('planning-poker-session');
        // Should show join form for expired session
        expect(screen.getByText('Join Room')).toBeInTheDocument();
      });
    });
  });

  describe('WebSocket Reconnection', () => {
    it('should attempt to rejoin room on WebSocket reconnection', async () => {
      const sessionData = {
        roomId: 'TEST123',
        nickname: 'TestUser',
        timestamp: Date.now(),
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(sessionData));

      renderRoomPage('TEST123');

      await waitFor(() => {
        // Should trigger room rejoin message
        expect(mockWebSocket.send).toHaveBeenCalled();
      });
    });

    it('should handle room rejoin failure gracefully', async () => {
      const sessionData = {
        roomId: 'NONEXISTENT',
        nickname: 'TestUser',
        timestamp: Date.now(),
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(sessionData));

      renderRoomPage('NONEXISTENT');

      await waitFor(() => {
        // Should clear invalid session and show join form
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('planning-poker-session');
        expect(screen.getByText('Join Room')).toBeInTheDocument();
      });
    });
  });

  describe('URL State Management', () => {
    it('should preserve nickname in URL when navigating within room', async () => {
      renderRoomPage('TEST123', 'TestUser');

      await waitFor(() => {
        // URL should maintain nickname parameter
        expect(window.location.search).toContain('nickname=TestUser');
      });
    });

    it('should auto-populate nickname from session when missing from URL', async () => {
      const sessionData = {
        roomId: 'TEST123',
        nickname: 'TestUser',
        timestamp: Date.now(),
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(sessionData));

      renderRoomPage('TEST123'); // No nickname in URL

      await waitFor(() => {
        // Should auto-populate from session
        expect(screen.queryByDisplayValue('TestUser')).toBeInTheDocument();
      });
    });
  });

  describe('Cross-tab Synchronization', () => {
    it('should handle localStorage changes from other tabs', async () => {
      renderRoomPage('TEST123', 'TestUser');

      // Simulate another tab clearing the session
      const storageEvent = new StorageEvent('storage', {
        key: 'planning-poker-session',
        newValue: null,
        oldValue: JSON.stringify({ roomId: 'TEST123', nickname: 'TestUser' }),
      });

      window.dispatchEvent(storageEvent);

      await waitFor(() => {
        // Should handle session clear from other tab
        expect(screen.getByText('Join Room')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed session data gracefully', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');

      renderRoomPage('TEST123');

      await waitFor(() => {
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('planning-poker-session');
        expect(screen.getByText('Join Room')).toBeInTheDocument();
      });
    });

    it('should handle localStorage not available', async () => {
      // Mock localStorage throwing error
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage not available');
      });

      renderRoomPage('TEST123');

      await waitFor(() => {
        // Should fallback gracefully without localStorage
        expect(screen.getByText('Join Room')).toBeInTheDocument();
      });
    });
  });
});