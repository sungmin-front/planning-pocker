export type VoteValue = '1' | '2' | '3' | '5' | '8' | '13' | '21' | '34' | '55' | '89' | '?' | '☕';
export type StoryStatus = 'voting' | 'revealed' | 'closed';
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
    status: StoryStatus;
    votes: Record<string, VoteValue>;
    final_point?: VoteValue | null;
}
export interface Room {
    id: string;
    name: string;
    players: Player[];
    stories: Story[];
    createdAt: Date;
    currentStoryId?: string | null;
}
export type MessageType = 'ROOM_CREATE' | 'JOIN_ROOM' | 'LEAVE_ROOM' | 'VOTE' | 'REVEAL_VOTES' | 'NEW_STORY' | 'RESET_VOTES' | 'STORY_VOTE' | 'STORY_CREATE' | 'STORY_SELECT' | 'STORY_REVEAL_VOTES' | 'STORY_RESTART_VOTING' | 'STORY_SET_FINAL_POINT' | 'ROOM_TRANSFER_HOST' | 'ROOM_SYNC' | 'HOST_DELEGATE' | 'PLAYER_KICK';
export interface WebSocketMessage {
    type: MessageType;
    payload: any;
}
//# sourceMappingURL=types.d.ts.map