import React, { useState, useEffect } from 'react';
import { PlayerCard } from '@/components/PlayerCard';
import { VoteProgressRing } from '@/components/VoteProgressRing';
import { VotingResultsModal } from '@/components/VotingResultsModal';
import { Button } from '@/components/ui/button';
import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Player, Story } from '@/types';
import { useRoom } from '@/contexts/RoomContext';
import { useWebSocket } from '@/contexts/WebSocketContext';

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
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const { isHost } = useRoom();
  const { send } = useWebSocket();

  // Handle finalizing story points
  const handleFinalize = (storyId: string, finalPoint: string) => {
    send({
      type: 'STORY_SET_FINAL_POINT',
      payload: { storyId, point: finalPoint }
    });
  };

  // Auto-open modal when votes are revealed
  useEffect(() => {
    if (currentStory?.status === 'revealed' && Object.keys(currentStory.votes || {}).length > 0) {
      // Add a small delay to ensure single modal opening
      const timeoutId = setTimeout(() => {
        setIsStatsModalOpen(true);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentStory?.status, currentStory?.id]); // Use currentStory.id instead of votes to prevent re-triggering

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
    const containerWidth = 600;
    const containerHeight = 500; // Increased height for vertical growth
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    // Increased radius to account for larger center box (300x140)
    const radius = Math.min(200, Math.max(180, players.length * 15));

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
              <div className="relative" style={{ width: '300px', height: '140px' }}>
                <VoteProgressRing
                  players={players}
                  currentStory={currentStory}
                  width={300}
                  height={140}
                  strokeWidth={4}
                />
                <div 
                  className="bg-white/95 backdrop-blur-sm rounded-lg shadow-sm absolute z-10 flex flex-col justify-center items-center text-center"
                  style={{ 
                    width: '280px', 
                    height: '120px', 
                    padding: '16px',
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
                      onClick={() => setIsStatsModalOpen(true)}
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
                      {players.filter(p => p.id in currentStory.votes).length}/{players.length} voted
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div 
                className="bg-white/95 backdrop-blur-sm rounded-lg shadow-sm border flex items-center justify-center text-center"
                style={{ width: '280px', height: '120px' }}
              >
                <p className="text-sm text-gray-600">Ready to start voting</p>
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
    <>
      <div 
        data-testid="responsive-player-layout"
        className="w-full flex-1 flex flex-col"
        aria-label={`${players.length} players in room`}
      >
        <div className="bg-white rounded-lg p-6 flex-1 flex items-center justify-center">
          {renderCircularTable()}
        </div>
      </div>

      {/* Voting Results Modal */}
      {currentStory && (
        <VotingResultsModal
          isOpen={isStatsModalOpen}
          onClose={() => setIsStatsModalOpen(false)}
          votes={currentStory.votes || {}}
          totalVotes={Object.keys(currentStory.votes || {}).length}
          isHost={isHost}
          storyId={currentStory.id}
          onFinalize={handleFinalize}
        />
      )}
    </>
  );
};