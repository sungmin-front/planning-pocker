import React, { useState } from 'react';
import { Player } from '@/types';
import { useRoom } from '@/contexts/RoomContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Crown, UserX } from 'lucide-react';

interface PlayerContextMenuProps {
  player: Player;
  children: React.ReactNode;
}

export const PlayerContextMenu: React.FC<PlayerContextMenuProps> = ({
  player,
  children
}) => {
  const { room, currentPlayer } = useRoom();
  const { sendMessage } = useWebSocket();

  const isHost = currentPlayer?.isHost;
  const isTargetPlayer = player.id === currentPlayer?.id;
  
  // Only show menu for hosts and not for themselves
  if (!isHost || isTargetPlayer) {
    return <>{children}</>;
  }

  const handleDelegateHost = () => {
    if (!room || !player) return;
    
    sendMessage({
      type: 'HOST_DELEGATE',
      payload: {
        roomId: room.id,
        newHostId: player.id
      }
    });
  };

  const handleKickPlayer = () => {
    if (!room || !player) return;
    
    sendMessage({
      type: 'PLAYER_KICK',
      payload: {
        roomId: room.id,
        playerId: player.id
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="cursor-pointer">
          {children}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-48">
        <DropdownMenuItem 
          onClick={handleDelegateHost}
          className="cursor-pointer"
        >
          <Crown className="w-4 h-4 mr-2" />
          Make Host
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleKickPlayer}
          className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <UserX className="w-4 h-4 mr-2" />
          Kick Player
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};