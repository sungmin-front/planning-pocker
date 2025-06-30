import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { RoomProvider, useRoom } from '@/contexts/RoomContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { getWebSocketInstance } from '@/socket';

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

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Test component that uses the Room context
const TestComponent = () => {
  const { 
    room, 
    currentPlayer, 
    isHost, 
    joinRoom, 
    leaveRoom, 
    vote, 
    syncRoom 
  } = useRoom();
  
  return (
    <div>
      <div data-testid="room-id">{room?.id || 'No Room'}</div>
      <div data-testid="player-nickname">{currentPlayer?.nickname || 'No Player'}</div>
      <div data-testid="is-host">{isHost ? 'Host' : 'Not Host'}</div>
      <button 
        data-testid="join-btn" 
        onClick={() => joinRoom('test-room', 'test-user')}
      >
        Join Room
      </button>
      <button 
        data-testid="leave-btn" 
        onClick={leaveRoom}
      >
        Leave Room
      </button>
      <button 
        data-testid="vote-btn" 
        onClick={() => vote('story-1', '5')}
      >
        Vote
      </button>
      <button 
        data-testid="sync-btn" 
        onClick={syncRoom}
      >
        Sync
      </button>
    </div>
  );
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <WebSocketProvider>
    <RoomProvider>
      {children}
    </RoomProvider>
  </WebSocketProvider>
);

describe('RoomContext', () => {
  let mockSocketInstance: any;
  let mockMessageHandlers: Map<string, Function>;

  beforeEach(() => {
    mockSocketInstance = getWebSocketInstance();
    mockMessageHandlers = new Map();
    
    vi.clearAllMocks();
    mockNavigate.mockClear();
    
    // Setup message handler mocking
    mockSocketInstance.on.mockImplementation((event: string, handler: Function) => {
      if (event === 'message') {
        mockMessageHandlers.set('message', handler);
      }
    });
    
    vi.stubEnv('VITE_WEBSOCKET_URL', 'ws://localhost:8080');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should provide room context to children', () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    expect(screen.getByTestId('room-id')).toHaveTextContent('No Room');
    expect(screen.getByTestId('player-nickname')).toHaveTextContent('No Player');
    expect(screen.getByTestId('is-host')).toHaveTextContent('Not Host');
  });

  it('should handle JOIN_ROOM message and update state', () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    const joinRoomMessage = {
      type: 'JOIN_ROOM',
      payload: {
        room: {
          id: 'test-room',
          name: 'Test Room',
          players: [
            { id: 'player-1', nickname: 'test-user', isHost: true, isSpectator: false, socketId: 'socket-1' }
          ],
          stories: [],
          createdAt: new Date()
        },
        player: { id: 'player-1', nickname: 'test-user', isHost: true, isSpectator: false, socketId: 'socket-1' }
      }
    };

    act(() => {
      const messageHandler = mockMessageHandlers.get('message');
      if (messageHandler) {
        messageHandler(joinRoomMessage);
      }
    });

    expect(screen.getByTestId('room-id')).toHaveTextContent('test-room');
    expect(screen.getByTestId('player-nickname')).toHaveTextContent('test-user');
    expect(screen.getByTestId('is-host')).toHaveTextContent('Host');
  });

  it('should handle ROOM_SYNC message and update state', () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    const syncMessage = {
      type: 'ROOM_SYNC',
      payload: {
        room: {
          id: 'sync-room',
          name: 'Sync Room',
          players: [
            { id: 'player-1', nickname: 'user1', isHost: false, isSpectator: false, socketId: 'socket-1' },
            { id: 'player-2', nickname: 'user2', isHost: true, isSpectator: false, socketId: 'socket-2' }
          ],
          stories: [
            { id: 'story-1', title: 'Test Story', status: 'voting' as const, votes: {} }
          ],
          createdAt: new Date()
        }
      }
    };

    act(() => {
      const messageHandler = mockMessageHandlers.get('message');
      if (messageHandler) {
        messageHandler(syncMessage);
      }
    });

    expect(screen.getByTestId('room-id')).toHaveTextContent('sync-room');
  });

  it('should send JOIN_ROOM message when joinRoom is called', async () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    const joinBtn = screen.getByTestId('join-btn');
    
    act(() => {
      joinBtn.click();
    });

    await waitFor(() => {
      expect(mockSocketInstance.send).toHaveBeenCalledWith({
        type: 'JOIN_ROOM',
        payload: {
          roomId: 'test-room',
          nickname: 'test-user'
        }
      });
    });
  });

  it('should return false for joinRoom when not connected', async () => {
    mockSocketInstance.isConnected.mockReturnValue(false);
    
    const TestJoinComponent = () => {
      const { joinRoom } = useRoom();
      const [result, setResult] = React.useState<boolean | null>(null);
      
      const handleJoin = async () => {
        const success = await joinRoom('test-room', 'test-user');
        setResult(success);
      };
      
      return (
        <div>
          <button data-testid="join-btn" onClick={handleJoin}>Join</button>
          <div data-testid="join-result">{result?.toString()}</div>
        </div>
      );
    };

    render(
      <TestWrapper>
        <TestJoinComponent />
      </TestWrapper>
    );

    const joinBtn = screen.getByTestId('join-btn');
    
    await act(async () => {
      joinBtn.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('join-result')).toHaveTextContent('false');
    });
  });

  it('should send LEAVE_ROOM message and navigate when leaveRoom is called', () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    // First set up a room
    const joinMessage = {
      type: 'JOIN_ROOM',
      payload: {
        room: { id: 'test-room', name: 'Test Room', players: [], stories: [], createdAt: new Date() },
        player: { id: 'player-1', nickname: 'test-user', isHost: false, isSpectator: false, socketId: 'socket-1' }
      }
    };

    act(() => {
      const messageHandler = mockMessageHandlers.get('message');
      if (messageHandler) {
        messageHandler(joinMessage);
      }
    });

    const leaveBtn = screen.getByTestId('leave-btn');
    
    act(() => {
      leaveBtn.click();
    });

    expect(mockSocketInstance.send).toHaveBeenCalledWith({
      type: 'LEAVE_ROOM',
      payload: {}
    });

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('should send STORY_VOTE message when vote is called', () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    const voteBtn = screen.getByTestId('vote-btn');
    
    act(() => {
      voteBtn.click();
    });

    expect(mockSocketInstance.send).toHaveBeenCalledWith({
      type: 'STORY_VOTE',
      payload: {
        storyId: 'story-1',
        vote: '5'
      }
    });
  });

  it('should send ROOM_SYNC message when syncRoom is called', () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    const syncBtn = screen.getByTestId('sync-btn');
    
    act(() => {
      syncBtn.click();
    });

    expect(mockSocketInstance.send).toHaveBeenCalledWith({
      type: 'ROOM_SYNC',
      payload: {}
    });
  });

  it('should provide default implementations for unimplemented functions', () => {
    const TestUnimplementedComponent = () => {
      const { 
        createStory, 
        revealVotes, 
        restartVoting, 
        setFinalPoint, 
        transferHost 
      } = useRoom();
      
      return (
        <div>
          <button data-testid="create-story-btn" onClick={() => createStory('Test Story')}>
            Create Story
          </button>
          <button data-testid="reveal-votes-btn" onClick={() => revealVotes('story-1')}>
            Reveal Votes
          </button>
          <button data-testid="restart-voting-btn" onClick={() => restartVoting('story-1')}>
            Restart Voting
          </button>
          <button data-testid="set-final-point-btn" onClick={() => setFinalPoint('story-1', '8')}>
            Set Final Point
          </button>
          <button data-testid="transfer-host-btn" onClick={() => transferHost('other-user')}>
            Transfer Host
          </button>
        </div>
      );
    };

    render(
      <TestWrapper>
        <TestUnimplementedComponent />
      </TestWrapper>
    );

    // These should not throw errors
    act(() => {
      screen.getByTestId('create-story-btn').click();
      screen.getByTestId('reveal-votes-btn').click();
      screen.getByTestId('restart-voting-btn').click();
      screen.getByTestId('set-final-point-btn').click();
      screen.getByTestId('transfer-host-btn').click();
    });

    // No errors should be thrown
    expect(true).toBe(true);
  });

  it('should handle messages with unknown types gracefully', () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    const unknownMessage = {
      type: 'UNKNOWN_TYPE',
      payload: { data: 'test' }
    };

    // This should not throw an error
    act(() => {
      const messageHandler = mockMessageHandlers.get('message');
      if (messageHandler) {
        messageHandler(unknownMessage);
      }
    });

    expect(screen.getByTestId('room-id')).toHaveTextContent('No Room');
  });

  it('should throw error when useRoom is used outside provider', () => {
    const TestComponentOutsideProvider = () => {
      useRoom();
      return <div>Test</div>;
    };

    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponentOutsideProvider />);
    }).toThrow('useRoom must be used within a RoomProvider');

    consoleSpy.mockRestore();
  });

  it('should clear room state when leaving', () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    // First join a room
    const joinMessage = {
      type: 'JOIN_ROOM',
      payload: {
        room: { id: 'test-room', name: 'Test Room', players: [], stories: [], createdAt: new Date() },
        player: { id: 'player-1', nickname: 'test-user', isHost: true, isSpectator: false, socketId: 'socket-1' }
      }
    };

    act(() => {
      const messageHandler = mockMessageHandlers.get('message');
      if (messageHandler) {
        messageHandler(joinMessage);
      }
    });

    expect(screen.getByTestId('room-id')).toHaveTextContent('test-room');
    expect(screen.getByTestId('is-host')).toHaveTextContent('Host');

    // Then leave
    act(() => {
      screen.getByTestId('leave-btn').click();
    });

    expect(screen.getByTestId('room-id')).toHaveTextContent('No Room');
    expect(screen.getByTestId('player-nickname')).toHaveTextContent('No Player');
    expect(screen.getByTestId('is-host')).toHaveTextContent('Not Host');
  });
});