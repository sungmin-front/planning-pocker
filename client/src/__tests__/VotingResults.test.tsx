import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VotingResults } from '@/components/VotingResults';

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

describe('VotingResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoomContext.room = null;
    mockRoomContext.currentPlayer = null;
    mockRoomContext.isHost = false;
  });

  it('should not render when no room exists', () => {
    mockRoomContext.room = null;
    
    const { container } = render(<VotingResults />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should not render when no current story exists', () => {
    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [
        { id: 'player1', nickname: 'Alice', isHost: false },
        { id: 'player2', nickname: 'Bob', isHost: false }
      ],
      stories: [],
      createdAt: new Date(),
      currentStoryId: null
    };
    
    const { container } = render(<VotingResults />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should not render when story is not revealed', () => {
    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [
        { id: 'player1', nickname: 'Alice', isHost: false },
        { id: 'player2', nickname: 'Bob', isHost: false }
      ],
      stories: [
        {
          id: 'story1',
          title: 'Test Story',
          status: 'voting' as const,
          votes: { player1: '5', player2: '8' },
          final_point: null
        }
      ],
      createdAt: new Date(),
      currentStoryId: 'story1'
    };
    
    const { container } = render(<VotingResults />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should render voting results when story is revealed', () => {
    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [
        { id: 'player1', nickname: 'Alice', isHost: false },
        { id: 'player2', nickname: 'Bob', isHost: false }
      ],
      stories: [
        {
          id: 'story1',
          title: 'Test Story',
          status: 'revealed' as const,
          votes: { player1: '5', player2: '8' },
          final_point: null
        }
      ],
      createdAt: new Date(),
      currentStoryId: 'story1'
    };
    
    render(<VotingResults />);
    
    expect(screen.getByTestId('voting-results')).toBeInTheDocument();
    expect(screen.getByText(/voting results/i)).toBeInTheDocument();
  });

  it('should display vote distribution correctly', () => {
    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [
        { id: 'player1', nickname: 'Alice', isHost: false },
        { id: 'player2', nickname: 'Bob', isHost: false },
        { id: 'player3', nickname: 'Charlie', isHost: false },
        { id: 'player4', nickname: 'David', isHost: false }
      ],
      stories: [
        {
          id: 'story1',
          title: 'Test Story',
          status: 'revealed' as const,
          votes: { 
            player1: '5', 
            player2: '5', 
            player3: '8', 
            player4: '13' 
          },
          final_point: null
        }
      ],
      createdAt: new Date(),
      currentStoryId: 'story1'
    };
    
    render(<VotingResults />);
    
    // Should show vote distribution
    expect(screen.getByTestId('vote-item-5')).toBeInTheDocument();
    expect(screen.getByTestId('vote-item-8')).toBeInTheDocument();
    expect(screen.getByTestId('vote-item-13')).toBeInTheDocument();
    
    // Should show vote counts
    expect(screen.getByText('2 votes')).toBeInTheDocument(); // For '5'
    expect(screen.getAllByText('1 vote')).toHaveLength(2); // For '8' and '13'
  });

  it('should display consensus indicator when all votes are the same', () => {
    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [
        { id: 'player1', nickname: 'Alice', isHost: false },
        { id: 'player2', nickname: 'Bob', isHost: false },
        { id: 'player3', nickname: 'Charlie', isHost: false }
      ],
      stories: [
        {
          id: 'story1',
          title: 'Test Story',
          status: 'revealed' as const,
          votes: { 
            player1: '8', 
            player2: '8', 
            player3: '8' 
          },
          final_point: null
        }
      ],
      createdAt: new Date(),
      currentStoryId: 'story1'
    };
    
    render(<VotingResults />);
    
    expect(screen.getByTestId('consensus-indicator')).toBeInTheDocument();
    expect(screen.getByText(/unanimous/i)).toBeInTheDocument();
  });

  it('should display split decision indicator when votes differ', () => {
    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [
        { id: 'player1', nickname: 'Alice', isHost: false },
        { id: 'player2', nickname: 'Bob', isHost: false },
        { id: 'player3', nickname: 'Charlie', isHost: false }
      ],
      stories: [
        {
          id: 'story1',
          title: 'Test Story',
          status: 'revealed' as const,
          votes: { 
            player1: '5', 
            player2: '8', 
            player3: '13' 
          },
          final_point: null
        }
      ],
      createdAt: new Date(),
      currentStoryId: 'story1'
    };
    
    render(<VotingResults />);
    
    expect(screen.getByTestId('consensus-indicator')).toBeInTheDocument();
    expect(screen.getByText(/split decision/i)).toBeInTheDocument();
  });

  it('should display total vote count', () => {
    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [
        { id: 'player1', nickname: 'Alice', isHost: false },
        { id: 'player2', nickname: 'Bob', isHost: false },
        { id: 'player3', nickname: 'Charlie', isHost: false }
      ],
      stories: [
        {
          id: 'story1',
          title: 'Test Story',
          status: 'revealed' as const,
          votes: { 
            player1: '5', 
            player2: '8', 
            player3: '13' 
          },
          final_point: null
        }
      ],
      createdAt: new Date(),
      currentStoryId: 'story1'
    };
    
    render(<VotingResults />);
    
    expect(screen.getByTestId('total-votes')).toBeInTheDocument();
    expect(screen.getByText(/3 total votes/i)).toBeInTheDocument();
  });

  it('should handle empty votes object', () => {
    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [
        { id: 'player1', nickname: 'Alice', isHost: false }
      ],
      stories: [
        {
          id: 'story1',
          title: 'Test Story',
          status: 'revealed' as const,
          votes: {},
          final_point: null
        }
      ],
      createdAt: new Date(),
      currentStoryId: 'story1'
    };
    
    render(<VotingResults />);
    
    expect(screen.getByTestId('voting-results')).toBeInTheDocument();
    expect(screen.getByText(/no votes cast/i)).toBeInTheDocument();
  });

  it('should handle single vote', () => {
    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [
        { id: 'player1', nickname: 'Alice', isHost: false }
      ],
      stories: [
        {
          id: 'story1',
          title: 'Test Story',
          status: 'revealed' as const,
          votes: { player1: '8' },
          final_point: null
        }
      ],
      createdAt: new Date(),
      currentStoryId: 'story1'
    };
    
    render(<VotingResults />);
    
    expect(screen.getByTestId('voting-results')).toBeInTheDocument();
    expect(screen.getByTestId('vote-item-8')).toBeInTheDocument();
    expect(screen.getByText('1 vote')).toBeInTheDocument();
    expect(screen.getByText(/1 total vote/i)).toBeInTheDocument();
  });

  it('should handle special votes like question marks and coffee cups', () => {
    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [
        { id: 'player1', nickname: 'Alice', isHost: false },
        { id: 'player2', nickname: 'Bob', isHost: false },
        { id: 'player3', nickname: 'Charlie', isHost: false }
      ],
      stories: [
        {
          id: 'story1',
          title: 'Test Story',
          status: 'revealed' as const,
          votes: { 
            player1: '?', 
            player2: '☕', 
            player3: '5' 
          },
          final_point: null
        }
      ],
      createdAt: new Date(),
      currentStoryId: 'story1'
    };
    
    render(<VotingResults />);
    
    expect(screen.getByTestId('vote-item-?')).toBeInTheDocument();
    expect(screen.getByTestId('vote-item-☕')).toBeInTheDocument();
    expect(screen.getByTestId('vote-item-5')).toBeInTheDocument();
  });

  it('should sort vote values in logical order', () => {
    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [
        { id: 'player1', nickname: 'Alice', isHost: false },
        { id: 'player2', nickname: 'Bob', isHost: false },
        { id: 'player3', nickname: 'Charlie', isHost: false },
        { id: 'player4', nickname: 'David', isHost: false }
      ],
      stories: [
        {
          id: 'story1',
          title: 'Test Story',
          status: 'revealed' as const,
          votes: { 
            player1: '13', 
            player2: '1', 
            player3: '?', 
            player4: '8' 
          },
          final_point: null
        }
      ],
      createdAt: new Date(),
      currentStoryId: 'story1'
    };
    
    render(<VotingResults />);
    
    const voteElements = screen.getAllByTestId(/vote-item-/);
    // Should be sorted: 1, 8, 13, ?
    expect(voteElements[0]).toHaveTextContent('1');
    expect(voteElements[1]).toHaveTextContent('8');
    expect(voteElements[2]).toHaveTextContent('13');
    expect(voteElements[3]).toHaveTextContent('?');
  });

  it('should show most voted value prominently', () => {
    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [
        { id: 'player1', nickname: 'Alice', isHost: false },
        { id: 'player2', nickname: 'Bob', isHost: false },
        { id: 'player3', nickname: 'Charlie', isHost: false },
        { id: 'player4', nickname: 'David', isHost: false },
        { id: 'player5', nickname: 'Eve', isHost: false }
      ],
      stories: [
        {
          id: 'story1',
          title: 'Test Story',
          status: 'revealed' as const,
          votes: { 
            player1: '8', 
            player2: '8', 
            player3: '8', 
            player4: '5', 
            player5: '13' 
          },
          final_point: null
        }
      ],
      createdAt: new Date(),
      currentStoryId: 'story1'
    };
    
    render(<VotingResults />);
    
    expect(screen.getByTestId('most-voted')).toBeInTheDocument();
    expect(screen.getByTestId('most-voted')).toHaveTextContent('8');
  });

  it('should handle ties in voting', () => {
    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [
        { id: 'player1', nickname: 'Alice', isHost: false },
        { id: 'player2', nickname: 'Bob', isHost: false },
        { id: 'player3', nickname: 'Charlie', isHost: false },
        { id: 'player4', nickname: 'David', isHost: false }
      ],
      stories: [
        {
          id: 'story1',
          title: 'Test Story',
          status: 'revealed' as const,
          votes: { 
            player1: '5', 
            player2: '5', 
            player3: '8', 
            player4: '8' 
          },
          final_point: null
        }
      ],
      createdAt: new Date(),
      currentStoryId: 'story1'
    };
    
    render(<VotingResults />);
    
    expect(screen.getByTestId('consensus-indicator')).toBeInTheDocument();
    expect(screen.getByText(/tied/i)).toBeInTheDocument();
  });
});