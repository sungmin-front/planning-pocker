import React from 'react';
import { render } from '@testing-library/react';
import { VoteProgressRing } from '../VoteProgressRing';
import { Player, Story } from '@/types';

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

describe('VoteProgressRing', () => {
  it('calculates correct progress during voting state', () => {
    const { container } = render(
      <VoteProgressRing
        players={mockPlayers}
        currentStory={mockStoryVoting}
      />
    );

    // With 3 players and 3 votes, progress should be 100%
    const progressPath = container.querySelector('path:last-child');
    expect(progressPath).toHaveAttribute('stroke', '#10b981'); // green for 100%
  });

  it('maintains correct progress when players join during revealed state', () => {
    // Add a new player who didn't vote
    const playersWithNewJoiner: Player[] = [
      ...mockPlayers,
      { id: 'player4', nickname: 'David', socketId: 'socket4', isHost: false, isSpectator: false },
    ];

    const { container } = render(
      <VoteProgressRing
        players={playersWithNewJoiner}
        currentStory={mockStoryRevealed}
      />
    );

    // Even with 4 players, the revealed votes should still show 100% completion
    // because voting was completed when there were only 3 players
    const progressPath = container.querySelector('path:last-child');
    expect(progressPath).toHaveAttribute('stroke', '#10b981'); // should still be green for 100%
  });

  it('maintains correct progress when players leave during revealed state', () => {
    // Remove a player who voted
    const playersWithLeaver = mockPlayers.slice(0, 2);

    const { container } = render(
      <VoteProgressRing
        players={playersWithLeaver}
        currentStory={mockStoryRevealed}
      />
    );

    // Even with 2 players, the revealed votes should still show 100% completion
    // because voting was completed when there were 3 players
    const progressPath = container.querySelector('path:last-child');
    expect(progressPath).toHaveAttribute('stroke', '#10b981'); // should still be green for 100%
  });

  it('shows partial progress during voting state', () => {
    const partialVotingStory: Story = {
      ...mockStoryVoting,
      votes: {
        'player1': '5',
        'player2': '3',
        // player3 hasn't voted yet
      },
    };

    const { container } = render(
      <VoteProgressRing
        players={mockPlayers}
        currentStory={partialVotingStory}
      />
    );

    // With 3 players and 2 votes, progress should be 66.67%
    const progressPath = container.querySelector('path:last-child');
    expect(progressPath).toHaveAttribute('stroke', '#f59e0b'); // amber for 50%+
  });

  it('renders nothing when no story is provided', () => {
    const { container } = render(
      <VoteProgressRing
        players={mockPlayers}
        currentStory={null}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when no players are provided', () => {
    const { container } = render(
      <VoteProgressRing
        players={[]}
        currentStory={mockStoryVoting}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});