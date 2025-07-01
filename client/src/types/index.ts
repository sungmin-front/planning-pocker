// Re-export shared types
export * from '@planning-poker/shared';

// Client-specific types
export interface WebSocketContextType {
  socket: WebSocket | null;
  isConnected: boolean;
  connect: (url?: string) => Promise<void>;
  disconnect: () => void;
  sendMessage: (message: any) => void;
  // Additional methods expected by tests
  send: (message: any) => void;
  on: (event: string, handler: Function) => void;
  off: (event: string, handler: Function) => void;
}

export interface RoomContextType {
  room: Room | null;
  currentPlayer: Player | null;
  isHost: boolean;
  joinError: string | null;
  nicknameSuggestions: string[];
  createRoom: (nickname: string) => Promise<string | null>;
  joinRoom: (roomId: string, nickname: string) => Promise<boolean>;
  leaveRoom: () => void;
  createStory: (title: string, description?: string) => void;
  vote: (storyId: string, vote: VoteValue) => void;
  revealVotes: (storyId: string) => void;
  restartVoting: (storyId: string) => void;
  setFinalPoint: (storyId: string, point: VoteValue) => void;
  transferHost: (toNickname: string) => void;
  syncRoom: () => void;
  clearJoinError: () => void;
}

// Import shared types for re-export
import type { Room, Player, VoteValue } from '@planning-poker/shared';