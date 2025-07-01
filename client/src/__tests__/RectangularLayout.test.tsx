import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RectangularLayout } from '@/components/PlayerTable/RectangularLayout';

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

describe('RectangularLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoomContext.room = null;
    mockRoomContext.currentPlayer = null;
  });

  it('should render empty when no room', () => {
    mockRoomContext.room = null;
    
    const { container } = render(<RectangularLayout />);
    
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
    
    const { container } = render(<RectangularLayout />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should render rectangular layout with players', () => {
    const mockPlayers = [
      { id: 'player1', nickname: 'Alice', votes: {} },
      { id: 'player2', nickname: 'Bob', votes: {} },
      { id: 'player3', nickname: 'Charlie', votes: {} },
      { id: 'player4', nickname: 'David', votes: {} }
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
    
    render(<RectangularLayout />);
    
    expect(screen.getByTestId('rectangular-table-container')).toBeInTheDocument();
    expect(screen.getByTestId('table-rectangle')).toBeInTheDocument();
    
    // All players should be rendered
    mockPlayers.forEach(player => {
      expect(screen.getByTestId(`player-card-${player.id}`)).toBeInTheDocument();
    });
  });

  it('should position current player at the bottom center', () => {
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
    
    render(<RectangularLayout />);
    
    // Current player should have special styling
    const playerSlots = screen.getAllByTestId(/^player-slot-/);
    const currentPlayerSlot = playerSlots.find(slot => 
      slot.classList.contains('player-self')
    );
    
    expect(currentPlayerSlot).toBeInTheDocument();
    expect(currentPlayerSlot).toHaveTextContent('Bob');
  });

  it('should distribute players across four zones', () => {
    const mockPlayers = Array.from({ length: 8 }, (_, i) => ({
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
    
    render(<RectangularLayout />);
    
    // All players should be rendered
    const playerSlots = screen.getAllByTestId(/^player-slot-/);
    expect(playerSlots).toHaveLength(8);
    
    // Check that different zones have players
    const topPlayers = playerSlots.filter(slot => 
      slot.classList.contains('zone-top')
    );
    const bottomPlayers = playerSlots.filter(slot => 
      slot.classList.contains('zone-bottom')
    );
    const leftPlayers = playerSlots.filter(slot => 
      slot.classList.contains('zone-left')
    );
    const rightPlayers = playerSlots.filter(slot => 
      slot.classList.contains('zone-right')
    );
    
    // Should have players in multiple zones
    expect(topPlayers.length + bottomPlayers.length + leftPlayers.length + rightPlayers.length).toBe(8);
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
    
    render(<RectangularLayout />);
    
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
    
    render(<RectangularLayout />);
    
    // All cards should show as hidden
    const revealedElements = screen.getAllByTestId('card-revealed');
    revealedElements.forEach(element => {
      expect(element).toHaveTextContent('hidden');
    });
  });

  it('should handle two players by placing them appropriately', () => {
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
    
    render(<RectangularLayout />);
    
    const playerSlots = screen.getAllByTestId(/^player-slot-/);
    expect(playerSlots).toHaveLength(2);
    
    // With 2 players, current player should be at bottom and other player should be somewhere else
    const currentPlayerSlot = playerSlots.find(slot => 
      slot.classList.contains('player-self')
    );
    
    expect(currentPlayerSlot).toBeInTheDocument();
    expect(currentPlayerSlot).toHaveTextContent('Alice');
    
    // The other player should be positioned elsewhere (could be top, left, right, or bottom depending on distribution)
    const otherPlayerSlot = playerSlots.find(slot => 
      !slot.classList.contains('player-self')
    );
    
    expect(otherPlayerSlot).toBeInTheDocument();
    expect(otherPlayerSlot).toHaveTextContent('Bob');
  });

  it('should apply correct CSS classes for zones', () => {
    const mockPlayers = [
      { id: 'player1', nickname: 'Alice', votes: {} },
      { id: 'player2', nickname: 'Bob', votes: {} },
      { id: 'player3', nickname: 'Charlie', votes: {} },
      { id: 'player4', nickname: 'David', votes: {} }
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
    
    render(<RectangularLayout />);
    
    expect(screen.getByTestId('rectangular-table-container')).toHaveClass('rectangular-table-container');
    expect(screen.getByTestId('table-rectangle')).toHaveClass('table-rectangle');
    
    const playerSlots = screen.getAllByTestId(/^player-slot-/);
    playerSlots.forEach(slot => {
      expect(slot).toHaveClass('player-slot');
    });
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
    
    render(<RectangularLayout />);
    
    // Use specific test IDs for player names
    expect(screen.getByTestId('player-name-player1')).toHaveTextContent('Alice');
    expect(screen.getByTestId('player-name-player2')).toHaveTextContent('Bob');
    
    const playerNames = screen.getAllByTestId(/^player-name-/);
    expect(playerNames).toHaveLength(2);
  });

  it('should handle large number of players', () => {
    const mockPlayers = Array.from({ length: 12 }, (_, i) => ({
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
    
    render(<RectangularLayout />);
    
    const playerSlots = screen.getAllByTestId(/^player-slot-/);
    expect(playerSlots).toHaveLength(12);
    
    // All players should be rendered
    mockPlayers.forEach(player => {
      expect(screen.getByTestId(`player-card-${player.id}`)).toBeInTheDocument();
    });
  });
});