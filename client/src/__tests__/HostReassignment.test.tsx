import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { RoomProvider, useRoom } from '@/contexts/RoomContext';
import { useToast } from '@/hooks/use-toast';

// Mock WebSocket context
const mockSocket = {
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  disconnect: vi.fn(),
};

const mockWebSocketContext = {
  socket: mockSocket,
  isConnected: true,
  sendMessage: vi.fn(),
  send: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => mockWebSocketContext,
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Test component to access room context
const TestComponent: React.FC = () => {
  const { room, currentPlayer, isHost, transferHost } = useRoom();
  
  return (
    <div>
      <div data-testid="room-id">{room?.id || 'no-room'}</div>
      <div data-testid="current-player">{currentPlayer?.nickname || 'no-player'}</div>
      <div data-testid="is-host">{isHost.toString()}</div>
      <button onClick={() => transferHost('newhost')} data-testid="transfer-host">
        Transfer Host
      </button>
    </div>
  );
};

describe('Host Reassignment', () => {
  let messageHandler: (message: any) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Capture the message handler when 'on' is called
    mockWebSocketContext.on.mockImplementation((event: string, handler: Function) => {
      if (event === 'message') {
        messageHandler = handler as (message: any) => void;
      }
    });
  });

  const renderWithProvider = () => {
    return render(
      <RoomProvider>
        <TestComponent />
      </RoomProvider>
    );
  };

  it('should handle automatic host reassignment when host disconnects', async () => {
    renderWithProvider();
    
    // Simulate joining room as regular player
    act(() => {
      messageHandler({
        type: 'JOIN_ROOM',
        payload: {
          room: {
            id: 'TEST123',
            name: 'Test Room',
            players: [
              { id: 'player1', nickname: 'OldHost', isHost: true },
              { id: 'player2', nickname: 'NewHost', isHost: false },
              { id: 'player3', nickname: 'CurrentPlayer', isHost: false }
            ],
            stories: [],
            createdAt: new Date(),
            currentStoryId: null
          },
          player: { id: 'player3', nickname: 'CurrentPlayer', isHost: false }
        }
      });
    });
    
    expect(screen.getByTestId('is-host')).toHaveTextContent('false');
    
    // Simulate host reassignment due to disconnection
    act(() => {
      messageHandler({
        type: 'room:hostChanged',
        payload: {
          newHostId: 'player2',
          newHostNickname: 'NewHost',
          oldHostId: 'player1',
          oldHostNickname: 'OldHost',
          reason: 'host_disconnected'
        }
      });
    });
    
    // Should show toast notification
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Host Changed",
        description: "NewHost is now the host (previous host disconnected)",
      });
    });
    
    // Current player should not be host
    expect(screen.getByTestId('is-host')).toHaveTextContent('false');
  });

  it('should update isHost to true when current player becomes host', async () => {
    renderWithProvider();
    
    // Simulate joining room as regular player
    act(() => {
      messageHandler({
        type: 'JOIN_ROOM',
        payload: {
          room: {
            id: 'TEST123',
            name: 'Test Room',
            players: [
              { id: 'player1', nickname: 'OldHost', isHost: true },
              { id: 'player2', nickname: 'CurrentPlayer', isHost: false }
            ],
            stories: [],
            createdAt: new Date(),
            currentStoryId: null
          },
          player: { id: 'player2', nickname: 'CurrentPlayer', isHost: false }
        }
      });
    });
    
    expect(screen.getByTestId('is-host')).toHaveTextContent('false');
    
    // Simulate current player becoming host
    act(() => {
      messageHandler({
        type: 'room:hostChanged',
        payload: {
          newHostId: 'player2',
          newHostNickname: 'CurrentPlayer',
          oldHostId: 'player1',
          oldHostNickname: 'OldHost',
          reason: 'host_disconnected'
        }
      });
    });
    
    // Should show toast notification
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Host Changed",
        description: "CurrentPlayer is now the host (previous host disconnected)",
      });
    });
    
    // Current player should now be host
    expect(screen.getByTestId('is-host')).toHaveTextContent('true');
  });

  it('should update isHost to false when current player loses host role', async () => {
    renderWithProvider();
    
    // Simulate joining room as host
    act(() => {
      messageHandler({
        type: 'JOIN_ROOM',
        payload: {
          room: {
            id: 'TEST123',
            name: 'Test Room',
            players: [
              { id: 'player1', nickname: 'CurrentPlayer', isHost: true },
              { id: 'player2', nickname: 'NewHost', isHost: false }
            ],
            stories: [],
            createdAt: new Date(),
            currentStoryId: null
          },
          player: { id: 'player1', nickname: 'CurrentPlayer', isHost: true }
        }
      });
    });
    
    expect(screen.getByTestId('is-host')).toHaveTextContent('true');
    
    // Simulate manual host transfer to another player
    act(() => {
      messageHandler({
        type: 'room:hostChanged',
        payload: {
          newHostId: 'player2',
          newHostNickname: 'NewHost',
          oldHostId: 'player1',
          oldHostNickname: 'CurrentPlayer'
        }
      });
    });
    
    // Should show toast notification
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Host Changed",
        description: "NewHost is now the host",
      });
    });
    
    // Current player should no longer be host
    expect(screen.getByTestId('is-host')).toHaveTextContent('false');
  });

  it('should handle manual host transfer without reason', async () => {
    renderWithProvider();
    
    // Simulate joining room as regular player
    act(() => {
      messageHandler({
        type: 'JOIN_ROOM',
        payload: {
          room: {
            id: 'TEST123',
            name: 'Test Room',
            players: [],
            stories: [],
            createdAt: new Date(),
            currentStoryId: null
          },
          player: { id: 'player3', nickname: 'Observer', isHost: false }
        }
      });
    });
    
    // Simulate manual host transfer
    act(() => {
      messageHandler({
        type: 'room:hostChanged',
        payload: {
          newHostId: 'player2',
          newHostNickname: 'NewHost',
          oldHostId: 'player1',
          oldHostNickname: 'OldHost'
        }
      });
    });
    
    // Should show toast notification without reason
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Host Changed",
        description: "NewHost is now the host",
      });
    });
  });

  it('should handle host change when no current player is set', async () => {
    renderWithProvider();
    
    // Don't join room first, simulate host change event
    act(() => {
      messageHandler({
        type: 'room:hostChanged',
        payload: {
          newHostId: 'player2',
          newHostNickname: 'NewHost',
          oldHostId: 'player1',
          oldHostNickname: 'OldHost',
          reason: 'host_disconnected'
        }
      });
    });
    
    // Should show toast notification
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Host Changed",
        description: "NewHost is now the host (previous host disconnected)",
      });
    });
    
    // Should remain not host (since no current player)
    expect(screen.getByTestId('is-host')).toHaveTextContent('false');
  });

  it('should send ROOM_TRANSFER_HOST message when transferHost is called', async () => {
    renderWithProvider();
    
    // Simulate joining room as host
    act(() => {
      messageHandler({
        type: 'JOIN_ROOM',
        payload: {
          room: {
            id: 'TEST123',
            name: 'Test Room',
            players: [],
            stories: [],
            createdAt: new Date(),
            currentStoryId: null
          },
          player: { id: 'player1', nickname: 'CurrentHost', isHost: true }
        }
      });
    });
    
    // Click transfer host button
    const transferButton = screen.getByTestId('transfer-host');
    transferButton.click();
    
    // Should send transfer host message
    expect(mockWebSocketContext.send).toHaveBeenCalledWith({
      type: 'ROOM_TRANSFER_HOST',
      payload: { toNickname: 'newhost' }
    });
  });

  it('should not send transfer message when not host', async () => {
    renderWithProvider();
    
    // Simulate joining room as regular player
    act(() => {
      messageHandler({
        type: 'JOIN_ROOM',
        payload: {
          room: {
            id: 'TEST123',
            name: 'Test Room',
            players: [],
            stories: [],
            createdAt: new Date(),
            currentStoryId: null
          },
          player: { id: 'player1', nickname: 'RegularPlayer', isHost: false }
        }
      });
    });
    
    // Click transfer host button
    const transferButton = screen.getByTestId('transfer-host');
    transferButton.click();
    
    // Should not send transfer host message
    expect(mockWebSocketContext.send).not.toHaveBeenCalledWith({
      type: 'ROOM_TRANSFER_HOST',
      payload: { toNickname: 'newhost' }
    });
  });

  it('should not send transfer message when no room is joined', async () => {
    renderWithProvider();
    
    // Click transfer host button without joining room
    const transferButton = screen.getByTestId('transfer-host');
    transferButton.click();
    
    // Should not send transfer host message
    expect(mockWebSocketContext.send).not.toHaveBeenCalledWith({
      type: 'ROOM_TRANSFER_HOST',
      payload: { toNickname: 'newhost' }
    });
  });
});