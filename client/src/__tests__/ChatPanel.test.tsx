import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ChatPanel } from '../components/ChatPanel';
import { useRoom } from '../contexts/RoomContext';
import { ChatMessage } from '@planning-poker/shared';

// Mock the useRoom hook
vi.mock('../contexts/RoomContext');

const mockSendChatMessage = vi.fn();
const mockRequestChatHistory = vi.fn();
const mockStartTyping = vi.fn();
const mockStopTyping = vi.fn();

const mockChatMessages: ChatMessage[] = [
  {
    id: '1',
    playerId: 'player-1',
    playerNickname: 'Alice',
    message: 'Hello everyone!',
    timestamp: new Date('2023-01-01T10:00:00Z'),
    roomId: 'test-room'
  },
  {
    id: '2',
    playerId: 'player-2',
    playerNickname: 'Bob',
    message: 'Ready to start voting?',
    timestamp: new Date('2023-01-01T10:01:00Z'),
    roomId: 'test-room'
  }
];

describe('ChatPanel', () => {
  const mockUseRoom = useRoom as vi.MockedFunction<typeof useRoom>;

  beforeEach(() => {
    // Mock scrollIntoView for all tests
    Element.prototype.scrollIntoView = vi.fn();
    
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(() => null), // Return null by default
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    mockUseRoom.mockReturnValue({
      room: {
        id: 'test-room',
        name: 'Test Room',
        players: [],
        stories: [],
        hostId: 'host-id',
        chatMessages: mockChatMessages,
        currentStoryId: null,
        settings: {
          votingSystem: 'fibonacci',
          isPrivate: false,
          jiraIntegration: null,
          autoReveal: false,
          cardSet: 'fibonacci'
        },
        roomType: 'standard',
        lastActivity: new Date()
      },
      currentPlayer: {
        id: 'current-player',
        nickname: 'CurrentUser',
        isHost: false,
        isConnected: true,
        joinedAt: new Date()
      },
      sendChatMessage: mockSendChatMessage,
      requestChatHistory: mockRequestChatHistory,
      startTyping: mockStartTyping,
      stopTyping: mockStopTyping,
      // Mock other required properties
      isHost: false,
      joinRoom: vi.fn(),
      leaveRoom: vi.fn(),
      vote: vi.fn(),
      syncRoom: vi.fn(),
      joinError: null,
      nicknameSuggestions: [],
      clearJoinError: vi.fn()
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders chat messages', () => {
    render(<ChatPanel />);
    
    expect(screen.getByText('Hello everyone!')).toBeInTheDocument();
    expect(screen.getByText('Ready to start voting?')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('sends chat message when form is submitted', async () => {
    render(<ChatPanel />);
    
    const input = screen.getByPlaceholderText(/Type your message/);
    const submitButton = screen.getByRole('button', { name: /send/i });
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockSendChatMessage).toHaveBeenCalledWith('Test message');
    });
    
    // Input should be cleared after sending
    expect(input).toHaveValue('');
  });

  it('prevents sending empty messages', () => {
    render(<ChatPanel />);
    
    const input = screen.getByPlaceholderText(/Type your message/);
    const submitButton = screen.getByRole('button', { name: /send/i });
    
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(submitButton);
    
    expect(mockSendChatMessage).not.toHaveBeenCalled();
  });

  it('limits message length to 1000 characters', () => {
    render(<ChatPanel />);
    
    const input = screen.getByPlaceholderText(/Type your message/);
    
    // First test a valid message works
    fireEvent.change(input, { target: { value: 'short message' } });
    expect(input).toHaveValue('short message');
    
    // Test exactly 1000 characters works
    const exactMessage = 'a'.repeat(1000);
    fireEvent.change(input, { target: { value: exactMessage } });
    expect(input).toHaveValue(exactMessage);
    
    // Test 1001 characters is rejected (previous value should remain)
    const longMessage = 'a'.repeat(1001);
    fireEvent.change(input, { target: { value: longMessage } });
    expect(input).toHaveValue(exactMessage); // Should still be 1000 'a's
  });

  it('requests chat history on mount', () => {
    render(<ChatPanel />);
    
    expect(mockRequestChatHistory).toHaveBeenCalled();
  });

  it('can be toggled open and closed with persistence', () => {
    const localStorageMock = window.localStorage as any;
    localStorageMock.getItem.mockReturnValue(null); // No saved state initially
    
    render(<ChatPanel />);
    
    const toggleButton = screen.getByRole('button', { name: /minimize chat/i });
    
    // Initially open (default)
    expect(screen.getByText('Hello everyone!')).toBeInTheDocument();
    
    // Click to close
    fireEvent.click(toggleButton);
    
    // Should save state to localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith('planning-poker-chat-panel-open', 'false');
    
    // The content is still in DOM but with opacity-0 and max-h-0 classes due to CSS transitions
    const contentContainer = screen.getByText('Hello everyone!').closest('.transition-all');
    expect(contentContainer).toHaveClass('max-h-0', 'opacity-0');
    
    // Click to open
    const expandButton = screen.getByRole('button', { name: /expand chat/i });
    fireEvent.click(expandButton);
    
    // Should save open state to localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith('planning-poker-chat-panel-open', 'true');
    
    // Content should be visible again
    expect(contentContainer).toHaveClass('max-h-screen', 'opacity-100');
  });

  it('auto-scrolls to bottom when new messages arrive', async () => {
    const { rerender } = render(<ChatPanel />);
    
    // Mock scrollIntoView
    const mockScrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = mockScrollIntoView;
    
    // Add a new message
    mockUseRoom.mockReturnValue({
      ...mockUseRoom(),
      room: {
        ...mockUseRoom().room!,
        chatMessages: [
          ...mockChatMessages,
          {
            id: '3',
            content: 'New message',
            sender: 'Charlie',
            timestamp: new Date('2023-01-01T10:02:00Z'),
            roomId: 'test-room'
          }
        ]
      }
    });
    
    rerender(<ChatPanel />);
    
    await waitFor(() => {
      expect(mockScrollIntoView).toHaveBeenCalled();
    });
  });

  it('shows unread message indicators when panel is closed', async () => {
    const localStorageMock = window.localStorage as any;
    localStorageMock.getItem.mockReturnValue(null);
    
    const { rerender } = render(<ChatPanel />);
    
    // Close the panel
    const toggleButton = screen.getByRole('button', { name: /minimize chat/i });
    fireEvent.click(toggleButton);
    
    // Add new messages while panel is closed
    mockUseRoom.mockReturnValue({
      ...mockUseRoom(),
      room: {
        ...mockUseRoom().room!,
        chatMessages: [
          ...mockChatMessages,
          {
            id: '3',
            content: 'New message while closed',
            sender: 'Charlie',
            timestamp: new Date('2023-01-01T10:02:00Z'),
            roomId: 'test-room'
          }
        ]
      }
    });
    
    rerender(<ChatPanel />);
    
    // Should show unread badge
    await waitFor(() => {
      const unreadBadge = screen.getByText('1'); // 1 unread message
      expect(unreadBadge).toBeInTheDocument();
      expect(unreadBadge.closest('.animate-pulse')).toBeInTheDocument();
    });
  });

  it('calls startTyping when user starts typing', () => {
    const localStorageMock = window.localStorage as any;
    localStorageMock.getItem.mockReturnValue(null);
    
    render(<ChatPanel />);
    
    const input = screen.getByPlaceholderText(/Type your message/);
    
    // Start typing
    fireEvent.change(input, { target: { value: 'Hello' } });
    
    expect(mockStartTyping).toHaveBeenCalled();
  });

  it('shows typing indicators for other users', () => {
    const localStorageMock = window.localStorage as any;
    localStorageMock.getItem.mockReturnValue(null);
    
    // Mock room with typing users
    mockUseRoom.mockReturnValue({
      ...mockUseRoom(),
      room: {
        ...mockUseRoom().room!,
        typingUsers: [
          {
            playerId: 'other-player',
            playerNickname: 'Alice',
            roomId: 'test-room',
            timestamp: new Date()
          }
        ]
      }
    });
    
    render(<ChatPanel />);
    
    expect(screen.getByText('Alice is typing...')).toBeInTheDocument();
  });
});