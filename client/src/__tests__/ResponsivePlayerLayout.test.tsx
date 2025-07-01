import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResponsivePlayerLayout } from '@/components/ResponsivePlayerLayout';

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

const mockPlayers = [
  { id: 'player1', nickname: 'Alice', isHost: true },
  { id: 'player2', nickname: 'Bob', isHost: false },
  { id: 'player3', nickname: 'Charlie', isHost: false },
  { id: 'player4', nickname: 'David', isHost: false },
  { id: 'player5', nickname: 'Eve', isHost: false },
];

const mockCurrentStory = {
  id: 'story1',
  title: 'Test Story',
  status: 'voting' as const,
  votes: {
    player1: '5',
    player2: '8',
  },
  final_point: null
};

describe('ResponsivePlayerLayout', () => {
  beforeEach(() => {
    // Reset breakpoint to desktop
    Object.assign(mockBreakpoint, {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isLargeDesktop: false,
      currentBreakpoint: 'desktop' as const,
      screenSize: { width: 1024, height: 768 },
      isMobileOrTablet: () => false,
      isTabletOrLarger: () => true,
      isDesktopOrLarger: () => true,
    });
  });

  it('should render circular layout on desktop', () => {
    render(
      <ResponsivePlayerLayout 
        players={mockPlayers}
        currentStory={mockCurrentStory}
        currentPlayerId="player1"
      />
    );
    
    expect(screen.getByTestId('responsive-player-layout')).toBeInTheDocument();
    expect(screen.getByTestId('circular-layout')).toBeInTheDocument();
    expect(screen.queryByTestId('list-layout')).not.toBeInTheDocument();
  });

  it('should render list layout on mobile', () => {
    // Set to mobile
    Object.assign(mockBreakpoint, {
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      isLargeDesktop: false,
      currentBreakpoint: 'mobile' as const,
      screenSize: { width: 375, height: 667 },
      isMobileOrTablet: () => true,
      isTabletOrLarger: () => false,
      isDesktopOrLarger: () => false,
    });

    render(
      <ResponsivePlayerLayout 
        players={mockPlayers}
        currentStory={mockCurrentStory}
        currentPlayerId="player1"
      />
    );
    
    expect(screen.getByTestId('responsive-player-layout')).toBeInTheDocument();
    expect(screen.getByTestId('list-layout')).toBeInTheDocument();
    expect(screen.queryByTestId('circular-layout')).not.toBeInTheDocument();
  });

  it('should render grid layout on tablet', () => {
    // Set to tablet
    Object.assign(mockBreakpoint, {
      isMobile: false,
      isTablet: true,
      isDesktop: false,
      isLargeDesktop: false,
      currentBreakpoint: 'tablet' as const,
      screenSize: { width: 768, height: 1024 },
      isMobileOrTablet: () => true,
      isTabletOrLarger: () => true,
      isDesktopOrLarger: () => false,
    });

    render(
      <ResponsivePlayerLayout 
        players={mockPlayers}
        currentStory={mockCurrentStory}
        currentPlayerId="player1"
      />
    );
    
    expect(screen.getByTestId('responsive-player-layout')).toBeInTheDocument();
    expect(screen.getByTestId('grid-layout')).toBeInTheDocument();
    expect(screen.queryByTestId('circular-layout')).not.toBeInTheDocument();
    expect(screen.queryByTestId('list-layout')).not.toBeInTheDocument();
  });

  it('should display all players in any layout', () => {
    render(
      <ResponsivePlayerLayout 
        players={mockPlayers}
        currentStory={mockCurrentStory}
        currentPlayerId="player1"
      />
    );
    
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText('David')).toBeInTheDocument();
    expect(screen.getByText('Eve')).toBeInTheDocument();
  });

  it('should show voting status for each player', () => {
    render(
      <ResponsivePlayerLayout 
        players={mockPlayers}
        currentStory={mockCurrentStory}
        currentPlayerId="player1"
      />
    );
    
    // Players with votes should show "Voted" badge
    expect(screen.getAllByText('Voted')).toHaveLength(2); // Alice and Bob voted
    
    // Players without votes should show "Not Voted" badge
    expect(screen.getAllByText('Not Voted')).toHaveLength(3); // Charlie, David, Eve
  });

  it('should highlight current player on mobile list layout', () => {
    // Set to mobile
    Object.assign(mockBreakpoint, {
      isMobile: true,
      currentBreakpoint: 'mobile' as const,
      isMobileOrTablet: () => true,
      isTabletOrLarger: () => false,
      isDesktopOrLarger: () => false,
    });

    render(
      <ResponsivePlayerLayout 
        players={mockPlayers}
        currentStory={mockCurrentStory}
        currentPlayerId="player2"
      />
    );
    
    const currentPlayerCard = screen.getByTestId('player-card-player2');
    expect(currentPlayerCard).toHaveClass('ring-2 ring-primary');
  });

  it('should use compact cards on mobile', () => {
    // Set to mobile
    Object.assign(mockBreakpoint, {
      isMobile: true,
      currentBreakpoint: 'mobile' as const,
      isMobileOrTablet: () => true,
      isTabletOrLarger: () => false,
      isDesktopOrLarger: () => false,
    });

    render(
      <ResponsivePlayerLayout 
        players={mockPlayers}
        currentStory={mockCurrentStory}
        currentPlayerId="player1"
      />
    );
    
    const playerCards = screen.getAllByTestId(/player-card-/);
    playerCards.forEach(card => {
      expect(card).toHaveClass('p-3'); // Compact padding
    });
  });

  it('should use standard cards on desktop', () => {
    render(
      <ResponsivePlayerLayout 
        players={mockPlayers}
        currentStory={mockCurrentStory}
        currentPlayerId="player1"
      />
    );
    
    const playerCards = screen.getAllByTestId(/player-card-/);
    playerCards.forEach(card => {
      expect(card).toHaveClass('p-4'); // Standard padding
    });
  });

  it('should handle empty player list', () => {
    render(
      <ResponsivePlayerLayout 
        players={[]}
        currentStory={mockCurrentStory}
        currentPlayerId="player1"
      />
    );
    
    expect(screen.getByTestId('responsive-player-layout')).toBeInTheDocument();
    expect(screen.getByText('No players in room')).toBeInTheDocument();
  });

  it('should handle no current story', () => {
    render(
      <ResponsivePlayerLayout 
        players={mockPlayers}
        currentStory={null}
        currentPlayerId="player1"
      />
    );
    
    expect(screen.getByTestId('responsive-player-layout')).toBeInTheDocument();
    // Should still show players but without voting status
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Voted')).not.toBeInTheDocument();
  });

  it('should optimize grid columns for tablet based on player count', () => {
    // Set to tablet
    Object.assign(mockBreakpoint, {
      isMobile: false,
      isTablet: true,
      currentBreakpoint: 'tablet' as const,
      isMobileOrTablet: () => true,
      isTabletOrLarger: () => true,
      isDesktopOrLarger: () => false,
    });

    // Test with 3 players
    const { rerender } = render(
      <ResponsivePlayerLayout 
        players={mockPlayers.slice(0, 3)}
        currentStory={mockCurrentStory}
        currentPlayerId="player1"
      />
    );
    
    const gridLayout = screen.getByTestId('grid-layout');
    expect(gridLayout).toHaveClass('grid-cols-2'); // 2 columns for small count
    
    // Test with 6 players
    rerender(
      <ResponsivePlayerLayout 
        players={[...mockPlayers, { id: 'player6', nickname: 'Frank', isHost: false }]}
        currentStory={mockCurrentStory}
        currentPlayerId="player1"
      />
    );
    
    expect(gridLayout).toHaveClass('grid-cols-3'); // 3 columns for larger count
  });

  it('should provide proper accessibility in all layouts', () => {
    render(
      <ResponsivePlayerLayout 
        players={mockPlayers}
        currentStory={mockCurrentStory}
        currentPlayerId="player1"
      />
    );
    
    // Should have proper ARIA labels
    expect(screen.getByLabelText(/players in room/i)).toBeInTheDocument();
    
    // Each player card should be identifiable
    mockPlayers.forEach(player => {
      expect(screen.getByTestId(`player-card-${player.id}`)).toBeInTheDocument();
    });
  });

  it('should handle revealed votes properly', () => {
    const revealedStory = {
      ...mockCurrentStory,
      status: 'revealed' as const,
    };

    render(
      <ResponsivePlayerLayout 
        players={mockPlayers}
        currentStory={revealedStory}
        currentPlayerId="player1"
      />
    );
    
    // Should show actual vote values when revealed
    expect(screen.getByText('5')).toBeInTheDocument(); // Alice's vote
    expect(screen.getByText('8')).toBeInTheDocument(); // Bob's vote
  });

  it('should scroll properly on mobile with many players', () => {
    // Set to mobile
    Object.assign(mockBreakpoint, {
      isMobile: true,
      currentBreakpoint: 'mobile' as const,
      isMobileOrTablet: () => true,
      isTabletOrLarger: () => false,
      isDesktopOrLarger: () => false,
    });

    const manyPlayers = Array.from({ length: 15 }, (_, i) => ({
      id: `player${i + 1}`,
      nickname: `Player ${i + 1}`,
      isHost: i === 0,
    }));

    render(
      <ResponsivePlayerLayout 
        players={manyPlayers}
        currentStory={mockCurrentStory}
        currentPlayerId="player1"
      />
    );
    
    const listLayout = screen.getByTestId('list-layout');
    expect(listLayout).toHaveClass('overflow-y-auto'); // Scrollable
  });
});