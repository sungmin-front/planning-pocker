import React from 'react';
import { motion } from 'framer-motion';
import { useRoom } from '@/contexts/RoomContext';
import { PlayerCard } from '@/components/PlayerCard';

interface ArrangedPlayer {
  id: string;
  nickname: string;
  votes: Record<string, string>;
  position: 'top' | 'bottom' | 'left' | 'right';
  index: number;
  total: number;
  isMe?: boolean;
}

export const RectangularLayout: React.FC = () => {
  const { room, currentPlayer } = useRoom();

  // Early return if no room or no players
  if (!room || !room.players || room.players.length === 0) {
    return null;
  }

  const players = room.players;
  const myId = currentPlayer?.id;

  // Distribute players around the rectangular table
  const distributePlayers = (): ArrangedPlayer[] => {
    const total = players.length;
    
    // Calculate how many players go in each zone
    const topCount = Math.floor(total / 4);
    const leftCount = Math.floor(total / 4);
    const rightCount = Math.floor(total / 4);
    const bottomCount = total - topCount - leftCount - rightCount;
    
    let arranged: ArrangedPlayer[] = [];
    let remaining = [...players];
    
    // Find my index and remove me from remaining players (I'll be added to bottom center)
    const myIndex = remaining.findIndex(p => p.id === myId);
    const myPlayer = myIndex !== -1 ? remaining.splice(myIndex, 1)[0] : null;
    
    // Top row
    const topPlayers = remaining.splice(0, topCount).map((player, i) => ({
      ...player,
      position: 'top' as const,
      index: i,
      total: topCount
    }));
    
    // Left column
    const leftPlayers = remaining.splice(0, leftCount).map((player, i) => ({
      ...player,
      position: 'left' as const,
      index: i,
      total: leftCount
    }));
    
    // Right column
    const rightPlayers = remaining.splice(0, rightCount).map((player, i) => ({
      ...player,
      position: 'right' as const,
      index: i,
      total: rightCount
    }));
    
    // Bottom row
    let bottomPlayers = remaining.map((player, i) => ({
      ...player,
      position: 'bottom' as const,
      index: i,
      total: bottomCount
    }));
    
    // Add myself to bottom center if I exist
    if (myPlayer) {
      const centerIndex = Math.floor(bottomPlayers.length / 2);
      bottomPlayers.splice(centerIndex, 0, {
        ...myPlayer,
        position: 'bottom' as const,
        index: centerIndex,
        total: bottomCount,
        isMe: true
      });
      
      // Adjust indices for players that were shifted
      bottomPlayers = bottomPlayers.map((player, i) => ({
        ...player,
        index: i,
        total: bottomCount + 1
      }));
    }
    
    return [...topPlayers, ...leftPlayers, ...rightPlayers, ...bottomPlayers];
  };

  const arrangedPlayers = distributePlayers();

  // Calculate if current story is revealed
  const currentStory = room.stories?.find(s => s.id === room.currentStoryId);
  const isRevealed = currentStory?.status === 'revealed';

  return (
    <div 
      data-testid="rectangular-table-container" 
      className="rectangular-table-container relative w-[600px] h-[400px] mx-auto"
    >
      {/* Central table */}
      <div 
        data-testid="table-rectangle" 
        className="table-rectangle absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-48 bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg border-4 border-amber-300 shadow-lg flex items-center justify-center"
      >
        <div className="text-amber-700 font-semibold text-lg text-center">
          Planning<br />Poker
        </div>
      </div>
      
      {arrangedPlayers.map((player) => {
        // Calculate position based on zone
        let positionStyle: React.CSSProperties = {};
        
        switch(player.position) {
          case 'top':
            positionStyle = {
              top: '0%',
              left: `${((player.index + 1) * 100) / (player.total + 1)}%`,
              transform: 'translateX(-50%)',
            };
            break;
          case 'bottom':
            positionStyle = {
              bottom: '0%',
              left: `${((player.index + 1) * 100) / (player.total + 1)}%`,
              transform: 'translateX(-50%)',
            };
            break;
          case 'left':
            positionStyle = {
              left: '0%',
              top: `${((player.index + 1) * 80) / (player.total + 1) + 10}%`,
              transform: 'translateY(-50%)',
            };
            break;
          case 'right':
            positionStyle = {
              right: '0%',
              top: `${((player.index + 1) * 80) / (player.total + 1) + 10}%`,
              transform: 'translateY(-50%)',
            };
            break;
        }
        
        return (
          <motion.div
            key={player.id}
            data-testid={`player-slot-${player.id}`}
            className={`player-slot absolute zone-${player.position} ${player.isMe ? 'player-self' : ''}`}
            style={positionStyle}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: 1,
              scale: player.isMe ? 1.1 : 1,
            }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div 
              data-testid={`player-name-${player.id}`}
              className={`player-name text-center text-sm font-medium mb-2 ${
                player.isMe ? 'text-blue-600 font-bold' : 'text-gray-700'
              }`}
            >
              {player.nickname}
              {player.isMe && <div className="text-xs text-blue-500">(You)</div>}
            </div>
            <PlayerCard 
              player={player} 
              revealed={isRevealed}
            />
          </motion.div>
        );
      })}
    </div>
  );
};