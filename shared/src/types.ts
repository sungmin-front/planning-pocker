export type VoteValue = '1' | '2' | '3' | '5' | '8' | '13' | '21' | '34' | '55' | '89' | '?' | '☕';

export type StoryStatus = 'voting' | 'revealed' | 'closed' | 'skipped';

export type SortOption = 'priority-desc' | 'priority-asc' | 'ticket-desc' | 'ticket-asc' | 'created-desc' | 'created-asc';
export type FilterOption = 'all' | 'story' | 'task' | 'bug';

export interface BacklogSettings {
  sortOption: SortOption;
  filterOption: FilterOption;
}

export interface Player {
  id: string;
  nickname: string;
  socketId: string;
  isHost: boolean;
  isSpectator: boolean;
}

export interface JiraMetadata {
  key: string;
  issueType: string;
  status: string;
  assignee: string | null;
  priority: string | null;
  storyPoints: number | null;
  jiraUrl: string;
}

export interface Story {
  id: string;
  title: string;
  description?: string;
  status: StoryStatus;
  votes: Record<string, VoteValue>;
  final_point?: VoteValue | null;
  jiraMetadata?: JiraMetadata;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerNickname: string;
  message: string;
  timestamp: Date;
  roomId: string;
}

export interface TypingIndicator {
  playerId: string;
  playerNickname: string;
  roomId: string;
  timestamp: Date;
}
export interface Room {
  id: string;
  name: string;
  players: Player[];
  stories: Story[];
  createdAt: Date;
  currentStoryId?: string | null;
  backlogSettings?: BacklogSettings;
  chatMessages?: ChatMessage[];
  typingUsers?: TypingIndicator[];
}

export type MessageType = 
  | 'ROOM_CREATE'
  | 'JOIN_ROOM' 
  | 'REJOIN_ROOM'
  | 'LEAVE_ROOM' 
  | 'STORY_VOTE'
  | 'STORY_CREATE'
  | 'STORY_SELECT'
  | 'STORY_REVEAL_VOTES'
  | 'STORY_RESTART_VOTING'
  | 'STORY_SET_FINAL_POINT'
  | 'STORY_SKIP'
  | 'ROOM_TRANSFER_HOST'
  | 'ROOM_SYNC'
  | 'HOST_DELEGATE'
  | 'PLAYER_KICK'
  | 'BACKLOG_SETTINGS_UPDATE'
  | 'SOCKET_ID'
  | 'CHAT_MESSAGE'
  | 'CHAT_HISTORY_REQUEST'
  | 'CHAT_TYPING_START'
  | 'CHAT_TYPING_STOP';

export interface WebSocketMessage {
  type: MessageType;
  payload: any;
}

// Validation function for ChatMessage
export function isValidChatMessage(obj: any): obj is ChatMessage {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const { id, playerId, playerNickname, message, timestamp, roomId } = obj;

  // Check all required fields are present and have correct types
  if (
    typeof id !== 'string' || 
    typeof playerId !== 'string' || 
    typeof playerNickname !== 'string' || 
    typeof message !== 'string' || 
    typeof roomId !== 'string'
  ) {
    return false;
  }

  // Check timestamp is a Date object
  if (!(timestamp instanceof Date)) {
    return false;
  }

  // Check message length (max 1000 characters)
  if (message.length > 1000) {
    return false;
  }

  return true;
}