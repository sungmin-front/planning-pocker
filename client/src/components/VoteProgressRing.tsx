import React from 'react';
import { Player, Story } from '@/types';

interface VoteProgressRingProps {
  players: Player[];
  currentStory: Story | null;
  width?: number;
  height?: number;
  strokeWidth?: number;
  className?: string;
}

export const VoteProgressRing: React.FC<VoteProgressRingProps> = ({
  players,
  currentStory,
  width = 200,
  height = 120,
  strokeWidth = 3,
  className = '',
}) => {
  if (!currentStory || players.length === 0) {
    return null;
  }

  // Calculate vote progress
  const votedPlayers = Object.keys(currentStory.votes).length;
  
  // For revealed votes, use the actual number of voters as the total
  // to maintain correct completion percentage regardless of current player count
  const totalPlayers = currentStory.status === 'revealed' 
    ? votedPlayers // Use vote count as total when votes are revealed
    : players.length; // Use current player count during active voting
  
  const progress = totalPlayers > 0 ? (votedPlayers / totalPlayers) * 100 : 0;

  // Progress color based on completion
  const getProgressColor = () => {
    if (progress === 100) return '#10b981'; // green-500
    if (progress >= 50) return '#f59e0b'; // amber-500
    return '#6b7280'; // gray-500
  };

  // Rounded rectangle path
  const borderRadius = 8;
  const padding = strokeWidth / 2;
  const x = padding;
  const y = padding;
  const w = width - strokeWidth;
  const h = height - strokeWidth;
  
  // Create rounded rectangle path
  const rectPath = `
    M ${x + borderRadius} ${y}
    L ${x + w - borderRadius} ${y}
    Q ${x + w} ${y} ${x + w} ${y + borderRadius}
    L ${x + w} ${y + h - borderRadius}
    Q ${x + w} ${y + h} ${x + w - borderRadius} ${y + h}
    L ${x + borderRadius} ${y + h}
    Q ${x} ${y + h} ${x} ${y + h - borderRadius}
    L ${x} ${y + borderRadius}
    Q ${x} ${y} ${x + borderRadius} ${y}
    Z
  `;

  // Calculate path length for progress
  const perimeter = 2 * (w + h) - 8 * borderRadius + 2 * Math.PI * borderRadius;
  const strokeDasharray = perimeter;
  const strokeDashoffset = perimeter - (progress / 100) * perimeter;

  return (
    <div className={`absolute pointer-events-none ${className}`} style={{ width, height }}>
      <svg
        width={width}
        height={height}
        className="absolute top-0 left-0"
        style={{
          filter: progress === 100 ? 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.3))' : 'none'
        }}
      >
        {/* Background border */}
        <path
          d={rectPath}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          className="opacity-20"
        />
        
        {/* Progress border */}
        <path
          d={rectPath}
          fill="none"
          stroke={getProgressColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
    </div>
  );
};