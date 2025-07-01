import React from 'react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
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
  const { isMobile, isTablet, currentBreakpoint } = useBreakpoint();

  if (players.length === 0) {
    return (
      <div 
        data-testid="responsive-player-layout"
        className="flex items-center justify-center p-8 text-gray-500"
      >
        <p>No players in room</p>
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

  // Mobile List Layout
  const renderMobileLayout = () => (
    <div 
      data-testid="list-layout"
      className="space-y-2 max-h-96 overflow-y-auto"
    >
      {players.map((player) => {
        const voteStatus = getPlayerVoteStatus(player);
        const isCurrentPlayer = player.id === currentPlayerId;
        
        return (
          <div
            key={player.id}
            data-testid={`player-card-${player.id}`}
            className={cn(
              'flex items-center justify-between p-3 rounded-lg border bg-white transition-all',
              isCurrentPlayer && 'ring-2 ring-primary bg-primary/5'
            )}
          >
            <div className="flex items-center space-x-3">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                player.isHost ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'
              )}>
                {player.nickname.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-sm">{player.nickname}</div>
                {player.isHost && (
                  <div className="text-xs text-yellow-600">Host</div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {voteStatus?.showVote && voteStatus.vote ? (
                <div className="w-6 h-6 rounded flex items-center justify-center bg-primary text-primary-foreground text-xs font-bold">
                  {voteStatus.vote}
                </div>
              ) : (
                <div className={cn(
                  'px-2 py-1 rounded-full text-xs font-medium',
                  voteStatus?.hasVoted 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-600'
                )}>
                  {voteStatus?.hasVoted ? 'Voted' : 'Not Voted'}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // Tablet Grid Layout
  const renderTabletLayout = () => {
    // Optimize columns based on player count
    const getGridCols = () => {
      if (players.length <= 4) return 'grid-cols-2';
      if (players.length <= 9) return 'grid-cols-3';
      return 'grid-cols-4';
    };

    return (
      <div 
        data-testid="grid-layout"
        className={cn('grid gap-3', getGridCols())}
      >
        {players.map((player) => {
          const voteStatus = getPlayerVoteStatus(player);
          const isCurrentPlayer = player.id === currentPlayerId;
          
          return (
            <div
              key={player.id}
              data-testid={`player-card-${player.id}`}
              className={cn(
                'p-3 rounded-lg border bg-white text-center transition-all',
                isCurrentPlayer && 'ring-2 ring-primary bg-primary/5'
              )}
            >
              <div className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-2',
                player.isHost ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'
              )}>
                {player.nickname.charAt(0).toUpperCase()}
              </div>
              
              <div className="font-medium text-sm mb-1">{player.nickname}</div>
              
              {player.isHost && (
                <div className="text-xs text-yellow-600 mb-2">Host</div>
              )}
              
              {voteStatus?.showVote && voteStatus.vote ? (
                <div className="w-8 h-8 rounded flex items-center justify-center bg-primary text-primary-foreground text-sm font-bold mx-auto">
                  {voteStatus.vote}
                </div>
              ) : (
                <div className={cn(
                  'px-2 py-1 rounded-full text-xs font-medium inline-block',
                  voteStatus?.hasVoted 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-600'
                )}>
                  {voteStatus?.hasVoted ? 'Voted' : 'Not Voted'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Desktop Circular Layout
  const renderCircularLayout = () => {
    const centerX = 200;
    const centerY = 200;
    const radius = Math.min(150, Math.max(100, players.length * 15 + 80));

    return (
      <div 
        data-testid="circular-layout"
        className="relative"
        style={{ width: '400px', height: '400px' }}
      >
        {players.map((player, index) => {
          const voteStatus = getPlayerVoteStatus(player);
          const isCurrentPlayer = player.id === currentPlayerId;
          
          const angle = (index / players.length) * 2 * Math.PI;
          const x = centerX + radius * Math.cos(angle - Math.PI / 2);
          const y = centerY + radius * Math.sin(angle - Math.PI / 2);

          return (
            <div
              key={player.id}
              data-testid={`player-card-${player.id}`}
              className={cn(
                'absolute p-4 rounded-lg border bg-white text-center transition-all transform -translate-x-1/2 -translate-y-1/2',
                isCurrentPlayer && 'ring-2 ring-primary bg-primary/5',
                'hover:shadow-lg hover:scale-105'
              )}
              style={{ 
                left: `${x}px`, 
                top: `${y}px`,
                minWidth: '120px'
              }}
            >
              <div className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-2',
                player.isHost ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'
              )}>
                {player.nickname.charAt(0).toUpperCase()}
              </div>
              
              <div className="font-medium text-sm mb-1">{player.nickname}</div>
              
              {player.isHost && (
                <div className="text-xs text-yellow-600 mb-2">Host</div>
              )}
              
              {voteStatus?.showVote && voteStatus.vote ? (
                <div className="w-8 h-8 rounded flex items-center justify-center bg-primary text-primary-foreground text-sm font-bold mx-auto">
                  {voteStatus.vote}
                </div>
              ) : (
                <div className={cn(
                  'px-2 py-1 rounded-full text-xs font-medium inline-block',
                  voteStatus?.hasVoted 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-600'
                )}>
                  {voteStatus?.hasVoted ? 'Voted' : 'Not Voted'}
                </div>
              )}
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
      <div className={cn(
        'bg-gray-50 rounded-lg',
        isMobile ? 'p-4' : isTablet ? 'p-5' : 'p-6'
      )}>
        <div className={cn(
          'mb-4',
          isMobile ? 'text-lg' : 'text-xl',
          'font-semibold text-gray-900'
        )}>
          Players ({players.length})
        </div>
        
        <div className="flex justify-center">
          {isMobile && renderMobileLayout()}
          {isTablet && renderTabletLayout()}
          {!isMobile && !isTablet && renderCircularLayout()}
        </div>
      </div>
    </div>
  );
};