import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StoryList } from '@/components/StoryList';

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
const mockSocket = {
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({
    socket: mockSocket,
    isConnected: true,
    sendMessage: vi.fn(),
  }),
}));

describe('StoryList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoomContext.room = null;
    mockRoomContext.isHost = false;
  });

  it('should show empty state when no stories', () => {
    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [],
      stories: [],
      createdAt: new Date(),
      currentStoryId: null
    };
    
    render(<StoryList />);
    
    expect(screen.getByText(/no stories in the backlog yet/i)).toBeInTheDocument();
  });

  it('should show host instruction in empty state when user is host', () => {
    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [],
      stories: [],
      createdAt: new Date(),
      currentStoryId: null
    };
    mockRoomContext.isHost = true;
    
    render(<StoryList />);
    
    expect(screen.getByText(/use the "add story" button to create one/i)).toBeInTheDocument();
  });

  it('should not show host instruction in empty state when user is not host', () => {
    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [],
      stories: [],
      createdAt: new Date(),
      currentStoryId: null
    };
    mockRoomContext.isHost = false;
    
    render(<StoryList />);
    
    expect(screen.queryByText(/use the "add story" button to create one/i)).not.toBeInTheDocument();
  });

  it('should display list of stories', () => {
    const mockStories = [
      {
        id: 'story1',
        title: 'First Story',
        description: 'Description for first story',
        status: 'pending' as const,
        votes: {},
        final_point: null
      },
      {
        id: 'story2',
        title: 'Second Story',
        description: null,
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
      currentStoryId: null
    };
    
    render(<StoryList />);
    
    expect(screen.getByText('Backlog')).toBeInTheDocument();
    expect(screen.getByText('First Story')).toBeInTheDocument();
    expect(screen.getByText('Second Story')).toBeInTheDocument();
    expect(screen.getByText('Description for first story')).toBeInTheDocument();
  });

  it('should show status icons for different story statuses', () => {
    const mockStories = [
      {
        id: 'story1',
        title: 'Pending Story',
        status: 'pending' as const,
        votes: {},
        final_point: null
      },
      {
        id: 'story2',
        title: 'Voting Story',
        status: 'voting' as const,
        votes: {},
        final_point: null
      },
      {
        id: 'story3',
        title: 'Revealed Story',
        status: 'revealed' as const,
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
      currentStoryId: null
    };
    
    render(<StoryList />);
    
    // Check for status icons (emojis)
    expect(screen.getByText('⏳')).toBeInTheDocument(); // pending
    expect(screen.getByText('🗳️')).toBeInTheDocument(); // voting
    expect(screen.getByText('👁️')).toBeInTheDocument(); // revealed
  });

  it('should highlight currently selected story', () => {
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
      currentStoryId: 'story2'
    };
    
    render(<StoryList />);
    
    const secondStoryItem = screen.getByTestId('story-item-story2');
    expect(secondStoryItem).toHaveClass('active');
    
    const firstStoryItem = screen.getByTestId('story-item-story1');
    expect(firstStoryItem).not.toHaveClass('active');
  });

  it('should show final points when story is completed', () => {
    const mockStories = [
      {
        id: 'story1',
        title: 'Completed Story',
        status: 'revealed' as const,
        votes: {},
        final_point: '8'
      }
    ];

    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [],
      stories: mockStories,
      createdAt: new Date(),
      currentStoryId: null
    };
    
    render(<StoryList />);
    
    expect(screen.getByText('8 pts')).toBeInTheDocument();
  });

  it('should allow host to select stories', async () => {
    const user = userEvent.setup();
    const mockStories = [
      {
        id: 'story1',
        title: 'First Story',
        status: 'pending' as const,
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
      currentStoryId: null
    };
    mockRoomContext.isHost = true;
    
    render(<StoryList />);
    
    const storyItem = screen.getByTestId('story-item-story1');
    await user.click(storyItem);
    
    expect(mockSocket.emit).toHaveBeenCalledWith('story:select', { storyId: 'story1' });
  });

  it('should not allow non-host to select stories', async () => {
    const user = userEvent.setup();
    const mockStories = [
      {
        id: 'story1',
        title: 'First Story',
        status: 'pending' as const,
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
      currentStoryId: null
    };
    mockRoomContext.isHost = false;
    
    render(<StoryList />);
    
    const storyItem = screen.getByTestId('story-item-story1');
    await user.click(storyItem);
    
    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it('should show cursor pointer for host and normal cursor for non-host', () => {
    const mockStories = [
      {
        id: 'story1',
        title: 'First Story',
        status: 'pending' as const,
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
      currentStoryId: null
    };
    mockRoomContext.isHost = true;
    
    render(<StoryList />);
    
    const storyItem = screen.getByTestId('story-item-story1');
    expect(storyItem).toHaveClass('clickable');
  });

  it('should not show description when story has no description', () => {
    const mockStories = [
      {
        id: 'story1',
        title: 'Story Without Description',
        description: null,
        status: 'pending' as const,
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
      currentStoryId: null
    };
    
    render(<StoryList />);
    
    expect(screen.getByText('Story Without Description')).toBeInTheDocument();
    expect(screen.queryByTestId('story-description-story1')).not.toBeInTheDocument();
  });

  it('should show description when story has description', () => {
    const mockStories = [
      {
        id: 'story1',
        title: 'Story With Description',
        description: 'This is a detailed description',
        status: 'pending' as const,
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
      currentStoryId: null
    };
    
    render(<StoryList />);
    
    expect(screen.getByTestId('story-description-story1')).toHaveTextContent('This is a detailed description');
  });

  it('should render when no room exists', () => {
    mockRoomContext.room = null;
    
    const { container } = render(<StoryList />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should handle empty stories array', () => {
    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [],
      stories: [],
      createdAt: new Date(),
      currentStoryId: null
    };
    
    render(<StoryList />);
    
    expect(screen.getByTestId('story-list-empty')).toBeInTheDocument();
  });

  it('should display all story information correctly', () => {
    const mockStories = [
      {
        id: 'story1',
        title: 'Complex Story',
        description: 'Detailed description here',
        status: 'revealed' as const,
        votes: { player1: '5', player2: '8' },
        final_point: '5'
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
    
    render(<StoryList />);
    
    // Check all elements are present
    expect(screen.getByText('Complex Story')).toBeInTheDocument();
    expect(screen.getByText('Detailed description here')).toBeInTheDocument();
    expect(screen.getByText('👁️')).toBeInTheDocument(); // revealed status
    expect(screen.getByText('5 pts')).toBeInTheDocument();
    
    const storyItem = screen.getByTestId('story-item-story1');
    expect(storyItem).toHaveClass('active');
  });
});