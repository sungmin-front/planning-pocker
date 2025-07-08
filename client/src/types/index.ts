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
  getSocketId: () => string | null;
}

export interface RoomContextType {
  room: Room | null;
  currentPlayer: Player | null;
  isHost: boolean;
  joinError: string | null;
  nicknameSuggestions: string[];
  isRejoining: boolean;
  createRoom: (nickname: string) => Promise<string | null>;
  joinRoom: (roomId: string, nickname: string) => Promise<void>;
  rejoinRoom: (roomId: string, nickname: string) => Promise<void>;
  leaveRoom: () => void;
  createStory: (title: string, description?: string) => void;
  vote: (storyId: string, vote: VoteValue) => void;
  revealVotes: (storyId: string) => void;
  restartVoting: (storyId: string) => void;
  setFinalPoint: (storyId: string, point: VoteValue) => void;
  skipStory: (storyId: string) => void;
  transferHost: (toNickname: string) => void;
  syncRoom: () => void;
  clearJoinError: () => void;
  // Chat functionality
  sendChatMessage: (message: string) => void;
  requestChatHistory: () => void;
  startTyping: () => void;
  stopTyping: () => void;
}

// Import shared types for re-export
import type { Room, Player, VoteValue, ChatMessage, TypingIndicator } from '@planning-poker/shared';