import React from 'react';
import { Player } from '@/types';
import { useRoom } from '@/contexts/RoomContext';
import { cn } from '@/lib/utils';

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
        <div className="w-20 h-28 bg-white rounded-lg shadow-md border-2 border-blue-500 flex items-center justify-center">
          <span className="text-2xl font-bold text-blue-600">{vote}</span>
        </div>
      );
    }
    
    if (hasVoted === true) {
      // Show face-down card (voted but not revealed)
      return (
        <div className="w-20 h-28 bg-gray-100 rounded-lg shadow-md border border-gray-300 flex items-center justify-center">
          <div className="w-16 h-24 bg-gray-200 rounded border-2 border-gray-300 flex items-center justify-center">
            <div className="w-8 h-8 bg-gray-300 rounded"></div>
          </div>
        </div>
      );
    }
    
    // No vote - show empty space or placeholder
    return (
      <div className="w-20 h-28 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
        <div className="text-gray-400 text-xs text-center">
          {hasVoted === false ? 'Waiting...' : ''}
        </div>
      </div>
    );
  };

  return (
    <div
      data-testid="player-card"
      className={cn(
        "flex flex-col items-center space-y-3 transition-all duration-200",
        isCurrentPlayer && "scale-110",
        isClickable && "cursor-pointer hover:scale-105",
        !isConnected && "opacity-60"
      )}
      onClick={handleCardClick}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg z-10">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {/* Vote Card */}
      <div className="relative">
        {getVoteDisplay()}
      </div>

      {/* Player Name */}
      <div className="text-center">
        <div className={cn(
          "text-sm font-medium px-3 py-1 rounded-full",
          isCurrentPlayer 
            ? "bg-blue-100 text-blue-800" 
            : player.isHost 
              ? "bg-yellow-100 text-yellow-800"
              : "bg-gray-100 text-gray-700"
        )}>
          {player.nickname}
        </div>
        
        {/* Host indicator */}
        {player.isHost && (
          <div className="text-xs text-yellow-600 mt-1">Host</div>
        )}
        
        {/* Spectator indicator */}
        {player.isSpectator && (
          <div className="text-xs text-purple-600 mt-1">Spectator</div>
        )}
      </div>

      {/* Connection status indicator */}
      <div
        data-testid="connection-status"
        className={cn(
          "w-2 h-2 rounded-full",
          isConnected ? "bg-green-500" : "bg-red-500"
        )}
      />
    </div>
  );
};