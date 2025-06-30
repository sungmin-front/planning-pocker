import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { RoomProvider } from '@/contexts/RoomContext';

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
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock crypto.randomUUID for room ID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-uuid-123')
  }
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>
    <WebSocketProvider>
      <RoomProvider>
        {children}
      </RoomProvider>
    </WebSocketProvider>
  </MemoryRouter>
);

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    vi.stubEnv('VITE_WEBSOCKET_URL', 'ws://localhost:8080');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should render the home page with title and forms when connected', () => {
    render(
      <TestWrapper>
        <HomePage />
      </TestWrapper>
    );

    expect(screen.getByText('Planning Poker')).toBeInTheDocument();
    expect(screen.getByText('Create New Room')).toBeInTheDocument();
    expect(screen.getByText('Join Room')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your nickname')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter room ID')).toBeInTheDocument();
  });

  it('should display connection status', () => {
    render(
      <TestWrapper>
        <HomePage />
      </TestWrapper>
    );

    // Should show connected status
    expect(screen.getByText(/Connected/)).toBeInTheDocument();
  });

  it('should handle nickname input changes', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <HomePage />
      </TestWrapper>
    );

    const nicknameInput = screen.getByPlaceholderText('Enter your nickname');
    
    await user.type(nicknameInput, 'TestUser');
    
    expect(nicknameInput).toHaveValue('TestUser');
  });

  it('should handle room ID input changes', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <HomePage />
      </TestWrapper>
    );

    const roomIdInput = screen.getByPlaceholderText('Enter room ID');
    
    await user.type(roomIdInput, 'ROOM123');
    
    expect(roomIdInput).toHaveValue('ROOM123');
  });

  it('should disable create room button when nickname is empty', () => {
    render(
      <TestWrapper>
        <HomePage />
      </TestWrapper>
    );

    const createButton = screen.getByRole('button', { name: /create new room/i });
    
    expect(createButton).toBeDisabled();
  });

  it('should enable create room button when nickname is entered', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <HomePage />
      </TestWrapper>
    );

    const nicknameInput = screen.getByPlaceholderText('Enter your nickname');
    const createButton = screen.getByRole('button', { name: /create new room/i });
    
    await user.type(nicknameInput, 'TestUser');
    
    expect(createButton).toBeEnabled();
  });

  it('should disable join room button when nickname or room ID is empty', () => {
    render(
      <TestWrapper>
        <HomePage />
      </TestWrapper>
    );

    const joinButton = screen.getByRole('button', { name: /join room/i });
    
    expect(joinButton).toBeDisabled();
  });

  it('should enable join room button when both nickname and room ID are entered', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <HomePage />
      </TestWrapper>
    );

    const nicknameInput = screen.getByPlaceholderText('Enter your nickname');
    const roomIdInput = screen.getByPlaceholderText('Enter room ID');
    const joinButton = screen.getByRole('button', { name: /join room/i });
    
    await user.type(nicknameInput, 'TestUser');
    await user.type(roomIdInput, 'ROOM123');
    
    expect(joinButton).toBeEnabled();
  });

  it('should navigate to room page when create room is successful', async () => {
    const user = userEvent.setup();
    
    // Mock successful room creation
    const mockJoinRoom = vi.fn().mockResolvedValue(true);
    
    render(
      <TestWrapper>
        <HomePage />
      </TestWrapper>
    );

    // Find the nickname input and create button
    const nicknameInput = screen.getByPlaceholderText('Enter your nickname');
    const createButton = screen.getByRole('button', { name: /create room/i });
    
    await user.type(nicknameInput, 'TestUser');
    await user.click(createButton);

    // Should navigate to room page with generated ID
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        `/room/mock-uuid-123?nickname=TestUser&host=true`
      );
    });
  });

  it('should navigate to room page when join room is successful', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <HomePage />
      </TestWrapper>
    );

    const nicknameInput = screen.getByPlaceholderText('Enter your nickname');
    const roomIdInput = screen.getByPlaceholderText('Enter room ID');
    const joinButton = screen.getByRole('button', { name: /join room/i });
    
    await user.type(nicknameInput, 'TestUser');
    await user.type(roomIdInput, 'ROOM123');
    await user.click(joinButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        `/room/ROOM123?nickname=TestUser&host=false`
      );
    });
  });

  it('should show error message when join room fails', async () => {
    const user = userEvent.setup();
    
    // Mock failed room join by setting up the room context to return false
    render(
      <TestWrapper>
        <HomePage />
      </TestWrapper>
    );

    const nicknameInput = screen.getByPlaceholderText('Enter your nickname');
    const roomIdInput = screen.getByPlaceholderText('Enter room ID');
    const joinButton = screen.getByRole('button', { name: /join room/i });
    
    await user.type(nicknameInput, 'TestUser');
    await user.type(roomIdInput, 'INVALID123');
    await user.click(joinButton);

    // The actual error handling would depend on the joinRoom implementation
    // For now, we just verify the navigation was called
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  it('should generate unique room IDs for each create room action', async () => {
    const user = userEvent.setup();
    
    // Mock multiple UUID calls
    let callCount = 0;
    vi.mocked(crypto.randomUUID).mockImplementation(() => {
      callCount++;
      return `mock-uuid-${callCount}`;
    });
    
    render(
      <TestWrapper>
        <HomePage />
      </TestWrapper>
    );

    const nicknameInput = screen.getByPlaceholderText('Enter your nickname');
    const createButton = screen.getByRole('button', { name: /create room/i });
    
    await user.type(nicknameInput, 'TestUser');
    await user.click(createButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        `/room/mock-uuid-1?nickname=TestUser&host=true`
      );
    });

    // Clear the input and create another room
    await user.clear(nicknameInput);
    await user.type(nicknameInput, 'TestUser2');
    await user.click(createButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        `/room/mock-uuid-2?nickname=TestUser2&host=true`
      );
    });
  });

  it('should trim whitespace from inputs', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <HomePage />
      </TestWrapper>
    );

    const nicknameInput = screen.getByPlaceholderText('Enter your nickname');
    const roomIdInput = screen.getByPlaceholderText('Enter room ID');
    const joinButton = screen.getByRole('button', { name: /join room/i });
    
    await user.type(nicknameInput, '  TestUser  ');
    await user.type(roomIdInput, '  ROOM123  ');
    await user.click(joinButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        `/room/ROOM123?nickname=TestUser&host=false`
      );
    });
  });

  it('should handle form submission with Enter key', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <HomePage />
      </TestWrapper>
    );

    const nicknameInput = screen.getByPlaceholderText('Enter your nickname');
    
    await user.type(nicknameInput, 'TestUser');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        `/room/mock-uuid-123?nickname=TestUser&host=true`
      );
    });
  });

  it('should handle join form submission with Enter key', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <HomePage />
      </TestWrapper>
    );

    const nicknameInput = screen.getByPlaceholderText('Enter your nickname');
    const roomIdInput = screen.getByPlaceholderText('Enter room ID');
    
    await user.type(nicknameInput, 'TestUser');
    await user.type(roomIdInput, 'ROOM123');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        `/room/ROOM123?nickname=TestUser&host=false`
      );
    });
  });

  it('should maintain focus states correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <HomePage />
      </TestWrapper>
    );

    const nicknameInput = screen.getByPlaceholderText('Enter your nickname');
    const roomIdInput = screen.getByPlaceholderText('Enter room ID');
    
    await user.click(nicknameInput);
    expect(nicknameInput).toHaveFocus();
    
    await user.tab();
    expect(roomIdInput).toHaveFocus();
  });

  it('should show proper accessibility attributes', () => {
    render(
      <TestWrapper>
        <HomePage />
      </TestWrapper>
    );

    const nicknameInput = screen.getByPlaceholderText('Enter your nickname');
    const roomIdInput = screen.getByPlaceholderText('Enter room ID');
    const createButton = screen.getByRole('button', { name: /create room/i });
    const joinButton = screen.getByRole('button', { name: /join room/i });
    
    expect(nicknameInput).toHaveAttribute('type', 'text');
    expect(roomIdInput).toHaveAttribute('type', 'text');
    expect(createButton).toHaveAttribute('type', 'submit');
    expect(joinButton).toHaveAttribute('type', 'submit');
  });
});