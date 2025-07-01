"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomManager = void 0;
const utils_1 = require("./utils");
const uuid_1 = require("uuid");
class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.socketUserMap = {};
    }
    createRoom(hostNickname, hostSocketId) {
        const roomId = (0, utils_1.generateRoomId)(); // Already uppercase from utils
        const trimmedNickname = hostNickname.trim();
        const hostPlayer = {
            id: (0, uuid_1.v4)(),
            nickname: trimmedNickname,
            socketId: hostSocketId,
            isHost: true,
            isSpectator: false
        };
        const room = {
            id: roomId,
            name: `${trimmedNickname}'s Room`,
            players: [hostPlayer],
            stories: [],
            createdAt: new Date(),
            socketIds: new Set([hostSocketId]),
            currentStoryId: undefined
        };
        this.rooms.set(roomId, room);
        this.socketUserMap[hostSocketId] = {
            roomId,
            playerId: hostPlayer.id
        };
        return room;
    }
    joinRoom(roomId, nickname, socketId, isSpectator) {
        // Trim and validate nickname
        const trimmedNickname = nickname.trim();
        if (!trimmedNickname) {
            return { success: false, error: 'Nickname is required' };
        }
        // Find room (case-insensitive roomId)
        const room = this.rooms.get(roomId.toUpperCase());
        if (!room) {
            return { success: false, error: 'Room not found' };
        }
        const existingPlayer = room.players.find(p => p.nickname.toLowerCase() === trimmedNickname.toLowerCase());
        if (existingPlayer) {
            const suggestions = this.generateNicknameSuggestions(trimmedNickname, room);
            return {
                success: false,
                error: 'Nickname already taken',
                suggestions
            };
        }
        // Auto-detect spectators based on nickname or explicit flag
        const shouldBeSpectator = isSpectator ||
            trimmedNickname.toLowerCase().includes('spectator') ||
            trimmedNickname.toLowerCase().includes('observer');
        const player = {
            id: (0, uuid_1.v4)(),
            nickname: trimmedNickname,
            socketId,
            isHost: false,
            isSpectator: shouldBeSpectator
        };
        room.players.push(player);
        room.socketIds.add(socketId);
        this.socketUserMap[socketId] = {
            roomId,
            playerId: player.id
        };
        return { success: true, room };
    }
    generateNicknameSuggestions(originalNickname, room) {
        const suggestions = [];
        const existingNicknames = new Set(room.players.map(p => p.nickname.toLowerCase()));
        // Strategy 1: Add numbers (John2, John3, etc.) - limit to 1 suggestion
        for (let i = 2; i <= 10; i++) {
            const suggestion = `${originalNickname}${i}`;
            if (!existingNicknames.has(suggestion.toLowerCase())) {
                suggestions.push(suggestion);
                break; // Only take first numbered suggestion
            }
        }
        // Strategy 2: Add underscores (John_, John_1, etc.) - limit to 1 suggestion  
        if (suggestions.length < 3) {
            for (let i = 0; i < 5; i++) {
                const suffix = i === 0 ? '_' : `_${i}`;
                const suggestion = `${originalNickname}${suffix}`;
                if (!existingNicknames.has(suggestion.toLowerCase())) {
                    suggestions.push(suggestion);
                    break; // Only take first underscore suggestion
                }
            }
        }
        // Strategy 3: Add prefixes (New_John, Player_John, etc.) - limit to 1 suggestion
        if (suggestions.length < 3) {
            const prefixes = ['New_', 'Player_', 'User_'];
            for (const prefix of prefixes) {
                const suggestion = `${prefix}${originalNickname}`;
                if (!existingNicknames.has(suggestion.toLowerCase())) {
                    suggestions.push(suggestion);
                    break; // Only take first prefix suggestion
                }
            }
        }
        // Strategy 4: Random suffixes - fill remaining slots
        if (suggestions.length < 3) {
            const suffixes = ['Pro', 'Plus', 'X', 'Star', 'Max'];
            for (const suffix of suffixes) {
                const suggestion = `${originalNickname}${suffix}`;
                if (!existingNicknames.has(suggestion.toLowerCase())) {
                    suggestions.push(suggestion);
                }
                if (suggestions.length >= 3)
                    break;
            }
        }
        return suggestions.slice(0, 3); // Return max 3 suggestions
    }
    getUserRoom(socketId) {
        return this.socketUserMap[socketId]?.roomId;
    }
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }
    getPlayer(socketId) {
        const userInfo = this.socketUserMap[socketId];
        if (!userInfo?.roomId || !userInfo?.playerId)
            return undefined;
        const room = this.rooms.get(userInfo.roomId);
        return room?.players.find(p => p.id === userInfo.playerId);
    }
    removePlayer(socketId) {
        const userInfo = this.socketUserMap[socketId];
        if (!userInfo?.roomId)
            return {};
        const room = this.rooms.get(userInfo.roomId);
        if (!room)
            return {};
        const leavingPlayer = room.players.find(p => p.socketId === socketId);
        const wasHost = leavingPlayer?.isHost || false;
        room.players = room.players.filter(p => p.socketId !== socketId);
        room.socketIds.delete(socketId);
        delete this.socketUserMap[socketId];
        if (room.players.length === 0) {
            this.rooms.delete(userInfo.roomId);
            (0, utils_1.releaseRoomId)(userInfo.roomId);
            return { roomId: userInfo.roomId };
        }
        // If the host left, assign a new host
        let newHost;
        if (wasHost && room.players.length > 0) {
            newHost = room.players[0]; // First remaining player becomes host
            newHost.isHost = true;
        }
        return {
            roomId: userInfo.roomId,
            hostChanged: wasHost && !!newHost,
            newHost
        };
    }
    addStory(roomId, title, description, hostSocketId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return null;
        // Check if the requester is the host
        if (hostSocketId) {
            const player = room.players.find(p => p.socketId === hostSocketId);
            if (!player?.isHost) {
                return null; // Only host can create stories
            }
        }
        const story = {
            id: (0, uuid_1.v4)(),
            title,
            description,
            status: 'voting',
            votes: {}
        };
        room.stories.push(story);
        return story;
    }
    selectStory(roomId, storyId, hostSocketId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return { success: false, error: 'Room not found' };
        }
        // Check if the requester is the host
        const player = room.players.find(p => p.socketId === hostSocketId);
        if (!player?.isHost) {
            return { success: false, error: 'Only the host can select stories for voting' };
        }
        const story = room.stories.find(s => s.id === storyId);
        if (!story) {
            return { success: false, error: 'Story not found' };
        }
        // Set the current story for voting
        room.currentStoryId = storyId;
        story.status = 'voting';
        return { success: true };
    }
    vote(socketId, storyId, vote) {
        const userInfo = this.socketUserMap[socketId];
        if (!userInfo?.roomId) {
            return { success: false, error: 'Not in a room' };
        }
        const room = this.rooms.get(userInfo.roomId);
        if (!room) {
            return { success: false, error: 'Room not found' };
        }
        const player = room.players.find(p => p.socketId === socketId);
        if (!player) {
            return { success: false, error: 'Player not found' };
        }
        // Check if player is a spectator
        if (player.isSpectator) {
            return { success: false, error: 'Spectators cannot vote' };
        }
        const story = room.stories.find(s => s.id === storyId);
        if (!story) {
            return { success: false, error: 'Story not found' };
        }
        if (story.status === 'closed' || story.status === 'revealed') {
            return { success: false, error: 'Voting not allowed for this story' };
        }
        // Validate vote value
        const validVotes = ['1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'];
        if (!validVotes.includes(vote)) {
            return { success: false, error: 'Invalid vote value' };
        }
        if (!story.votes)
            story.votes = {};
        story.votes[player.id] = vote;
        if (story.status === 'voting') {
            // Story is already in voting state
        }
        return { success: true };
    }
    revealVotes(socketId, storyId) {
        const userInfo = this.socketUserMap[socketId];
        if (!userInfo?.roomId) {
            return { success: false, error: 'Not in a room' };
        }
        const room = this.rooms.get(userInfo.roomId);
        if (!room) {
            return { success: false, error: 'Room not found' };
        }
        const player = room.players.find(p => p.socketId === socketId);
        if (!player?.isHost) {
            return { success: false, error: 'Only the host can reveal votes' };
        }
        const story = room.stories.find(s => s.id === storyId);
        if (!story) {
            return { success: false, error: 'Story not found' };
        }
        story.status = 'revealed';
        return { success: true, story };
    }
    restartVoting(socketId, storyId) {
        const userInfo = this.socketUserMap[socketId];
        if (!userInfo?.roomId) {
            return { success: false, error: 'Not in a room' };
        }
        const room = this.rooms.get(userInfo.roomId);
        if (!room) {
            return { success: false, error: 'Room not found' };
        }
        const player = room.players.find(p => p.socketId === socketId);
        if (!player?.isHost) {
            return { success: false, error: 'Only the host can restart voting' };
        }
        const story = room.stories.find(s => s.id === storyId);
        if (!story) {
            return { success: false, error: 'Story not found' };
        }
        story.votes = {};
        story.status = 'voting';
        return { success: true, story };
    }
    setFinalPoint(socketId, storyId, point) {
        const userInfo = this.socketUserMap[socketId];
        if (!userInfo?.roomId) {
            return { success: false, error: 'Not in a room' };
        }
        const room = this.rooms.get(userInfo.roomId);
        if (!room) {
            return { success: false, error: 'Room not found' };
        }
        const player = room.players.find(p => p.socketId === socketId);
        if (!player?.isHost) {
            return { success: false, error: 'Only the host can set final points' };
        }
        const story = room.stories.find(s => s.id === storyId);
        if (!story) {
            return { success: false, error: 'Story not found' };
        }
        story.final_point = point;
        story.status = 'closed';
        return { success: true, story };
    }
    transferHost(socketId, toNickname) {
        const userInfo = this.socketUserMap[socketId];
        if (!userInfo?.roomId) {
            return { success: false, error: 'Not in a room' };
        }
        const room = this.rooms.get(userInfo.roomId);
        if (!room) {
            return { success: false, error: 'Room not found' };
        }
        const currentHost = room.players.find(p => p.socketId === socketId);
        if (!currentHost?.isHost) {
            return { success: false, error: 'Only the host can transfer host role' };
        }
        const targetPlayer = room.players.find(p => p.nickname === toNickname);
        if (!targetPlayer) {
            return { success: false, error: 'Target player not found' };
        }
        if (targetPlayer.id === currentHost.id) {
            return { success: false, error: 'Cannot transfer host role to yourself' };
        }
        // Transfer host role
        currentHost.isHost = false;
        targetPlayer.isHost = true;
        return {
            success: true,
            newHost: targetPlayer,
            oldHost: currentHost,
            roomId: userInfo.roomId
        };
    }
    syncRoom(socketId) {
        const userInfo = this.socketUserMap[socketId];
        if (!userInfo?.roomId) {
            return { success: false, error: 'Not in a room' };
        }
        const room = this.rooms.get(userInfo.roomId);
        if (!room) {
            return { success: false, error: 'Room not found' };
        }
        const player = room.players.find(p => p.socketId === socketId);
        if (!player) {
            return { success: false, error: 'Player not found in room' };
        }
        // Get full room state
        const roomState = this.getRoomState(userInfo.roomId);
        // Add player-specific data
        const playerState = {
            room: {
                id: room.id,
                name: room.name,
                players: room.players,
                stories: room.stories,
                createdAt: room.createdAt,
                currentStoryId: room.currentStoryId || null
            },
            currentPlayer: player
        };
        return {
            success: true,
            roomState,
            playerState
        };
    }
    getRoomState(roomId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return null;
        return {
            roomId: room.id,
            name: room.name,
            players: room.players.map(p => ({
                id: p.id,
                nickname: p.nickname,
                isHost: p.isHost,
                isSpectator: p.isSpectator,
                hasVoted: room.currentStoryId && room.stories.find(s => s.id === room.currentStoryId)?.votes?.[p.id] !== undefined
            })),
            stories: room.stories,
            currentStoryId: room.currentStoryId
        };
    }
}
exports.RoomManager = RoomManager;
//# sourceMappingURL=roomManager.js.map