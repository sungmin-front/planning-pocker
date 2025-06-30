import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RoomPage } from '@/pages/RoomPage';

// Mock the room context
const mockRoomContext = {
  room: null,
  currentPlayer: null,
  isHost: false,
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  vote: vi.fn(),
  syncRoom: vi.fn(),
  createStory: vi.fn(),
  revealVotes: vi.fn(),
  restartVoting: vi.fn(),
  setFinalPoint: vi.fn(),
  transferHost: vi.fn()
};

vi.mock('@/contexts/RoomContext', () => ({
  useRoom: () => mockRoomContext
}));

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
  useWebSocket: () => mockWebSocketContext
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ roomId: 'TEST123' }),
    useSearchParams: () => [new URLSearchParams('nickname=TestUser'), vi.fn()]
  };
});

describe('RoomPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset all mock functions and state
    mockRoomContext.joinRoom.mockResolvedValue(true);
    mockRoomContext.room = null;
    mockRoomContext.isHost = false;
    mockWebSocketContext.isConnected = true;
    mockNavigate.mockClear();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter initialEntries={['/room/TEST123?nickname=TestUser']}>
        <RoomPage />
      </MemoryRouter>
    );
  };

  it('should show loading state when room is not available', () => {
    mockRoomContext.room = null;
    renderComponent();
    
    expect(screen.getByText('Connecting to room...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry Connection' })).toBeInTheDocument();
  });

  it('should navigate to home when not connected to WebSocket', () => {
    mockWebSocketContext.isConnected = false;
    renderComponent();
    
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('should call joinRoom when room and nickname are available', () => {
    mockWebSocketContext.isConnected = true;
    renderComponent();
    
    expect(mockRoomContext.joinRoom).toHaveBeenCalledWith('TEST123', 'TestUser');
  });

  it('should render room header with room information', () => {
    const mockRoom = {
      id: 'TEST123',
      name: 'Test Room',
      players: [
        { id: 'player1', nickname: 'TestUser', isHost: true, isSpectator: false, socketId: 'socket1' }
      ],
      stories: [],
      createdAt: new Date()
    };
    
    mockRoomContext.room = mockRoom;
    mockRoomContext.isHost = true;
    renderComponent();
    
    expect(screen.getByText('Test Room')).toBeInTheDocument();
    expect(screen.getByText('Room ID: TEST123')).toBeInTheDocument();
    expect(screen.getAllByText('Host')).toHaveLength(2); // One in header, one in player list
    expect(screen.getByRole('button', { name: 'Leave Room' })).toBeInTheDocument();
  });

  it('should display players list', () => {
    const mockRoom = {
      id: 'TEST123',
      name: 'Test Room',
      players: [
        { id: 'player1', nickname: 'Alice', isHost: true, isSpectator: false, socketId: 'socket1' },
        { id: 'player2', nickname: 'Bob', isHost: false, isSpectator: false, socketId: 'socket2' }
      ],
      stories: [],
      createdAt: new Date()
    };
    
    mockRoomContext.room = mockRoom;
    renderComponent();
    
    expect(screen.getByText('Players (2)')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('should display voting interface with vote options', () => {
    const mockRoom = {
      id: 'TEST123',
      name: 'Test Room',
      players: [],
      stories: [],
      createdAt: new Date(),
      currentStoryId: 'story1'
    };
    
    mockRoomContext.room = mockRoom;
    renderComponent();
    
    expect(screen.getByText('Vote')).toBeInTheDocument();
    
    // Check for voting options
    const voteOptions = ['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕'];
    voteOptions.forEach(option => {
      expect(screen.getByRole('button', { name: option })).toBeInTheDocument();
    });
  });

  it('should call vote when voting button is clicked', () => {
    const mockRoom = {
      id: 'TEST123',
      name: 'Test Room',
      players: [],
      stories: [],
      createdAt: new Date(),
      currentStoryId: 'story1'
    };
    
    mockRoomContext.room = mockRoom;
    renderComponent();
    
    const voteButton = screen.getByRole('button', { name: '5' });
    fireEvent.click(voteButton);
    
    expect(mockRoomContext.vote).toHaveBeenCalledWith('story1', '5');
  });

  it('should not call vote when no current story', () => {
    const mockRoom = {
      id: 'TEST123',
      name: 'Test Room',
      players: [],
      stories: [],
      createdAt: new Date(),
      currentStoryId: null
    };
    
    mockRoomContext.room = mockRoom;
    renderComponent();
    
    const voteButton = screen.getByRole('button', { name: '5' });
    fireEvent.click(voteButton);
    
    expect(mockRoomContext.vote).not.toHaveBeenCalled();
  });

  it('should display stories section', () => {
    const mockRoom = {
      id: 'TEST123',
      name: 'Test Room',
      players: [],
      stories: [
        {
          id: 'story1',
          title: 'User Login Feature',
          description: 'Implement user authentication',
          status: 'voting' as const,
          votes: {},
          final_point: null
        },
        {
          id: 'story2',
          title: 'Dashboard Component',
          status: 'completed' as const,
          votes: {},
          final_point: '8'
        }
      ],
      createdAt: new Date(),
      currentStoryId: 'story1'
    };
    
    mockRoomContext.room = mockRoom;
    renderComponent();
    
    expect(screen.getByText('Stories')).toBeInTheDocument();
    expect(screen.getByText('User Login Feature')).toBeInTheDocument();
    expect(screen.getByText('Implement user authentication')).toBeInTheDocument();
    expect(screen.getByText('Dashboard Component')).toBeInTheDocument();
    expect(screen.getByText('8 pts')).toBeInTheDocument();
  });

  it('should highlight current story', () => {
    const mockRoom = {
      id: 'TEST123',
      name: 'Test Room',
      players: [],
      stories: [
        {
          id: 'story1',
          title: 'Current Story',
          status: 'voting' as const,
          votes: {}
        }
      ],
      createdAt: new Date(),
      currentStoryId: 'story1'
    };
    
    mockRoomContext.room = mockRoom;
    renderComponent();
    
    const currentStory = screen.getByText('Current Story').closest('div');
    expect(currentStory).toHaveClass('border-primary', 'bg-primary/5');
  });

  it('should show empty state when no stories', () => {
    const mockRoom = {
      id: 'TEST123',
      name: 'Test Room',
      players: [],
      stories: [],
      createdAt: new Date()
    };
    
    mockRoomContext.room = mockRoom;
    renderComponent();
    
    expect(screen.getByText('No stories yet')).toBeInTheDocument();
  });

  it('should handle leave room action', () => {
    const mockRoom = {
      id: 'TEST123',
      name: 'Test Room',
      players: [],
      stories: [],
      createdAt: new Date()
    };
    
    mockRoomContext.room = mockRoom;
    renderComponent();
    
    const leaveButton = screen.getByRole('button', { name: 'Leave Room' });
    fireEvent.click(leaveButton);
    
    expect(mockRoomContext.leaveRoom).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('should handle retry connection action', () => {
    mockRoomContext.room = null;
    renderComponent();
    
    const retryButton = screen.getByRole('button', { name: 'Retry Connection' });
    fireEvent.click(retryButton);
    
    expect(mockRoomContext.syncRoom).toHaveBeenCalled();
  });

  it('should not show host badge when user is not host', () => {
    const mockRoom = {
      id: 'TEST123',
      name: 'Test Room',
      players: [],
      stories: [],
      createdAt: new Date()
    };
    
    mockRoomContext.room = mockRoom;
    mockRoomContext.isHost = false;
    renderComponent();
    
    expect(screen.queryByText('Host')).not.toBeInTheDocument();
  });

  it('should show player status badges correctly', () => {
    const mockRoom = {
      id: 'TEST123',
      name: 'Test Room',
      players: [
        { id: 'player1', nickname: 'Host Player', isHost: true, isSpectator: false, socketId: 'socket1' },
        { id: 'player2', nickname: 'Regular Player', isHost: false, isSpectator: false, socketId: 'socket2' }
      ],
      stories: [],
      createdAt: new Date()
    };
    
    mockRoomContext.room = mockRoom;
    renderComponent();
    
    // Check for host badge on host player
    const hostPlayerRow = screen.getByText('Host Player').closest('div');
    expect(hostPlayerRow).toContainElement(screen.getByText('Host'));
    
    // Regular player should not have host badge
    const regularPlayerRow = screen.getByText('Regular Player').closest('div');
    expect(regularPlayerRow).not.toContainElement(screen.getAllByText('Host')[0]);
  });
});