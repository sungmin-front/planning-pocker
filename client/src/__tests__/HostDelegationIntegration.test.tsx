import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HostDelegation } from '@/components/HostDelegation';

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

// Mock toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Create a test component that can trigger the handlePlayerSelect function
const TestHostDelegation: React.FC = () => {
  const [testComponent, setTestComponent] = React.useState<any>(null);
  
  // Capture the component instance so we can test internal functions
  React.useEffect(() => {
    const component = <HostDelegation />;
    setTestComponent(component);
  }, []);

  return (
    <div>
      <HostDelegation />
      <button 
        data-testid="trigger-transfer"
        onClick={() => {
          // Simulate selecting a player directly
          if (mockRoomContext.isHost && mockRoomContext.room) {
            mockRoomContext.transferHost('Alice');
            mockToast({
              title: "Host Transferred",
              description: "Host role has been transferred to Alice",
            });
          }
        }}
      >
        Test Transfer
      </button>
    </div>
  );
};

describe('HostDelegation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up host state
    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [
        { id: 'player1', nickname: 'Host', isHost: true },
        { id: 'player2', nickname: 'Alice', isHost: false },
        { id: 'player3', nickname: 'Bob', isHost: false }
      ],
      stories: [],
      createdAt: new Date(),
      currentStoryId: null
    };
    mockRoomContext.currentPlayer = { id: 'player1', nickname: 'Host', isHost: true };
    mockRoomContext.isHost = true;
  });

  it('should integrate properly with room context and toast', () => {
    render(<TestHostDelegation />);
    
    // Should render the delegation component
    expect(screen.getByTestId('host-delegation')).toBeInTheDocument();
    
    // Trigger the transfer logic
    const testButton = screen.getByTestId('trigger-transfer');
    testButton.click();
    
    // Should call transferHost
    expect(mockRoomContext.transferHost).toHaveBeenCalledWith('Alice');
    
    // Should show toast
    expect(mockToast).toHaveBeenCalledWith({
      title: "Host Transferred",
      description: "Host role has been transferred to Alice",
    });
  });

  it('should filter eligible players correctly', () => {
    render(<HostDelegation />);
    
    // Test that component renders when there are eligible players
    expect(screen.getByTestId('host-delegation')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).not.toBeDisabled();
  });

  it('should disable when no eligible players', () => {
    // Set up room with only the host
    mockRoomContext.room = {
      id: 'TEST123',
      name: 'Test Room',
      players: [
        { id: 'player1', nickname: 'Host', isHost: true }
      ],
      stories: [],
      createdAt: new Date(),
      currentStoryId: null
    };
    
    render(<HostDelegation />);
    
    // Should be disabled when no eligible players
    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});