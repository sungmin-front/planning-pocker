import { Player, Story, VoteValue } from '@planning-poker/shared';
import { ServerRoom } from './types';
export declare class RoomManager {
    private rooms;
    private socketUserMap;
    createRoom(hostNickname: string, hostSocketId: string): ServerRoom;
    joinRoom(roomId: string, nickname: string, socketId: string): {
        success: boolean;
        room?: ServerRoom;
        error?: string;
    };
    getUserRoom(socketId: string): string | undefined;
    getRoom(roomId: string): ServerRoom | undefined;
    getPlayer(socketId: string): Player | undefined;
    removePlayer(socketId: string): {
        roomId?: string;
        hostChanged?: boolean;
        newHost?: Player;
    };
    addStory(roomId: string, title: string, description?: string): Story | null;
    vote(socketId: string, storyId: string, vote: VoteValue): {
        success: boolean;
        error?: string;
    };
    revealVotes(socketId: string, storyId: string): {
        success: boolean;
        error?: string;
        story?: Story;
    };
    restartVoting(socketId: string, storyId: string): {
        success: boolean;
        error?: string;
        story?: Story;
    };
    setFinalPoint(socketId: string, storyId: string, point: VoteValue): {
        success: boolean;
        error?: string;
        story?: Story;
    };
    transferHost(socketId: string, toNickname: string): {
        success: boolean;
        error?: string;
        newHost?: Player;
        oldHost?: Player;
    };
    syncRoom(socketId: string): {
        success: boolean;
        error?: string;
        roomState?: any;
        playerState?: any;
    };
    getRoomState(roomId: string): {
        roomId: string;
        name: string;
        players: {
            id: string;
            nickname: string;
            isHost: boolean;
            isSpectator: boolean;
            hasVoted: boolean | "" | undefined;
        }[];
        stories: Story[];
        currentStoryId: string | undefined;
    } | null;
}
