// Re-export shared types
export * from '@planning-poker/shared';

// Client-specific types
export interface WebSocketContextType {
  socket: WebSocket | null;
  isConnected: boolean;
  connect: (url?: string) => Promise<void>;
  disconnect: () => void;
  sendMessage: (message: any) => void;
}

export interface RoomContextType {
  room: Room | null;
  currentPlayer: Player | null;
  isHost: boolean;
  joinRoom: (roomId: string, nickname: string) => Promise<boolean>;
  leaveRoom: () => void;
  createStory: (title: string, description?: string) => void;
  vote: (storyId: string, vote: VoteValue) => void;
  revealVotes: (storyId: string) => void;
  restartVoting: (storyId: string) => void;
  setFinalPoint: (storyId: string, point: VoteValue) => void;
  transferHost: (toNickname: string) => void;
  syncRoom: () => void;
}

// Import shared types for re-export
import type { Room, Player, VoteValue } from '@planning-poker/shared';