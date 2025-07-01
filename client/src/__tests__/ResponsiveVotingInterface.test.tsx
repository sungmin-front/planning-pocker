import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResponsiveVotingInterface } from '@/components/ResponsiveVotingInterface';

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

// Mock the breakpoint hook
const mockBreakpoint = {
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  isLargeDesktop: false,
  currentBreakpoint: 'desktop' as const,
  screenSize: { width: 1024, height: 768 },
  isMobileOrTablet: () => false,
  isTabletOrLarger: () => true,
  isDesktopOrLarger: () => true,
};

vi.mock('@/hooks/useBreakpoint', () => ({
  useBreakpoint: () => mockBreakpoint
}));

describe('ResponsiveVotingInterface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default room state
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
          status: 'voting' as const,
          votes: {},
          final_point: null
        }
      ],
      createdAt: new Date(),
      currentStoryId: 'story1'
    };
    mockRoomContext.currentPlayer = { id: 'player1', nickname: 'Alice', isHost: false };
    
    // Reset breakpoint to desktop
    Object.assign(mockBreakpoint, {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isLargeDesktop: false,
      currentBreakpoint: 'desktop' as const,
      isMobileOrTablet: () => false,
      isTabletOrLarger: () => true,
      isDesktopOrLarger: () => true,
    });
  });

  it('should render desktop layout on desktop screens', () => {
    render(<ResponsiveVotingInterface />);
    
    expect(screen.getByTestId('voting-interface')).toBeInTheDocument();
    expect(screen.getByTestId('desktop-vote-grid')).toBeInTheDocument();
    expect(screen.queryByTestId('mobile-vote-grid')).not.toBeInTheDocument();
  });

  it('should render mobile layout on mobile screens', () => {
    // Set to mobile
    Object.assign(mockBreakpoint, {
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      isLargeDesktop: false,
      currentBreakpoint: 'mobile' as const,
      isMobileOrTablet: () => true,
      isTabletOrLarger: () => false,
      isDesktopOrLarger: () => false,
    });

    render(<ResponsiveVotingInterface />);
    
    expect(screen.getByTestId('voting-interface')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-vote-grid')).toBeInTheDocument();
    expect(screen.queryByTestId('desktop-vote-grid')).not.toBeInTheDocument();
  });

  it('should render tablet layout on tablet screens', () => {
    // Set to tablet
    Object.assign(mockBreakpoint, {
      isMobile: false,
      isTablet: true,
      isDesktop: false,
      isLargeDesktop: false,
      currentBreakpoint: 'tablet' as const,
      isMobileOrTablet: () => true,
      isTabletOrLarger: () => true,
      isDesktopOrLarger: () => false,
    });

    render(<ResponsiveVotingInterface />);
    
    expect(screen.getByTestId('voting-interface')).toBeInTheDocument();
    expect(screen.getByTestId('tablet-vote-grid')).toBeInTheDocument();
    expect(screen.queryByTestId('desktop-vote-grid')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mobile-vote-grid')).not.toBeInTheDocument();
  });

  it('should show standard vote options on all screen sizes', () => {
    render(<ResponsiveVotingInterface />);
    
    // Standard Fibonacci sequence + special votes
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('13')).toBeInTheDocument();
    expect(screen.getByText('?')).toBeInTheDocument();
    expect(screen.getByText('☕')).toBeInTheDocument();
  });

  it('should use larger touch targets on mobile', () => {
    // Set to mobile
    Object.assign(mockBreakpoint, {
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      isLargeDesktop: false,
      currentBreakpoint: 'mobile' as const,
      isMobileOrTablet: () => true,
      isTabletOrLarger: () => false,
      isDesktopOrLarger: () => false,
    });

    render(<ResponsiveVotingInterface />);
    
    const voteButtons = screen.getAllByRole('button');
    voteButtons.forEach(button => {
      // Mobile buttons should have larger touch targets
      expect(button).toHaveClass('h-14'); // 56px height for better touch targets
    });
  });

  it('should use standard button sizes on desktop', () => {
    render(<ResponsiveVotingInterface />);
    
    const voteButtons = screen.getAllByRole('button');
    voteButtons.forEach(button => {
      // Desktop buttons should use standard size
      expect(button).toHaveClass('h-12'); // 48px height
    });
  });

  it('should call vote function when option is selected', () => {
    render(<ResponsiveVotingInterface />);
    
    const voteButton = screen.getByText('5');
    voteButton.click();
    
    expect(mockRoomContext.vote).toHaveBeenCalledWith('story1', '5');
  });

  it('should handle no current story gracefully', () => {
    mockRoomContext.room!.currentStoryId = null;
    
    const { container } = render(<ResponsiveVotingInterface />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should not render when story is not in voting state', () => {
    mockRoomContext.room!.stories[0].status = 'revealed';
    
    const { container } = render(<ResponsiveVotingInterface />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should highlight selected vote on all screen sizes', () => {
    // User has already voted for '8'
    mockRoomContext.room!.stories[0].votes = { player1: '8' };
    
    render(<ResponsiveVotingInterface />);
    
    const selectedButton = screen.getByLabelText('Vote for 8 points');
    expect(selectedButton).toHaveClass('bg-primary');
    expect(selectedButton).toHaveClass('text-primary-foreground');
  });

  it('should show compact layout for smaller mobile screens', () => {
    // Set to mobile with smaller screen
    Object.assign(mockBreakpoint, {
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      isLargeDesktop: false,
      currentBreakpoint: 'mobile' as const,
      screenSize: { width: 360, height: 640 }, // Small mobile
      isMobileOrTablet: () => true,
      isTabletOrLarger: () => false,
      isDesktopOrLarger: () => false,
    });

    render(<ResponsiveVotingInterface />);
    
    // Should use more compact grid for very small screens
    const mobileGrid = screen.getByTestId('mobile-vote-grid');
    expect(mobileGrid).toHaveClass('grid-cols-4'); // 4 columns instead of 5 for small screens
  });

  it('should provide proper accessibility on all screen sizes', () => {
    render(<ResponsiveVotingInterface />);
    
    const voteButtons = screen.getAllByRole('button');
    voteButtons.forEach(button => {
      expect(button).toHaveAttribute('type', 'button');
      expect(button).toHaveAttribute('aria-label');
    });
  });

  it('should adapt spacing for different screen sizes', () => {
    // Test mobile spacing
    Object.assign(mockBreakpoint, {
      isMobile: true,
      currentBreakpoint: 'mobile' as const,
      isMobileOrTablet: () => true,
    });

    const { rerender } = render(<ResponsiveVotingInterface />);
    
    const mobileContainer = screen.getByTestId('voting-interface');
    expect(mobileContainer).toHaveClass('p-4'); // Mobile padding
    
    // Test desktop spacing
    Object.assign(mockBreakpoint, {
      isMobile: false,
      isDesktop: true,
      currentBreakpoint: 'desktop' as const,
      isMobileOrTablet: () => false,
      isDesktopOrLarger: () => true,
    });

    rerender(<ResponsiveVotingInterface />);
    
    const desktopContainer = screen.getByTestId('voting-interface');
    expect(desktopContainer).toHaveClass('p-6'); // Desktop padding
  });
});