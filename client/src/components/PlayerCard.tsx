import React from 'react';
import { Player } from '@/types';
import { useRoom } from '@/contexts/RoomContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { HostBadge } from '@/components/PlayerTable/HostBadge';
import { cn } from '@/lib/utils';
import { CheckCircle, Clock, Crown } from 'lucide-react';

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
  const { currentPlayer, isHost, transferHost } = useRoom();
  
  const isCurrentPlayer = currentPlayer?.id === player.id;
  const canTransferHost = isHost && !player.isHost && showActions;
  const isClickable = onPlayerClick !== undefined;

  const handleTransferHost = (e: React.MouseEvent) => {
    e.stopPropagation();
    transferHost(player.nickname);
  };

  const handleCardClick = () => {
    if (onPlayerClick) {
      onPlayerClick(player);
    }
  };

  const getInitials = (nickname: string) => {
    return nickname
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getVoteStatusIcon = () => {
    if (showVote && vote) {
      return (
        <div className="relative">
          <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
            {vote}
          </div>
        </div>
      );
    }
    if (hasVoted === true) {
      return (
        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-green-600" />
        </div>
      );
    }
    if (hasVoted === false) {
      return (
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
          <Clock className="w-5 h-5 text-gray-400" />
        </div>
      );
    }
    return null;
  };

  return (
    <Card
      data-testid="player-card"
      className={cn(
        "relative transition-all duration-300 hover:shadow-lg border-0 bg-white/80 backdrop-blur-sm",
        isCurrentPlayer && "ring-2 ring-blue-500 shadow-lg",
        isClickable && "cursor-pointer hover:scale-105",
        !isConnected && "opacity-60"
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-6">
        {loading && (
          <div 
            data-testid="loading-spinner" 
            className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg"
          >
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Vote Status - Top */}
          <div className="flex justify-center">
            {getVoteStatusIcon()}
          </div>

          {/* Avatar */}
          <div className="relative">
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold border-4",
              isCurrentPlayer 
                ? "border-blue-500 bg-blue-50 text-blue-700" 
                : player.isHost 
                  ? "border-yellow-400 bg-yellow-50 text-yellow-700"
                  : "border-gray-200 bg-gray-50 text-gray-700"
            )}>
              {avatarUrl ? (
                <Avatar className="w-full h-full">
                  <AvatarImage src={avatarUrl} alt={player.nickname} />
                  <AvatarFallback className="text-xl font-bold">
                    {getInitials(player.nickname)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                getInitials(player.nickname)
              )}
            </div>
            
            {/* Host Crown */}
            {player.isHost && (
              <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center">
                <Crown className="w-3 h-3 text-white" />
              </div>
            )}

            {/* Connection status indicator */}
            <div
              data-testid="connection-status"
              className={cn(
                "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white",
                isConnected ? "bg-green-500" : "bg-red-500"
              )}
            />
          </div>

          {/* Player info */}
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 text-sm truncate max-w-full">
              {player.nickname}
            </h3>
            
            {/* Badges */}
            <div className="flex flex-wrap justify-center gap-1">
              {player.isHost && (
                <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                  Host
                </Badge>
              )}
              {player.isSpectator && (
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                  Spectator
                </Badge>
              )}
              {isCurrentPlayer && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  You
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          {canTransferHost && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTransferHost}
              className="text-xs"
            >
              Make Host
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};