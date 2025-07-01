import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CurrentStory } from '@/components/CurrentStory';

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

describe('CurrentStory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoomContext.room = null;
  });

  it('should render null when no room exists', () => {
    mockRoomContext.room = null;
    
    const { container } = render(<CurrentStory />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should show placeholder when no story is selected', () => {
    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [],
      stories: [],
      createdAt: new Date(),
      currentStoryId: null
    };
    
    render(<CurrentStory />);
    
    expect(screen.getByTestId('current-story-placeholder')).toBeInTheDocument();
    expect(screen.getByText(/no story selected for voting/i)).toBeInTheDocument();
  });

  it('should render null when current story ID does not exist in stories', () => {
    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [],
      stories: [
        {
          id: 'story1',
          title: 'First Story',
          status: 'pending' as const,
          votes: {},
          final_point: null
        }
      ],
      createdAt: new Date(),
      currentStoryId: 'nonexistent-story'
    };
    
    const { container } = render(<CurrentStory />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should display current story title', () => {
    const mockStory = {
      id: 'story1',
      title: 'User Registration Feature',
      status: 'voting' as const,
      votes: {},
      final_point: null
    };

    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [],
      stories: [mockStory],
      createdAt: new Date(),
      currentStoryId: 'story1'
    };
    
    render(<CurrentStory />);
    
    expect(screen.getByTestId('current-story-title')).toHaveTextContent('User Registration Feature');
  });

  it('should display current story description when available', () => {
    const mockStory = {
      id: 'story1',
      title: 'User Registration Feature',
      description: 'Implement user registration with email validation',
      status: 'voting' as const,
      votes: {},
      final_point: null
    };

    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [],
      stories: [mockStory],
      createdAt: new Date(),
      currentStoryId: 'story1'
    };
    
    render(<CurrentStory />);
    
    expect(screen.getByTestId('current-story-description')).toHaveTextContent('Implement user registration with email validation');
  });

  it('should not display description section when description is null', () => {
    const mockStory = {
      id: 'story1',
      title: 'User Registration Feature',
      description: null,
      status: 'voting' as const,
      votes: {},
      final_point: null
    };

    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [],
      stories: [mockStory],
      createdAt: new Date(),
      currentStoryId: 'story1'
    };
    
    render(<CurrentStory />);
    
    expect(screen.queryByTestId('current-story-description')).not.toBeInTheDocument();
  });

  it('should display correct status badge for pending story', () => {
    const mockStory = {
      id: 'story1',
      title: 'Pending Story',
      status: 'pending' as const,
      votes: {},
      final_point: null
    };

    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [],
      stories: [mockStory],
      createdAt: new Date(),
      currentStoryId: 'story1'
    };
    
    render(<CurrentStory />);
    
    expect(screen.getByTestId('status-badge')).toHaveTextContent('Waiting to start');
  });

  it('should display correct status badge for voting story', () => {
    const mockStory = {
      id: 'story1',
      title: 'Voting Story',
      status: 'voting' as const,
      votes: {},
      final_point: null
    };

    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [],
      stories: [mockStory],
      createdAt: new Date(),
      currentStoryId: 'story1'
    };
    
    render(<CurrentStory />);
    
    expect(screen.getByTestId('status-badge')).toHaveTextContent('Voting in progress');
  });

  it('should display correct status badge for revealed story', () => {
    const mockStory = {
      id: 'story1',
      title: 'Revealed Story',
      status: 'revealed' as const,
      votes: {},
      final_point: null
    };

    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [],
      stories: [mockStory],
      createdAt: new Date(),
      currentStoryId: 'story1'
    };
    
    render(<CurrentStory />);
    
    expect(screen.getByTestId('status-badge')).toHaveTextContent('Votes revealed');
  });

  it('should display final points when story is finalized', () => {
    const mockStory = {
      id: 'story1',
      title: 'Finalized Story',
      status: 'revealed' as const,
      votes: {},
      final_point: '8'
    };

    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [],
      stories: [mockStory],
      createdAt: new Date(),
      currentStoryId: 'story1'
    };
    
    render(<CurrentStory />);
    
    expect(screen.getByTestId('final-points')).toHaveTextContent('Final: 8 points');
  });

  it('should not display final points when story is not finalized', () => {
    const mockStory = {
      id: 'story1',
      title: 'Unfinalized Story',
      status: 'voting' as const,
      votes: {},
      final_point: null
    };

    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [],
      stories: [mockStory],
      createdAt: new Date(),
      currentStoryId: 'story1'
    };
    
    render(<CurrentStory />);
    
    expect(screen.queryByTestId('final-points')).not.toBeInTheDocument();
  });

  it('should handle story with zero points', () => {
    const mockStory = {
      id: 'story1',
      title: 'Zero Points Story',
      status: 'revealed' as const,
      votes: {},
      final_point: '0'
    };

    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [],
      stories: [mockStory],
      createdAt: new Date(),
      currentStoryId: 'story1'
    };
    
    render(<CurrentStory />);
    
    expect(screen.getByTestId('final-points')).toHaveTextContent('Final: 0 points');
  });

  it('should handle story with unknown status gracefully', () => {
    const mockStory = {
      id: 'story1',
      title: 'Unknown Status Story',
      status: 'unknown' as any,
      votes: {},
      final_point: null
    };

    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [],
      stories: [mockStory],
      createdAt: new Date(),
      currentStoryId: 'story1'
    };
    
    render(<CurrentStory />);
    
    // Should still render the component without crashing
    expect(screen.getByTestId('current-story-title')).toHaveTextContent('Unknown Status Story');
    expect(screen.getByTestId('status-badge')).toBeInTheDocument();
  });

  it('should update when current story changes', () => {
    const mockStories = [
      {
        id: 'story1',
        title: 'First Story',
        status: 'pending' as const,
        votes: {},
        final_point: null
      },
      {
        id: 'story2',
        title: 'Second Story',
        status: 'voting' as const,
        votes: {},
        final_point: null
      }
    ];

    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [],
      stories: mockStories,
      createdAt: new Date(),
      currentStoryId: 'story1'
    };
    
    const { rerender } = render(<CurrentStory />);
    
    expect(screen.getByTestId('current-story-title')).toHaveTextContent('First Story');
    
    // Change current story
    mockRoomContext.room.currentStoryId = 'story2';
    rerender(<CurrentStory />);
    
    expect(screen.getByTestId('current-story-title')).toHaveTextContent('Second Story');
  });

  it('should display all components correctly for complete story', () => {
    const mockStory = {
      id: 'story1',
      title: 'Complete Story',
      description: 'This is a complete story with all fields',
      status: 'revealed' as const,
      votes: { player1: '5', player2: '8' },
      final_point: '5'
    };

    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [],
      stories: [mockStory],
      createdAt: new Date(),
      currentStoryId: 'story1'
    };
    
    render(<CurrentStory />);
    
    // Check all components are present
    expect(screen.getByTestId('current-story')).toBeInTheDocument();
    expect(screen.getByTestId('current-story-title')).toHaveTextContent('Complete Story');
    expect(screen.getByTestId('current-story-description')).toHaveTextContent('This is a complete story with all fields');
    expect(screen.getByTestId('status-badge')).toHaveTextContent('Votes revealed');
    expect(screen.getByTestId('final-points')).toHaveTextContent('Final: 5 points');
  });

  it('should handle multiline description correctly', () => {
    const mockStory = {
      id: 'story1',
      title: 'Story with Multiline Description',
      description: 'Line 1\nLine 2\nLine 3',
      status: 'voting' as const,
      votes: {},
      final_point: null
    };

    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [],
      stories: [mockStory],
      createdAt: new Date(),
      currentStoryId: 'story1'
    };
    
    render(<CurrentStory />);
    
    const description = screen.getByTestId('current-story-description');
    // textContent collapses newlines to spaces, so we check the actual content
    expect(description).toHaveTextContent('Line 1 Line 2 Line 3');
    // Should have whitespace: pre-line class for proper line break rendering
    expect(description).toHaveClass('whitespace-pre-line');
  });
});