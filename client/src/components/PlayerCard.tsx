import React from 'react';
import { Player } from '@/types';
import { useRoom } from '@/contexts/RoomContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { HostBadge } from '@/components/PlayerTable/HostBadge';
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

  const getVoteDisplay = () => {
    if (showVote && vote) {
      return <Badge variant="default">{vote}</Badge>;
    }
    if (hasVoted === true) {
      return <Badge variant="secondary">Voted</Badge>;
    }
    if (hasVoted === false) {
      return <Badge variant="outline">Not Voted</Badge>;
    }
    return null;
  };

  return (
    <Card
      data-testid="player-card"
      className={cn(
        "relative transition-all duration-200",
        isCurrentPlayer && "ring-2 ring-primary",
        isClickable && "cursor-pointer hover:shadow-md",
        !isConnected && "opacity-60"
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        {loading && (
          <div 
            data-testid="loading-spinner" 
            className="absolute inset-0 flex items-center justify-center bg-background/80"
          >
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        )}
        
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          <div className="relative">
            <Avatar>
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={player.nickname} />
              ) : null}
              <AvatarFallback>{getInitials(player.nickname)}</AvatarFallback>
            </Avatar>
            
            {/* Connection status indicator */}
            <div
              data-testid="connection-status"
              className={cn(
                "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background",
                isConnected ? "bg-green-500" : "bg-red-500"
              )}
            />
          </div>

          {/* Player info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium truncate">{player.nickname}</p>
              
              {/* Badges */}
              {player.isHost && <HostBadge />}
              {player.isSpectator && <Badge variant="secondary">Spectator</Badge>}
            </div>
            
            {/* Vote status */}
            <div className="mt-1">
              {getVoteDisplay()}
            </div>
          </div>

          {/* Actions */}
          {canTransferHost && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTransferHost}
            >
              Make Host
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};