import React from 'react';
import { motion } from 'framer-motion';
import { useRoom } from '@/contexts/RoomContext';
import { PlayerCard } from '@/components/PlayerCard';

export const CircularLayout: React.FC = () => {
  const { room, currentPlayer } = useRoom();

  // Early return if no room or no players
  if (!room || !room.players || room.players.length === 0) {
    return null;
  }

  const players = room.players;
  const myId = currentPlayer?.id;

  // Find my index to position myself at the bottom
  const myIndex = players.findIndex(p => p.id === myId);
  
  // Reorder players to put myself at the bottom (last position)
  const orderedPlayers = [...players];
  if (myIndex !== -1) {
    const me = orderedPlayers.splice(myIndex, 1)[0];
    orderedPlayers.push(me); // Add myself at the end
  }

  // Calculate if current story is revealed
  const currentStory = room.stories?.find(s => s.id === room.currentStoryId);
  const isRevealed = currentStory?.status === 'revealed';

  // Responsive sizing based on player count and screen size
  const playerCount = orderedPlayers.length;
  const containerSize = Math.min(400, Math.max(300, playerCount * 40 + 200));
  const radius = containerSize * 0.35; // Responsive radius
  const centerSize = Math.max(80, containerSize * 0.2);

  return (
    <div 
      data-testid="circular-table-container" 
      className="circular-table-container relative mx-auto"
      style={{
        width: `${containerSize}px`,
        height: `${containerSize}px`,
      }}
    >
      {/* Central table */}
      <div 
        data-testid="table-center" 
        className="table-center absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-green-100 to-green-200 rounded-full border-4 border-green-300 shadow-lg flex items-center justify-center"
        style={{
          width: `${centerSize}px`,
          height: `${centerSize}px`,
        }}
      >
        <div className="text-green-700 font-semibold text-sm text-center">
          Planning<br />Poker
        </div>
      </div>
      
      {orderedPlayers.map((player, index) => {
        // Calculate position using polar coordinates
        // Start from bottom (90 degrees) and go clockwise
        const theta = (Math.PI / 2) + (2 * Math.PI * index) / orderedPlayers.length;
        const x = radius * Math.cos(theta);
        const y = -radius * Math.sin(theta); // Negative because CSS y increases downward
        
        const isMe = player.id === myId;
        
        return (
          <motion.div
            key={player.id}
            data-testid={`player-slot-${player.id}`}
            className={`player-slot absolute ${isMe ? 'player-self' : ''}`}
            style={{
              transform: `translate(${x}px, ${y}px)`,
              top: '50%',
              left: '50%',
              marginTop: '-40px', // Half of card height for centering
              marginLeft: '-30px', // Half of card width for centering
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: 1,
              scale: isMe ? 1.1 : 1,
            }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <div 
              data-testid={`player-name-${player.id}`}
              className={`player-name text-center text-sm font-medium mb-2 ${
                isMe ? 'text-blue-600 font-bold' : 'text-gray-700'
              }`}
            >
              {player.nickname}
              {isMe && <div className="text-xs text-blue-500">(You)</div>}
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