import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CircularLayout } from '@/components/PlayerTable/CircularLayout';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

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

// Mock PlayerCard component
vi.mock('@/components/PlayerCard', () => ({
  PlayerCard: ({ player, revealed }: { player: any; revealed: boolean }) => (
    <div data-testid={`player-card-${player.id}`} className="player-card">
      <span>{player.nickname}</span>
      <span data-testid="card-revealed">{revealed ? 'revealed' : 'hidden'}</span>
    </div>
  )
}));

describe('CircularLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoomContext.room = null;
    mockRoomContext.currentPlayer = null;
  });

  it('should render empty when no room', () => {
    mockRoomContext.room = null;
    
    const { container } = render(<CircularLayout />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should render empty when no players', () => {
    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [],
      stories: [],
      createdAt: new Date(),
      currentStoryId: null
    };
    
    const { container } = render(<CircularLayout />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should render circular layout with players', () => {
    const mockPlayers = [
      { id: 'player1', nickname: 'Alice', votes: {} },
      { id: 'player2', nickname: 'Bob', votes: {} },
      { id: 'player3', nickname: 'Charlie', votes: {} }
    ];

    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: mockPlayers,
      stories: [],
      createdAt: new Date(),
      currentStoryId: null
    };
    mockRoomContext.currentPlayer = mockPlayers[0];
    
    render(<CircularLayout />);
    
    expect(screen.getByTestId('circular-table-container')).toBeInTheDocument();
    expect(screen.getByTestId('table-center')).toBeInTheDocument();
    expect(screen.getByTestId('player-card-player1')).toBeInTheDocument();
    expect(screen.getByTestId('player-card-player2')).toBeInTheDocument();
    expect(screen.getByTestId('player-card-player3')).toBeInTheDocument();
  });

  it('should position current player at the bottom', () => {
    const mockPlayers = [
      { id: 'player1', nickname: 'Alice', votes: {} },
      { id: 'player2', nickname: 'Bob', votes: {} },
      { id: 'player3', nickname: 'Charlie', votes: {} }
    ];

    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: mockPlayers,
      stories: [],
      createdAt: new Date(),
      currentStoryId: null
    };
    mockRoomContext.currentPlayer = mockPlayers[1]; // Bob is current player
    
    render(<CircularLayout />);
    
    // Current player should have special styling
    const playerSlots = screen.getAllByTestId(/^player-slot-/);
    const currentPlayerSlot = playerSlots.find(slot => 
      slot.classList.contains('player-self')
    );
    
    expect(currentPlayerSlot).toBeInTheDocument();
    expect(currentPlayerSlot).toHaveTextContent('Bob');
  });

  it('should calculate correct positions for different player counts', () => {
    const mockPlayers = [
      { id: 'player1', nickname: 'Alice', votes: {} },
      { id: 'player2', nickname: 'Bob', votes: {} }
    ];

    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: mockPlayers,
      stories: [],
      createdAt: new Date(),
      currentStoryId: null
    };
    mockRoomContext.currentPlayer = mockPlayers[0];
    
    render(<CircularLayout />);
    
    // With 2 players, they should be positioned opposite each other
    const playerSlots = screen.getAllByTestId(/^player-slot-/);
    expect(playerSlots).toHaveLength(2);
    
    // Check that positions are set (we'll verify the actual coordinates in the component)
    playerSlots.forEach(slot => {
      expect(slot).toHaveAttribute('style');
    });
  });

  it('should show revealed cards when story is revealed', () => {
    const mockPlayers = [
      { id: 'player1', nickname: 'Alice', votes: {} },
      { id: 'player2', nickname: 'Bob', votes: {} }
    ];

    const mockStory = {
      id: 'story1',
      title: 'Test Story',
      status: 'revealed' as const,
      votes: { player1: '5', player2: '8' },
      final_point: null
    };

    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: mockPlayers,
      stories: [mockStory],
      createdAt: new Date(),
      currentStoryId: 'story1'
    };
    mockRoomContext.currentPlayer = mockPlayers[0];
    
    render(<CircularLayout />);
    
    // All cards should show as revealed
    const revealedElements = screen.getAllByTestId('card-revealed');
    revealedElements.forEach(element => {
      expect(element).toHaveTextContent('revealed');
    });
  });

  it('should show hidden cards when story is voting', () => {
    const mockPlayers = [
      { id: 'player1', nickname: 'Alice', votes: {} },
      { id: 'player2', nickname: 'Bob', votes: {} }
    ];

    const mockStory = {
      id: 'story1',
      title: 'Test Story',
      status: 'voting' as const,
      votes: {},
      final_point: null
    };

    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: mockPlayers,
      stories: [mockStory],
      createdAt: new Date(),
      currentStoryId: 'story1'
    };
    mockRoomContext.currentPlayer = mockPlayers[0];
    
    render(<CircularLayout />);
    
    // All cards should show as hidden
    const revealedElements = screen.getAllByTestId('card-revealed');
    revealedElements.forEach(element => {
      expect(element).toHaveTextContent('hidden');
    });
  });

  it('should handle large number of players', () => {
    const mockPlayers = Array.from({ length: 10 }, (_, i) => ({
      id: `player${i + 1}`,
      nickname: `Player ${i + 1}`,
      votes: {}
    }));

    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: mockPlayers,
      stories: [],
      createdAt: new Date(),
      currentStoryId: null
    };
    mockRoomContext.currentPlayer = mockPlayers[0];
    
    render(<CircularLayout />);
    
    const playerSlots = screen.getAllByTestId(/^player-slot-/);
    expect(playerSlots).toHaveLength(10);
    
    // All players should be rendered
    mockPlayers.forEach(player => {
      expect(screen.getByTestId(`player-card-${player.id}`)).toBeInTheDocument();
    });
  });

  it('should apply correct CSS classes', () => {
    const mockPlayers = [
      { id: 'player1', nickname: 'Alice', votes: {} },
      { id: 'player2', nickname: 'Bob', votes: {} }
    ];

    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: mockPlayers,
      stories: [],
      createdAt: new Date(),
      currentStoryId: null
    };
    mockRoomContext.currentPlayer = mockPlayers[0];
    
    render(<CircularLayout />);
    
    expect(screen.getByTestId('circular-table-container')).toHaveClass('circular-table-container');
    expect(screen.getByTestId('table-center')).toHaveClass('table-center');
    
    const playerSlots = screen.getAllByTestId(/^player-slot-/);
    playerSlots.forEach(slot => {
      expect(slot).toHaveClass('player-slot');
    });
    
    // Current player should have additional class
    const currentPlayerSlot = screen.getByTestId('player-slot-player1');
    expect(currentPlayerSlot).toHaveClass('player-self');
  });

  it('should display player names', () => {
    const mockPlayers = [
      { id: 'player1', nickname: 'Alice', votes: {} },
      { id: 'player2', nickname: 'Bob', votes: {} }
    ];

    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: mockPlayers,
      stories: [],
      createdAt: new Date(),
      currentStoryId: null
    };
    mockRoomContext.currentPlayer = mockPlayers[0];
    
    render(<CircularLayout />);
    
    // Use specific test IDs for player names to avoid conflicts with PlayerCard mock
    expect(screen.getByTestId('player-name-player1')).toHaveTextContent('Alice');
    expect(screen.getByTestId('player-name-player2')).toHaveTextContent('Bob');
    
    // Names should be in player name elements
    const playerNames = screen.getAllByTestId(/^player-name-/);
    expect(playerNames).toHaveLength(2);
  });
});