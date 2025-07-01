import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter, useParams, useSearchParams } from 'react-router-dom';
import { RoomPage } from '../RoomPage';
import { useRoom } from '@/contexts/RoomContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import type { Room, Player, Story } from '@planning-poker/shared';

// Mock the contexts
vi.mock('@/contexts/RoomContext');
vi.mock('@/contexts/WebSocketContext');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(),
    useSearchParams: vi.fn(),
    useNavigate: vi.fn()
  };
});

const mockJoinRoom = vi.fn();
const mockLeaveRoom = vi.fn();
const mockVote = vi.fn();
const mockSyncRoom = vi.fn();
const mockNavigate = vi.fn();

const createMockPlayer = (overrides: Partial<Player> = {}): Player => ({
  id: 'player-1',
  nickname: 'TestUser',
  socketId: 'socket-1',
  isHost: false,
  isSpectator: false,
  ...overrides
});

const createMockStory = (overrides: Partial<Story> = {}): Story => ({
  id: 'story-1',
  title: 'Test Story',
  description: 'A test story',
  status: 'voting',
  votes: {},
  ...overrides
});

const createMockRoom = (overrides: Partial<Room> = {}): Room => ({
  id: 'ABC123',
  name: 'Test Room',
  players: [createMockPlayer({ isHost: true })],
  stories: [],
  createdAt: new Date(),
  currentStoryId: null,
  ...overrides
});

const defaultUseRoom = {
  room: null,
  isHost: false,
  joinRoom: mockJoinRoom,
  leaveRoom: mockLeaveRoom,
  vote: mockVote,
  syncRoom: mockSyncRoom,
  createRoom: vi.fn()
};

const defaultUseWebSocket = {
  isConnected: true,
  connect: vi.fn(),
  disconnect: vi.fn(),
  send: vi.fn()
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('RoomPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRoom).mockReturnValue(defaultUseRoom);
    vi.mocked(useWebSocket).mockReturnValue(defaultUseWebSocket);
    vi.mocked(useParams).mockReturnValue({ roomId: 'ABC123' });
    
    const mockSearchParams = new URLSearchParams('nickname=TestUser');
    vi.mocked(useSearchParams).mockReturnValue([mockSearchParams, vi.fn()]);
    
    // Mock useNavigate
    const { useNavigate } = require('react-router-dom');
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
  });

  describe('URL Parameter Handling', () => {
    it('joins room when roomId and nickname are provided', () => {
      render(
        <TestWrapper>
          <RoomPage />
        </TestWrapper>
      );

      expect(mockJoinRoom).toHaveBeenCalledWith('ABC123', 'TestUser');
    });

    it('redirects to join page when roomId exists but nickname is missing', () => {
      const mockSearchParams = new URLSearchParams();
      vi.mocked(useSearchParams).mockReturnValue([mockSearchParams, vi.fn()]);

      render(
        <TestWrapper>
          <RoomPage />
        </TestWrapper>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/join/ABC123');
    });

    it('redirects to home when not connected to WebSocket', () => {
      vi.mocked(useWebSocket).mockReturnValue({
        ...defaultUseWebSocket,
        isConnected: false
      });

      render(
        <TestWrapper>
          <RoomPage />
        </TestWrapper>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Loading State', () => {
    it('shows connecting message when room is not loaded', () => {
      render(
        <TestWrapper>
          <RoomPage />
        </TestWrapper>
      );

      expect(screen.getByText('Connecting to room...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Retry Connection' })).toBeInTheDocument();
    });

    it('allows retrying connection', () => {
      render(
        <TestWrapper>
          <RoomPage />
        </TestWrapper>
      );

      const retryButton = screen.getByRole('button', { name: 'Retry Connection' });
      fireEvent.click(retryButton);

      expect(mockSyncRoom).toHaveBeenCalled();
    });
  });

  describe('Room Display', () => {
    beforeEach(() => {
      const mockRoom = createMockRoom({
        players: [
          createMockPlayer({ id: 'host', nickname: 'HostUser', isHost: true }),
          createMockPlayer({ id: 'player', nickname: 'TestUser', isHost: false })
        ]
      });

      vi.mocked(useRoom).mockReturnValue({
        ...defaultUseRoom,
        room: mockRoom,
        isHost: false
      });
    });

    it('displays room information', () => {
      render(
        <TestWrapper>
          <RoomPage />
        </TestWrapper>
      );

      expect(screen.getByText('Test Room')).toBeInTheDocument();
      expect(screen.getByText('Room ID: ABC123')).toBeInTheDocument();
    });

    it('shows host badge for host user', () => {
      vi.mocked(useRoom).mockReturnValue({
        ...defaultUseRoom,
        room: createMockRoom(),
        isHost: true
      });

      render(
        <TestWrapper>
          <RoomPage />
        </TestWrapper>
      );

      expect(screen.getByText('Host')).toBeInTheDocument();
    });

    it('displays all players with their roles', () => {
      render(
        <TestWrapper>
          <RoomPage />
        </TestWrapper>
      );

      expect(screen.getByText('Players (2)')).toBeInTheDocument();
      expect(screen.getByText('HostUser')).toBeInTheDocument();
      expect(screen.getByText('TestUser')).toBeInTheDocument();
      
      // Host should have Host badge
      const hostBadges = screen.getAllByText('Host');
      expect(hostBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Story Display', () => {
    it('shows "No stories yet" when no stories exist', () => {
      vi.mocked(useRoom).mockReturnValue({
        ...defaultUseRoom,
        room: createMockRoom(),
        isHost: false
      });

      render(
        <TestWrapper>
          <RoomPage />
        </TestWrapper>
      );

      expect(screen.getByText('No stories yet')).toBeInTheDocument();
    });

    it('displays stories with their information', () => {
      const story1 = createMockStory({ title: 'Story 1', status: 'voting' });
      const story2 = createMockStory({ 
        id: 'story-2', 
        title: 'Story 2', 
        status: 'closed',
        final_point: '8'
      });

      const mockRoom = createMockRoom({
        stories: [story1, story2]
      });

      vi.mocked(useRoom).mockReturnValue({
        ...defaultUseRoom,
        room: mockRoom,
        isHost: false
      });

      render(
        <TestWrapper>
          <RoomPage />
        </TestWrapper>
      );

      expect(screen.getByText('Story 1')).toBeInTheDocument();
      expect(screen.getByText('Story 2')).toBeInTheDocument();
      expect(screen.getByText('voting')).toBeInTheDocument();
      expect(screen.getByText('closed')).toBeInTheDocument();
      expect(screen.getByText('8 pts')).toBeInTheDocument();
    });

    it('highlights current story', () => {
      const story = createMockStory();
      const mockRoom = createMockRoom({
        stories: [story],
        currentStoryId: story.id
      });

      vi.mocked(useRoom).mockReturnValue({
        ...defaultUseRoom,
        room: mockRoom,
        isHost: false
      });

      render(
        <TestWrapper>
          <RoomPage />
        </TestWrapper>
      );

      const storyElement = screen.getByText('Test Story').closest('div');
      expect(storyElement).toHaveClass('border-primary');
    });
  });

  describe('Voting Interface', () => {
    beforeEach(() => {
      const story = createMockStory();
      const mockRoom = createMockRoom({
        stories: [story],
        currentStoryId: story.id
      });

      vi.mocked(useRoom).mockReturnValue({
        ...defaultUseRoom,
        room: mockRoom,
        isHost: false
      });
    });

    it('displays voting options', () => {
      render(
        <TestWrapper>
          <RoomPage />
        </TestWrapper>
      );

      expect(screen.getByText('Vote')).toBeInTheDocument();
      
      // Check for some voting options
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '?' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '☕' })).toBeInTheDocument();
    });

    it('calls vote function when voting option is clicked', () => {
      render(
        <TestWrapper>
          <RoomPage />
        </TestWrapper>
      );

      const voteButton = screen.getByRole('button', { name: '5' });
      fireEvent.click(voteButton);

      expect(mockVote).toHaveBeenCalledWith('story-1', '5');
    });

    it('does not call vote when no current story', () => {
      const mockRoom = createMockRoom({
        stories: [createMockStory()],
        currentStoryId: null
      });

      vi.mocked(useRoom).mockReturnValue({
        ...defaultUseRoom,
        room: mockRoom,
        isHost: false
      });

      render(
        <TestWrapper>
          <RoomPage />
        </TestWrapper>
      );

      const voteButton = screen.getByRole('button', { name: '5' });
      fireEvent.click(voteButton);

      expect(mockVote).not.toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      vi.mocked(useRoom).mockReturnValue({
        ...defaultUseRoom,
        room: createMockRoom(),
        isHost: false
      });
    });

    it('allows leaving the room', () => {
      render(
        <TestWrapper>
          <RoomPage />
        </TestWrapper>
      );

      const leaveButton = screen.getByRole('button', { name: 'Leave Room' });
      fireEvent.click(leaveButton);

      expect(mockLeaveRoom).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Player Status Display', () => {
    it('shows ready status for all players', () => {
      const mockRoom = createMockRoom({
        players: [
          createMockPlayer({ nickname: 'Player1' }),
          createMockPlayer({ nickname: 'Player2' })
        ]
      });

      vi.mocked(useRoom).mockReturnValue({
        ...defaultUseRoom,
        room: mockRoom,
        isHost: false
      });

      render(
        <TestWrapper>
          <RoomPage />
        </TestWrapper>
      );

      const readyBadges = screen.getAllByText('Ready');
      expect(readyBadges).toHaveLength(2);
    });
  });

  describe('Story Description Display', () => {
    it('shows story description when available', () => {
      const storyWithDescription = createMockStory({
        title: 'Story with Description',
        description: 'This is a detailed description'
      });

      const mockRoom = createMockRoom({
        stories: [storyWithDescription]
      });

      vi.mocked(useRoom).mockReturnValue({
        ...defaultUseRoom,
        room: mockRoom,
        isHost: false
      });

      render(
        <TestWrapper>
          <RoomPage />
        </TestWrapper>
      );

      expect(screen.getByText('Story with Description')).toBeInTheDocument();
      expect(screen.getByText('This is a detailed description')).toBeInTheDocument();
    });

    it('hides description when not available', () => {
      const storyWithoutDescription = createMockStory({
        title: 'Story without Description',
        description: undefined
      });

      const mockRoom = createMockRoom({
        stories: [storyWithoutDescription]
      });

      vi.mocked(useRoom).mockReturnValue({
        ...defaultUseRoom,
        room: mockRoom,
        isHost: false
      });

      render(
        <TestWrapper>
          <RoomPage />
        </TestWrapper>
      );

      expect(screen.getByText('Story without Description')).toBeInTheDocument();
      expect(screen.queryByText('This is a detailed description')).not.toBeInTheDocument();
    });
  });
});