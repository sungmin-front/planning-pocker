import React from 'react';
import { Player } from '@/types';
import { useRoom } from '@/contexts/RoomContext';
import { cn } from '@/lib/utils';
import { PlayerContextMenu } from './PlayerContextMenu';

interface PlayerCardProps {
  player: Player;
  vote?: string;
  hasVoted?: boolean;
  showVote?: boolean;
  showActions?: boolean;
  isConnected?: boolean;
  avatarUrl?: string;
  loading?: boolean;
  onPlayerClick?: (player: Player) => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  vote,
  hasVoted,
  showVote = true,
  showActions = false,
  isConnected = true,
  avatarUrl,
  loading = false,
  onPlayerClick
}) => {
  const { currentPlayer } = useRoom();
  
  const isCurrentPlayer = currentPlayer?.id === player.id;
  const isClickable = onPlayerClick !== undefined;

  const handleCardClick = () => {
    if (onPlayerClick) {
      onPlayerClick(player);
    }
  };

  const getVoteDisplay = () => {
    if (showVote && vote) {
      // Show the actual vote
      return (
        <div className="w-12 h-16 bg-white rounded shadow border border-gray-300 flex items-center justify-center">
          <span className="text-lg font-bold text-gray-800">{vote}</span>
        </div>
      );
    }
    
    if (hasVoted === true) {
      // Show face-down card (voted but not revealed)
      return (
        <div className="w-12 h-16 bg-gray-400 rounded shadow border border-gray-500 flex items-center justify-center">
          <div className="w-8 h-12 bg-gray-500 rounded border border-gray-600 flex items-center justify-center">
            <div className="w-4 h-4 bg-gray-600 rounded"></div>
          </div>
        </div>
      );
    }
    
    // No vote - show empty placeholder
    return (
      <div className="w-12 h-16 border border-dashed border-gray-300 rounded flex items-center justify-center">
        <div className="text-gray-300 text-xs">?</div>
      </div>
    );
  };

  return (
    <PlayerContextMenu player={player}>
      <div
        data-testid="player-card"
        className={cn(
          "flex flex-col items-center space-y-2 transition-all duration-200",
          isCurrentPlayer && "scale-105",
          isClickable && "cursor-pointer hover:scale-105",
          !isConnected && "opacity-60"
        )}
        onClick={handleCardClick}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg z-10">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {/* Vote Card */}
        <div className="relative">
          {getVoteDisplay()}
        </div>

        {/* Player Name */}
        <div className="text-center">
          <div className={cn(
            "text-xs font-medium px-2 py-1 rounded",
            isCurrentPlayer 
              ? "bg-blue-500 text-white" 
              : player.isHost 
                ? "bg-yellow-500 text-white"
                : "bg-gray-600 text-white"
          )}>
            {player.nickname}
          </div>
        </div>
      </div>
    </PlayerContextMenu>
  );
};