import React from 'react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { PlayerCard } from '@/components/PlayerCard';
import { cn } from '@/lib/utils';
import { Player, Story } from '@/types';
import { Users } from 'lucide-react';

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
  const { isMobile, isTablet } = useBreakpoint();

  if (players.length === 0) {
    return (
      <div 
        data-testid="responsive-player-layout"
        className="flex flex-col items-center justify-center p-12 text-gray-500 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100"
      >
        <Users className="w-12 h-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-600">No players in room</p>
        <p className="text-sm text-gray-400 mt-2">Waiting for players to join...</p>
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

  // Get optimal grid columns based on player count and screen size
  const getGridColumns = () => {
    if (isMobile) {
      return players.length === 1 ? 1 : 2;
    }
    if (isTablet) {
      if (players.length <= 2) return 2;
      if (players.length <= 6) return 3;
      return 4;
    }
    // Desktop
    if (players.length <= 3) return 3;
    if (players.length <= 8) return 4;
    if (players.length <= 15) return 5;
    return 6;
  };

  const gridCols = getGridColumns();

  const renderPlayerGrid = () => {
    const gridColsClass = `grid-cols-${gridCols}`;
    
    return (
      <div 
        data-testid="player-grid"
        className={cn(
          'grid gap-4 justify-items-center',
          gridColsClass,
          isMobile && 'gap-3',
          isTablet && 'gap-4',
          !isMobile && !isTablet && 'gap-6'
        )}
        style={{
          gridTemplateColumns: `repeat(${gridCols}, 1fr)`
        }}
      >
        {players.map((player) => {
          const voteStatus = getPlayerVoteStatus(player);
          
          return (
            <div
              key={player.id}
              data-testid={`player-card-${player.id}`}
              className="w-full max-w-xs"
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
      <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 rounded-2xl border border-blue-100/50 backdrop-blur-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Players
              </h2>
              <p className="text-sm text-gray-500">
                {players.length} {players.length === 1 ? 'player' : 'players'} in room
              </p>
            </div>
          </div>
          
          {/* Vote summary */}
          {currentStory && (
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-gray-600">
                  {Object.keys(currentStory.votes).length} voted
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                <span className="text-gray-600">
                  {players.filter(p => !p.isSpectator).length - Object.keys(currentStory.votes).length} pending
                </span>
              </div>
            </div>
          )}
        </div>
        
        <div className="w-full">
          {renderPlayerGrid()}
        </div>
      </div>
    </div>
  );
};