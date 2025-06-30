import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RoomPage } from '@/pages/RoomPage';

// Mock the contexts completely
vi.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({
    isConnected: true,
    connect: vi.fn(),
    disconnect: vi.fn(),
    sendMessage: vi.fn(),
  }),
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/contexts/RoomContext', () => ({
  useRoom: () => ({
    room: null,
    currentPlayer: null,
    isHost: false,
    joinRoom: vi.fn().mockResolvedValue(true),
    leaveRoom: vi.fn(),
    createStory: vi.fn(),
    vote: vi.fn(),
    revealVotes: vi.fn(),
    restartVoting: vi.fn(),
    setFinalPoint: vi.fn(),
    transferHost: vi.fn(),
    syncRoom: vi.fn(),
  }),
  RoomProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock useParams and useSearchParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ roomId: 'test-room-123' }),
    useSearchParams: () => [new URLSearchParams('nickname=TestUser&host=false'), vi.fn()],
    useNavigate: () => vi.fn(),
  };
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter initialEntries={['/room/test-room-123?nickname=TestUser&host=false']}>
    {children}
  </MemoryRouter>
);

describe('RoomPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state when no room data', () => {
    render(
      <TestWrapper>
        <RoomPage />
      </TestWrapper>
    );

    expect(screen.getByText('Loading room...')).toBeInTheDocument();
  });

  it('should render room page component', () => {
    render(
      <TestWrapper>
        <RoomPage />
      </TestWrapper>
    );

    // Should render the room page structure
    expect(screen.getByText('Loading room...')).toBeInTheDocument();
  });
});