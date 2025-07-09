import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResponsivePlayerLayout } from '../ResponsivePlayerLayout';
import { Player, Story } from '@/types';

// Mock window.innerWidth for responsive behavior
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
});

const mockPlayers: Player[] = [
  { id: 'player1', nickname: 'Alice', socketId: 'socket1', isHost: false, isSpectator: false },
  { id: 'player2', nickname: 'Bob', socketId: 'socket2', isHost: false, isSpectator: false },
  { id: 'player3', nickname: 'Charlie', socketId: 'socket3', isHost: false, isSpectator: false },
];

const mockStoryVoting: Story = {
  id: 'story1',
  title: 'Test Story',
  description: 'Test description',
  votes: {
    'player1': '5',
    'player2': '3',
    'player3': '8'
  },
  status: 'voting',
  finalPoint: null,
  createdAt: new Date(),
};

const mockStoryRevealed: Story = {
  ...mockStoryVoting,
  status: 'revealed',
};

describe('ResponsivePlayerLayout', () => {
  it('shows correct vote count during voting state', () => {
    render(
      <ResponsivePlayerLayout
        players={mockPlayers}
        currentStory={mockStoryVoting}
      />
    );

    expect(screen.getByText('3/3 voted')).toBeInTheDocument();
  });

  it('shows correct vote count during partial voting', () => {
    const partialVotingStory: Story = {
      ...mockStoryVoting,
      votes: {
        'player1': '5',
        'player2': '3',
        // player3 hasn't voted yet
      },
    };

    render(
      <ResponsivePlayerLayout
        players={mockPlayers}
        currentStory={partialVotingStory}
      />
    );

    expect(screen.getByText('2/3 voted')).toBeInTheDocument();
  });

  it('maintains correct vote count when players join during revealed state', () => {
    // Add a new player who didn't vote
    const playersWithNewJoiner: Player[] = [
      ...mockPlayers,
      { id: 'player4', nickname: 'David', socketId: 'socket4', isHost: false, isSpectator: false },
    ];

    render(
      <ResponsivePlayerLayout
        players={playersWithNewJoiner}
        currentStory={mockStoryRevealed}
      />
    );

    // Should show "Votes revealed!" and not display vote count
    expect(screen.getByText('Votes revealed!')).toBeInTheDocument();
    expect(screen.queryByText(/voted/)).not.toBeInTheDocument();
  });

  it('shows "View Statistics" button when votes are revealed', () => {
    const mockOnOpenStatsModal = jest.fn();
    
    render(
      <ResponsivePlayerLayout
        players={mockPlayers}
        currentStory={mockStoryRevealed}
        onOpenStatsModal={mockOnOpenStatsModal}
      />
    );

    expect(screen.getByText('View Statistics')).toBeInTheDocument();
  });

  it('shows "Statistics are open" when stats modal is open', () => {
    render(
      <ResponsivePlayerLayout
        players={mockPlayers}
        currentStory={mockStoryRevealed}
        isStatsModalOpen={true}
      />
    );

    expect(screen.getByText('Statistics are open')).toBeInTheDocument();
  });

  it('shows waiting message when no players are present', () => {
    render(
      <ResponsivePlayerLayout
        players={[]}
        currentStory={mockStoryVoting}
      />
    );

    expect(screen.getByText('Waiting for players to join...')).toBeInTheDocument();
  });

  it('shows ready message when no story is selected', () => {
    render(
      <ResponsivePlayerLayout
        players={mockPlayers}
        currentStory={null}
      />
    );

    expect(screen.getByText('Ready to start voting')).toBeInTheDocument();
  });
});