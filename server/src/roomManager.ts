import { Room, Player, Story, VoteValue } from '@planning-poker/shared';
import { generateRoomId, releaseRoomId } from './utils';
import { ServerRoom, SocketUserMap } from './types';
import { v4 as uuidv4 } from 'uuid';

export class RoomManager {
  private rooms = new Map<string, ServerRoom>();
  private socketUserMap: SocketUserMap = {};

  createRoom(hostNickname: string, hostSocketId: string): ServerRoom {
    const roomId = generateRoomId();
    const hostPlayer: Player = {
      id: uuidv4(),
      nickname: hostNickname,
      socketId: hostSocketId,
      isHost: true,
      isSpectator: false
    };

    const room: ServerRoom = {
      id: roomId,
      name: `${hostNickname}'s Room`,
      players: [hostPlayer],
      stories: [],
      createdAt: new Date(),
      socketIds: new Set([hostSocketId])
    };

    this.rooms.set(roomId, room);
    this.socketUserMap[hostSocketId] = {
      roomId,
      playerId: hostPlayer.id
    };

    return room;
  }

  joinRoom(roomId: string, nickname: string, socketId: string): { success: boolean; room?: ServerRoom; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    const existingPlayer = room.players.find(p => p.nickname === nickname);
    if (existingPlayer) {
      return { success: false, error: 'Nickname already taken' };
    }

    const player: Player = {
      id: uuidv4(),
      nickname,
      socketId,
      isHost: false,
      isSpectator: false
    };

    room.players.push(player);
    room.socketIds.add(socketId);
    this.socketUserMap[socketId] = {
      roomId,
      playerId: player.id
    };

    return { success: true, room };
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

  addStory(roomId: string, title: string, description?: string): Story | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const story: Story = {
      id: uuidv4(),
      title,
      description,
      status: 'pending',
      votes: {}
    };

    room.stories.push(story);
    return story;
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

    const story = room.stories.find(s => s.id === storyId);
    if (!story) {
      return { success: false, error: 'Story not found' };
    }

    if (story.status === 'closed' || story.status === 'revealed') {
      return { success: false, error: 'Voting not allowed for this story' };
    }

    if (!story.votes) story.votes = {};
    story.votes[player.id] = vote;

    if (story.status === 'pending') {
      story.status = 'voting';
    }

    return { success: true };
  }

  revealVotes(socketId: string, storyId: string): { success: boolean; error?: string; story?: Story } {
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

  transferHost(socketId: string, toNickname: string): { success: boolean; error?: string; newHost?: Player; oldHost?: Player } {
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
      oldHost: currentHost
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
      ...roomState,
      isHost: player.isHost,
      myId: player.id,
      myNickname: player.nickname
    };

    return { 
      success: true, 
      roomState,
      playerState 
    };
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
      currentStoryId: room.currentStoryId
    };
  }
}