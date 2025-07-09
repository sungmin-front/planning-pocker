import React, { useState } from 'react';
import { useRoom } from '@/contexts/RoomContext';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shadcn/select';

export const HostDelegation: React.FC = () => {
  const { room, currentPlayer, isHost, transferHost } = useRoom();
  const { toast } = useToast();
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');

  // Only render if user is host and room exists
  if (!isHost || !room) {
    return null;
  }

  // Get players who can become host (exclude current host)
  const eligiblePlayers = room.players.filter(
    player => player.id !== currentPlayer?.id && !player.isHost
  );

  const handlePlayerSelect = (playerNickname: string) => {
    // Transfer host to selected player
    transferHost(playerNickname);
    
    // Show confirmation toast
    toast({
      title: "Host Transferred",
      description: `Host role has been transferred to ${playerNickname}`,
    });
    
    // Reset selection
    setSelectedPlayer('');
  };

  return (
    <div data-testid="host-delegation" className="flex items-center gap-2">
      <span className="text-sm font-medium">Delegate host to:</span>
      <Select
        value={selectedPlayer}
        onValueChange={handlePlayerSelect}
        disabled={eligiblePlayers.length === 0}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select player..." />
        </SelectTrigger>
        <SelectContent>
          {eligiblePlayers.map((player) => (
            <SelectItem key={player.id} value={player.nickname}>
              {player.nickname}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};