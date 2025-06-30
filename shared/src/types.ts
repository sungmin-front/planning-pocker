export interface Player {
  id: string;
  nickname: string;
  socketId: string;
  isHost: boolean;
  isSpectator: boolean;
}

export interface Story {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'voting' | 'revealed' | 'closed';
  votes?: Record<string, VoteValue>;
  final_point?: VoteValue;
}

export interface Room {
  id: string;
  name: string;
  players: Player[];
  stories: Story[];
  currentStoryId?: string;
  createdAt: Date;
}

export interface GameState {
  room: Room;
  currentPlayer: Player;
}

export interface WebSocketMessage {
  type: 'JOIN_ROOM' | 'LEAVE_ROOM' | 'VOTE' | 'REVEAL_VOTES' | 'NEW_STORY' | 'RESET_VOTES' | 'STORY_VOTE' | 'STORY_REVEAL_VOTES' | 'STORY_RESTART_VOTING' | 'STORY_SET_FINAL_POINT' | 'ROOM_TRANSFER_HOST' | 'ROOM_SYNC';
  payload: any;
}

export type VoteValue = '0' | '1' | '2' | '3' | '5' | '8' | '13' | '21' | '?' | '☕';

export const VOTE_OPTIONS: VoteValue[] = ['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕'];