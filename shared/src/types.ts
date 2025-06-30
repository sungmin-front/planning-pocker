export interface Player {
  id: string;
  name: string;
  vote?: string;
  isSpectator: boolean;
}

export interface Room {
  id: string;
  name: string;
  players: Player[];
  currentStory?: string;
  votingInProgress: boolean;
  votesRevealed: boolean;
  createdAt: Date;
}

export interface GameState {
  room: Room;
  currentPlayer: Player;
}

export interface WebSocketMessage {
  type: 'JOIN_ROOM' | 'LEAVE_ROOM' | 'VOTE' | 'REVEAL_VOTES' | 'NEW_STORY' | 'RESET_VOTES';
  payload: any;
}

export type VoteValue = '0' | '1' | '2' | '3' | '5' | '8' | '13' | '21' | '?' | '☕';

export const VOTE_OPTIONS: VoteValue[] = ['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕'];