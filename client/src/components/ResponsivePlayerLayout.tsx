import React from 'react';
import { PlayerCard } from '@/components/PlayerCard';
import { cn } from '@/lib/utils';
import { Player, Story } from '@/types';

interface ResponsivePlayerLayoutProps {
  players: Player[];
  currentStory: Story | null;
  currentPlayerId: string;
}

export const ResponsivePlayerLayout: React.FC<ResponsivePlayerLayoutProps> = ({
  players,
  currentStory,
  currentPlayerId,
}) => {
  if (players.length === 0) {
    return (
      <div 
        data-testid="responsive-player-layout"
        className="flex flex-col items-center justify-center h-96 text-gray-500"
      >
        <p className="text-lg">Waiting for players to join...</p>
      </div>
    );
  }

  // Determine if votes are revealed
  const isRevealed = currentStory?.status === 'revealed';

  // Get vote status for a player
  const getPlayerVoteStatus = (player: Player) => {
    if (!currentStory) return null;
    
    const hasVoted = player.id in currentStory.votes;
    const voteValue = currentStory.votes[player.id];
    
    return {
      hasVoted,
      vote: isRevealed ? voteValue : null,
      showVote: isRevealed,
    };
  };

  const renderCircularTable = () => {
    const centerX = 300; // Center X coordinate
    const centerY = 250; // Center Y coordinate
    const radius = Math.max(180, players.length * 25); // Dynamic radius based on player count

    return (
      <div 
        data-testid="circular-table"
        className="relative w-full h-96 flex items-center justify-center"
      >
        {/* Center message */}
        <div className="absolute inset-0 flex items-center justify-center z-0">
          <div className="text-center">
            {currentStory ? (
              <div className="bg-blue-50 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-medium text-blue-900 mb-2">
                  {currentStory.title}
                </h3>
                <p className="text-blue-700">
                  {isRevealed ? 'Votes revealed!' : 'Pick your cards!'}
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-6 shadow-sm">
                <p className="text-gray-600">Ready to start voting</p>
              </div>
            )}
          </div>
        </div>

        {/* Players positioned in circle */}
        {players.map((player, index) => {
          const voteStatus = getPlayerVoteStatus(player);
          
          // Calculate position around circle
          const angle = (index / players.length) * 2 * Math.PI - Math.PI / 2; // Start from top
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          
          return (
            <div
              key={player.id}
              data-testid={`player-card-${player.id}`}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
              style={{
                left: `${x}px`,
                top: `${y}px`,
              }}
            >
              <PlayerCard
                player={player}
                vote={voteStatus?.vote ? String(voteStatus.vote) : undefined}
                hasVoted={voteStatus?.hasVoted}
                showVote={voteStatus?.showVote}
                showActions={false}
                isConnected={true}
              />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div 
      data-testid="responsive-player-layout"
      className="w-full"
      aria-label={`${players.length} players in room`}
    >
      <div className="bg-white rounded-lg p-6">
        {renderCircularTable()}
      </div>
    </div>
  );
};