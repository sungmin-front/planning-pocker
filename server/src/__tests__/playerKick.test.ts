import { RoomManager } from '../roomManager';

describe('Player Kick', () => {
  let roomManager: RoomManager;
  let hostSocketId: string;
  let player1SocketId: string;
  let player2SocketId: string;
  let roomId: string;

  beforeEach(() => {
    roomManager = new RoomManager();
    hostSocketId = 'host-socket-123';
    player1SocketId = 'player1-socket-456';
    player2SocketId = 'player2-socket-789';
    
    // Create room with host
    const room = roomManager.createRoom('TestHost', hostSocketId);
    expect(room).toBeDefined();
    roomId = room.id;
    
    // Add players
    const join1Result = roomManager.joinRoom(roomId, 'Player1', player1SocketId);
    const join2Result = roomManager.joinRoom(roomId, 'Player2', player2SocketId);
    expect(join1Result.success).toBe(true);
    expect(join2Result.success).toBe(true);
  });

  describe('kickPlayer', () => {
    it('should successfully kick a player from the room', () => {
      const room = roomManager.getRoomState(roomId);
      const targetPlayer = room?.players.find(p => p.nickname === 'Player1');
      expect(targetPlayer).toBeDefined();
      
      const result = roomManager.kickPlayer(hostSocketId, targetPlayer!.id);
      
      expect(result.success).toBe(true);
      expect(result.kickedPlayer?.nickname).toBe('Player1');
      expect(result.roomId).toBe(roomId);
      
      // Verify player is removed from room
      const updatedRoom = roomManager.getRoomState(roomId);
      const kickedPlayer = updatedRoom?.players.find(p => p.nickname === 'Player1');
      expect(kickedPlayer).toBeUndefined();
      
      // Verify other players are still in room
      expect(updatedRoom?.players.length).toBe(2); // Host + Player2
      const remainingPlayer = updatedRoom?.players.find(p => p.nickname === 'Player2');
      expect(remainingPlayer).toBeDefined();
    });

    it('should remove player from socket mapping when kicked', () => {
      const room = roomManager.getRoomState(roomId);
      const targetPlayer = room?.players.find(p => p.nickname === 'Player1');
      
      // Verify player is in socket mapping before kick
      expect(roomManager['socketUserMap'][player1SocketId]).toBeDefined();
      
      roomManager.kickPlayer(hostSocketId, targetPlayer!.id);
      
      // Verify player is removed from socket mapping
      expect(roomManager['socketUserMap'][player1SocketId]).toBeUndefined();
    });

    it('should fail when non-host tries to kick player', () => {
      const room = roomManager.getRoomState(roomId);
      const targetPlayer = room?.players.find(p => p.nickname === 'Player2');
      
      const result = roomManager.kickPlayer(player1SocketId, targetPlayer!.id);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Only the host can kick players');
    });

    it('should fail when trying to kick non-existent player', () => {
      const result = roomManager.kickPlayer(hostSocketId, 'non-existent-player-id');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Target player not found');
    });

    it('should fail when host tries to kick themselves', () => {
      const room = roomManager.getRoomState(roomId);
      const hostPlayer = room?.players.find(p => p.nickname === 'TestHost');
      
      const result = roomManager.kickPlayer(hostSocketId, hostPlayer!.id);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot kick yourself');
    });

    it('should fail when player is not in a room', () => {
      const result = roomManager.kickPlayer('non-existent-socket', 'some-player-id');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Not in a room');
    });

    it('should fail when room does not exist', () => {
      // Manipulate socket mapping to point to non-existent room
      const userInfo = roomManager['socketUserMap'][hostSocketId];
      if (userInfo) {
        userInfo.roomId = 'non-existent-room';
      }
      
      const result = roomManager.kickPlayer(hostSocketId, 'some-player-id');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Room not found');
    });
  });

  describe('Player kick with voting in progress', () => {
    let storyId: string;

    beforeEach(() => {
      // Create a story and start voting
      const story = roomManager.addStory(roomId, 'Test Story', 'Description', hostSocketId);
      expect(story).toBeDefined();
      storyId = story!.id;
      
      // Set current story and make players vote
      const room = roomManager['rooms'].get(roomId);
      if (room) {
        room.currentStoryId = storyId;
      }
      
      // Players vote
      roomManager.vote(player1SocketId, storyId, '5');
      roomManager.vote(player2SocketId, storyId, '8');
    });

    it('should remove kicked player votes from ongoing voting', () => {
      const room = roomManager.getRoomState(roomId);
      const targetPlayer = room?.players.find(p => p.nickname === 'Player1');
      
      // Verify vote exists before kick
      const storyBefore = roomManager['rooms'].get(roomId)?.stories.find(s => s.id === storyId);
      expect(storyBefore?.votes?.[targetPlayer!.id]).toBe('5');
      
      // Kick player
      roomManager.kickPlayer(hostSocketId, targetPlayer!.id);
      
      // Verify vote is removed
      const storyAfter = roomManager['rooms'].get(roomId)?.stories.find(s => s.id === storyId);
      expect(storyAfter?.votes?.[targetPlayer!.id]).toBeUndefined();
      
      // Verify other votes remain
      const remainingPlayer = room?.players.find(p => p.nickname === 'Player2');
      expect(storyAfter?.votes?.[remainingPlayer!.id]).toBe('8');
    });

    it('should not remove votes from completed voting sessions', () => {
      const room = roomManager.getRoomState(roomId);
      const targetPlayer = room?.players.find(p => p.nickname === 'Player1');
      
      // Complete the voting by revealing votes
      roomManager.revealVotes(hostSocketId, storyId);
      
      // Verify story status is 'revealed'
      const storyRevealed = roomManager['rooms'].get(roomId)?.stories.find(s => s.id === storyId);
      expect(storyRevealed?.status).toBe('revealed');
      expect(storyRevealed?.votes?.[targetPlayer!.id]).toBe('5');
      
      // Kick player
      roomManager.kickPlayer(hostSocketId, targetPlayer!.id);
      
      // Verify vote is NOT removed from completed voting
      const storyAfterKick = roomManager['rooms'].get(roomId)?.stories.find(s => s.id === storyId);
      expect(storyAfterKick?.votes?.[targetPlayer!.id]).toBe('5');
    });

    it('should handle multiple voting sessions correctly', () => {
      const room = roomManager.getRoomState(roomId);
      const targetPlayer = room?.players.find(p => p.nickname === 'Player1');
      
      // Complete first voting session
      roomManager.revealVotes(hostSocketId, storyId);
      
      // Create second story and start new voting
      const story2 = roomManager.addStory(roomId, 'Test Story 2', 'Description 2', hostSocketId);
      const story2Id = story2!.id;
      roomManager.vote(player1SocketId, story2Id, '3');
      roomManager.vote(player2SocketId, story2Id, '13');
      
      // Kick player
      roomManager.kickPlayer(hostSocketId, targetPlayer!.id);
      
      // Verify first story votes remain (completed session)
      const story1After = roomManager['rooms'].get(roomId)?.stories.find(s => s.id === storyId);
      expect(story1After?.votes?.[targetPlayer!.id]).toBe('5');
      
      // Verify second story votes are removed (ongoing session)
      const story2After = roomManager['rooms'].get(roomId)?.stories.find(s => s.id === story2Id);
      expect(story2After?.votes?.[targetPlayer!.id]).toBeUndefined();
    });
  });

  describe('Room state after player kick', () => {
    it('should maintain room integrity after kicking player', () => {
      const initialRoom = roomManager.getRoomState(roomId);
      expect(initialRoom?.players.length).toBe(3); // Host + 2 players
      
      const targetPlayer = initialRoom?.players.find(p => p.nickname === 'Player1');
      roomManager.kickPlayer(hostSocketId, targetPlayer!.id);
      
      const finalRoom = roomManager.getRoomState(roomId);
      expect(finalRoom?.players.length).toBe(2); // Host + 1 player
      expect(finalRoom?.roomId).toBe(roomId);
      expect(finalRoom?.name).toBe(initialRoom?.name);
      
      // Verify host is still host
      const host = finalRoom?.players.find(p => p.isHost);
      expect(host?.nickname).toBe('TestHost');
    });

    it('should allow kicked player ID to be reused in different room', () => {
      const room = roomManager.getRoomState(roomId);
      const targetPlayer = room?.players.find(p => p.nickname === 'Player1');
      const kickedPlayerId = targetPlayer!.id;
      
      // Kick player
      roomManager.kickPlayer(hostSocketId, kickedPlayerId);
      
      // Create new room
      const newHostSocket = 'new-host-socket';
      const newRoom = roomManager.createRoom('NewHost', newHostSocket);
      expect(newRoom).toBeDefined();
      
      // Join with same socket (simulating player reconnecting)
      const rejoinResult = roomManager.joinRoom(newRoom.id, 'Player1Rejoined', player1SocketId);
      expect(rejoinResult.success).toBe(true);
    });
  });
});