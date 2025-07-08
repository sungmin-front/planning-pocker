import React from 'react';
import { PlayerCard } from '@/components/PlayerCard';
import { VoteProgressRing } from '@/components/VoteProgressRing';
import { Button } from '@/components/ui/button';
import { BarChart3 } from 'lucide-react';
import { Player, Story } from '@/types';

interface ResponsivePlayerLayoutProps {
  players: Player[];
  currentStory: Story | null;
  isStatsModalOpen?: boolean;
  onOpenStatsModal?: () => void;
}

export const ResponsivePlayerLayout: React.FC<ResponsivePlayerLayoutProps> = ({
  players,
  currentStory,
  isStatsModalOpen = false,
  onOpenStatsModal,
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
    // Responsive container dimensions
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth < 1024;
    
    const containerWidth = isMobile ? 400 : isTablet ? 600 : 800;
    const containerHeight = isMobile ? 400 : isTablet ? 500 : 600;
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    
    // Dynamic ellipse radii based on center table size and screen size
    const centerTableWidth = isMobile ? 240 : isTablet ? 280 : 320;
    const centerTableHeight = isMobile ? 120 : isTablet ? 140 : 160;
    
    // Add padding around the center table for player cards
    const baseHorizontalRadius = (centerTableWidth / 2) + (isMobile ? 80 : isTablet ? 100 : 120);
    const baseVerticalRadius = (centerTableHeight / 2) + (isMobile ? 60 : isTablet ? 80 : 100);
    
    // Increase radius based on player count to prevent overlap
    const playerSpacing = Math.max(10, players.length > 6 ? (isMobile ? 10 : 15) : (isMobile ? 15 : 20));
    const radiusX = Math.max(baseHorizontalRadius, baseHorizontalRadius + (players.length * playerSpacing * 0.7));
    const radiusY = Math.max(baseVerticalRadius, baseVerticalRadius + (players.length * playerSpacing * 0.5));
    

    return (
      <div 
        data-testid="circular-table"
        className="relative mx-auto"
        style={{ width: `${containerWidth}px`, height: `${containerHeight}px` }}
      >
        {/* Center message with progress border */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="relative">
            {currentStory ? (
              <div 
                className="relative"
                style={{ 
                  width: isMobile ? '240px' : isTablet ? '280px' : '320px', 
                  height: isMobile ? '120px' : isTablet ? '140px' : '160px' 
                }}
              >
                <VoteProgressRing
                  players={players}
                  currentStory={currentStory}
                  width={isMobile ? 240 : isTablet ? 280 : 320}
                  height={isMobile ? 120 : isTablet ? 140 : 160}
                  strokeWidth={isMobile ? 4 : 6}
                />
                <div 
                  className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border absolute z-10 flex flex-col justify-center items-center text-center"
                  style={{ 
                    width: isMobile ? '220px' : isTablet ? '260px' : '300px', 
                    height: isMobile ? '100px' : isTablet ? '120px' : '140px', 
                    padding: isMobile ? '12px' : isTablet ? '16px' : '20px',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <h3 className="text-base font-medium text-gray-900 mb-1 truncate w-full">
                    {currentStory.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {isRevealed ? 'Votes revealed!' : 'Pick your cards!'}
                  </p>
                  {isRevealed && !isStatsModalOpen ? (
                    <Button
                      size="sm"
                      onClick={() => onOpenStatsModal?.()}
                      className="h-7 px-3 text-xs"
                    >
                      <BarChart3 className="h-3 w-3 mr-1" />
                      View Statistics
                    </Button>
                  ) : isRevealed && isStatsModalOpen ? (
                    <div className="text-xs text-gray-500">
                      Statistics are open
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">
                      {(() => {
                        const votedCount = Object.keys(currentStory.votes).length;
                        const totalCount = currentStory.status === 'revealed' 
                          ? votedCount // Use vote count as total when votes are revealed
                          : players.length; // Use current player count during active voting
                        return `${votedCount}/${totalCount} voted`;
                      })()}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div 
                className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border flex items-center justify-center text-center"
                style={{ 
                  width: isMobile ? '220px' : isTablet ? '260px' : '300px', 
                  height: isMobile ? '100px' : isTablet ? '120px' : '140px' 
                }}
              >
                <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-600`}>
                  Ready to start voting
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Players positioned in circle */}
        {players.map((player, index) => {
          const voteStatus = getPlayerVoteStatus(player);
          
          // Calculate position around ellipse - start from top and distribute evenly
          const angle = (index / players.length) * 2 * Math.PI - Math.PI / 2; // Start from top
          
          // Use the ellipse radii directly - no complex adjustments
          const x = centerX + radiusX * Math.cos(angle);
          const y = centerY + radiusY * Math.sin(angle);
          
          const adjustedX = x;
          const adjustedY = y;
          
          
          return (
            <div
              key={player.id}
              data-testid={`player-card-${player.id}`}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
              style={{
                left: `${adjustedX}px`,
                top: `${adjustedY}px`,
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
    <>
      <div 
        data-testid="responsive-player-layout"
        className="w-full flex-1 flex flex-col"
        aria-label={`${players.length} players in room`}
      >
        <div className="bg-white rounded-lg p-2 sm:p-4 lg:p-6 flex-1 flex items-center justify-center overflow-hidden">
          {renderCircularTable()}
        </div>
      </div>
    </>
  );
};