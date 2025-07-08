import { Room, Player, Story, VoteValue, JiraMetadata, BacklogSettings } from '@planning-poker/shared';
import { generateRoomId, releaseRoomId } from './utils';
import { ServerRoom, SocketUserMap } from './types';
import { v4 as uuidv4 } from 'uuid';
import RoomSessionService from './services/RoomSessionService';

export class RoomManager {
  private rooms = new Map<string, ServerRoom>();
  private socketUserMap: SocketUserMap = {};

  createRoom(hostNickname: string, hostSocketId: string): ServerRoom {
    const roomId = generateRoomId(); // Already uppercase from utils
    const trimmedNickname = hostNickname.trim();
    
    const hostPlayer: Player = {
      id: uuidv4(),
      nickname: trimmedNickname,
      socketId: hostSocketId,
      isHost: true,
      isSpectator: false
    };

    const room: ServerRoom = {
      id: roomId,
      name: `${trimmedNickname}'s Room`,
      players: [hostPlayer],
      stories: [],
      createdAt: new Date(),
      socketIds: new Set([hostSocketId]),
      currentStoryId: undefined,
      backlogSettings: {
        sortOption: 'created-desc',
        filterOption: 'all'
      }
    };

    this.rooms.set(roomId, room);
    this.socketUserMap[hostSocketId] = {
      roomId,
      playerId: hostPlayer.id
    };

    return room;
  }

  joinRoom(roomId: string, nickname: string, socketId: string, isSpectator?: boolean): { success: boolean; room?: ServerRoom; player?: Player; error?: string; suggestions?: string[] } {
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

    const player: Player = {
      id: uuidv4(),
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

    return { success: true, room, player };
  }

  private generateNicknameSuggestions(originalNickname: string, room: ServerRoom): string[] {
    const suggestions: string[] = [];
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
        if (suggestions.length >= 3) break;
      }
    }
    
    return suggestions.slice(0, 3); // Return max 3 suggestions
  }

  getUserRoom(socketId: string): string | undefined {
    return this.socketUserMap[socketId]?.roomId;
  }

  getRoom(roomId: string): ServerRoom | undefined {
    return this.rooms.get(roomId);
  }

  getPlayer(socketId: string): Player | undefined {
    const userInfo = this.socketUserMap[socketId];
    if (!userInfo?.roomId || !userInfo?.playerId) return undefined;

    const room = this.rooms.get(userInfo.roomId);
    return room?.players.find(p => p.id === userInfo.playerId);
  }

  removePlayer(socketId: string): { roomId?: string; hostChanged?: boolean; newHost?: Player } {
    const userInfo = this.socketUserMap[socketId];
    if (!userInfo?.roomId) return {};

    const room = this.rooms.get(userInfo.roomId);
    if (!room) return {};

    const leavingPlayer = room.players.find(p => p.socketId === socketId);
    const wasHost = leavingPlayer?.isHost || false;

    // Remove player's votes only from ongoing voting (not completed votes)
    if (leavingPlayer) {
      room.stories.forEach(story => {
        if (story.votes && story.votes[leavingPlayer.id] && story.status === 'voting') {
          delete story.votes[leavingPlayer.id];
        }
      });
    }

    room.players = room.players.filter(p => p.socketId !== socketId);
    room.socketIds.delete(socketId);
    delete this.socketUserMap[socketId];

    if (room.players.length === 0) {
      this.rooms.delete(userInfo.roomId);
      releaseRoomId(userInfo.roomId);
      return { roomId: userInfo.roomId };
    }

    // If the host left, assign a new host
    let newHost: Player | undefined;
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

  addStory(roomId: string, title: string, description?: string, hostSocketId?: string, jiraMetadata?: JiraMetadata): Story | null {
    const room = this.rooms.get(roomId.toUpperCase());
    if (!room) return null;

    // Check if the requester is the host
    if (hostSocketId) {
      const player = room.players.find(p => p.socketId === hostSocketId);
      if (!player?.isHost) {
        return null; // Only host can create stories
      }
    }

    const story: Story = {
      id: uuidv4(),
      title,
      description,
      status: 'voting',
      votes: {},
      ...(jiraMetadata && { jiraMetadata })
    };

    room.stories.push(story);
    
    // RoomSession: 스토리 추가
    RoomSessionService.addStory(room.id, story).catch(console.error);
    
    return story;
  }

  selectStory(roomId: string, storyId: string, hostSocketId: string): { success: boolean; error?: string } {
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
    
    // RoomSession: 투표 세션 시작
    RoomSessionService.startVotingSession(room.id, storyId).catch(console.error);
    
    return { success: true };
  }




  vote(socketId: string, storyId: string, vote: VoteValue): { success: boolean; error?: string } {
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
    const validVotes: VoteValue[] = ['1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'];
    if (!validVotes.includes(vote)) {
      return { success: false, error: 'Invalid vote value' };
    }

    if (!story.votes) story.votes = {};
    story.votes[player.id] = vote;

    if (story.status === 'voting') {
      // Story is already in voting state
    }

    return { success: true };
  }

  revealVotes(socketId: string, storyId: string): { success: boolean; error?: string; story?: Story } {
    console.log(`[RoomManager] revealVotes called - socketId: ${socketId}, storyId: ${storyId}`);
    
    const userInfo = this.socketUserMap[socketId];
    if (!userInfo?.roomId) {
      console.log(`[RoomManager] revealVotes failed - user not in room. SocketId: ${socketId}`);
      return { success: false, error: 'Not in a room' };
    }

    const room = this.rooms.get(userInfo.roomId);
    if (!room) {
      console.log(`[RoomManager] revealVotes failed - room not found. RoomId: ${userInfo.roomId}`);
      return { success: false, error: 'Room not found' };
    }

    const player = room.players.find(p => p.socketId === socketId);
    if (!player?.isHost) {
      console.log(`[RoomManager] revealVotes failed - player is not host. Player:`, player);
      return { success: false, error: 'Only the host can reveal votes' };
    }

    const story = room.stories.find(s => s.id === storyId);
    if (!story) {
      console.log(`[RoomManager] revealVotes failed - story not found. StoryId: ${storyId}, Available stories:`, room.stories.map(s => s.id));
      return { success: false, error: 'Story not found' };
    }

    console.log(`[RoomManager] revealVotes success - revealing votes for story ${storyId}. Current status: ${story.status}, votes:`, story.votes);
    story.status = 'revealed';
    console.log(`[RoomManager] revealVotes - story status changed to 'revealed'`);
    return { success: true, story };
  }

  restartVoting(socketId: string, storyId: string): { success: boolean; error?: string; story?: Story } {
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

  setFinalPoint(socketId: string, storyId: string, point: VoteValue): { success: boolean; error?: string; story?: Story } {
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

  skipStory(socketId: string, storyId: string): { success: boolean; error?: string; story?: Story } {
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
      return { success: false, error: 'Only the host can skip stories' };
    }

    const story = room.stories.find(s => s.id === storyId);
    if (!story) {
      return { success: false, error: 'Story not found' };
    }

    // Don't allow skipping already completed stories
    if (story.status === 'closed') {
      return { success: false, error: 'Cannot skip a completed story' };
    }

    // Don't allow skipping already skipped stories
    if (story.status === 'skipped') {
      return { success: false, error: 'Story is already skipped' };
    }

    story.status = 'skipped';
    // Clear votes when skipping (optional - could preserve for history)
    // story.votes = {};
    
    return { success: true, story };
  }

  transferHost(socketId: string, toNickname: string): { success: boolean; error?: string; newHost?: Player; oldHost?: Player; roomId?: string } {
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

  syncRoom(socketId: string): { success: boolean; error?: string; roomState?: any; playerState?: any } {
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

  delegateHost(socketId: string, newHostId: string): { success: boolean; error?: string; newHost?: Player; oldHost?: Player; roomId?: string } {
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
      return { success: false, error: 'Only the host can delegate host role' };
    }

    const targetPlayer = room.players.find(p => p.id === newHostId);
    if (!targetPlayer) {
      return { success: false, error: 'Target player not found' };
    }

    if (targetPlayer.id === currentHost.id) {
      return { success: false, error: 'Cannot delegate host role to yourself' };
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

  kickPlayer(socketId: string, playerId: string): { success: boolean; error?: string; kickedPlayer?: Player; roomId?: string } {
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
      return { success: false, error: 'Only the host can kick players' };
    }

    const targetPlayer = room.players.find(p => p.id === playerId);
    if (!targetPlayer) {
      return { success: false, error: 'Target player not found' };
    }

    if (targetPlayer.id === currentHost.id) {
      return { success: false, error: 'Cannot kick yourself' };
    }

    // Remove player from room
    room.players = room.players.filter(p => p.id !== playerId);
    
    // Remove player's socket mapping
    delete this.socketUserMap[targetPlayer.socketId];

    // Remove player's votes from ongoing voting sessions
    room.stories.forEach(story => {
      if (story.votes && story.votes[playerId] && story.status === 'voting') {
        delete story.votes[playerId];
      }
    });

    return { 
      success: true, 
      kickedPlayer: targetPlayer,
      roomId: userInfo.roomId
    };
  }

  updateBacklogSettings(socketId: string, settings: BacklogSettings): { success: boolean; error?: string; settings?: BacklogSettings } {
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
      return { success: false, error: 'Only the host can change backlog settings' };
    }

    room.backlogSettings = settings;
    return { success: true, settings };
  }

  getRoomState(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

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
      currentStoryId: room.currentStoryId,
      backlogSettings: room.backlogSettings
    };
  }

  // Debug methods for room inspection
  getAllRooms(): Map<string, ServerRoom> {
    return this.rooms;
  }

  getSocketUserMap(): SocketUserMap {
    return this.socketUserMap;
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  getTotalPlayerCount(): number {
    let total = 0;
    this.rooms.forEach(room => {
      total += room.players.length;
    });
    return total;
  }
}