import { RoomManager } from '../roomManager';

describe('Host Delegation', () => {
  let roomManager: RoomManager;
  let hostSocketId: string;
  let playerSocketId: string;
  let roomId: string;

  beforeEach(() => {
    roomManager = new RoomManager();
    hostSocketId = 'host-socket-123';
    playerSocketId = 'player-socket-456';
    
    // Create room with host
    const room = roomManager.createRoom('TestHost', hostSocketId);
    expect(room).toBeDefined();
    roomId = room.id;
    
    // Add another player
    const joinResult = roomManager.joinRoom(roomId, 'TestPlayer', playerSocketId);
    expect(joinResult.success).toBe(true);
  });

  describe('delegateHost', () => {
    it('should successfully delegate host to another player', () => {
      // Get the player ID
      const room = roomManager.getRoomState(roomId);
      const targetPlayer = room?.players.find(p => p.nickname === 'TestPlayer');
      expect(targetPlayer).toBeDefined();
      
      const result = roomManager.delegateHost(hostSocketId, targetPlayer!.id);
      
      expect(result.success).toBe(true);
      expect(result.newHost?.nickname).toBe('TestPlayer');
      expect(result.oldHost?.nickname).toBe('TestHost');
      expect(result.roomId).toBe(roomId);
      
      // Verify the host change in room state
      const updatedRoom = roomManager.getRoomState(roomId);
      const newHost = updatedRoom?.players.find(p => p.nickname === 'TestPlayer');
      const oldHost = updatedRoom?.players.find(p => p.nickname === 'TestHost');
      
      expect(newHost?.isHost).toBe(true);
      expect(oldHost?.isHost).toBe(false);
    });

    it('should fail when non-host tries to delegate', () => {
      const room = roomManager.getRoomState(roomId);
      const targetPlayer = room?.players.find(p => p.nickname === 'TestHost');
      
      const result = roomManager.delegateHost(playerSocketId, targetPlayer!.id);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Only the host can delegate host role');
    });

    it('should fail when trying to delegate to non-existent player', () => {
      const result = roomManager.delegateHost(hostSocketId, 'non-existent-id');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Target player not found');
    });

    it('should fail when trying to delegate to yourself', () => {
      const room = roomManager.getRoomState(roomId);
      const hostPlayer = room?.players.find(p => p.nickname === 'TestHost');
      
      const result = roomManager.delegateHost(hostSocketId, hostPlayer!.id);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot delegate host role to yourself');
    });

    it('should fail when player is not in a room', () => {
      const result = roomManager.delegateHost('non-existent-socket', 'some-player-id');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Not in a room');
    });

    it('should fail when room does not exist', () => {
      // Remove player from room mapping but keep socket reference
      const userInfo = roomManager['socketUserMap'][hostSocketId];
      if (userInfo) {
        userInfo.roomId = 'non-existent-room';
      }
      
      const result = roomManager.delegateHost(hostSocketId, 'some-player-id');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Room not found');
    });
  });

  describe('Host delegation with multiple players', () => {
    let player2SocketId: string;
    let player3SocketId: string;

    beforeEach(() => {
      player2SocketId = 'player2-socket-789';
      player3SocketId = 'player3-socket-012';
      
      // Add more players
      roomManager.joinRoom(roomId, 'Player2', player2SocketId);
      roomManager.joinRoom(roomId, 'Player3', player3SocketId);
    });

    it('should delegate host to any player in the room', () => {
      const room = roomManager.getRoomState(roomId);
      const player2 = room?.players.find(p => p.nickname === 'Player2');
      
      const result = roomManager.delegateHost(hostSocketId, player2!.id);
      
      expect(result.success).toBe(true);
      expect(result.newHost?.nickname).toBe('Player2');
      
      // Verify only the new host has host privileges
      const updatedRoom = roomManager.getRoomState(roomId);
      const hostCount = updatedRoom?.players.filter(p => p.isHost).length;
      expect(hostCount).toBe(1);
      
      const newHost = updatedRoom?.players.find(p => p.isHost);
      expect(newHost?.nickname).toBe('Player2');
    });

    it('should allow new host to delegate to another player', () => {
      // First delegation
      const room = roomManager.getRoomState(roomId);
      const player2 = room?.players.find(p => p.nickname === 'Player2');
      roomManager.delegateHost(hostSocketId, player2!.id);
      
      // Second delegation by new host
      const player3 = room?.players.find(p => p.nickname === 'Player3');
      const result = roomManager.delegateHost(player2SocketId, player3!.id);
      
      expect(result.success).toBe(true);
      expect(result.newHost?.nickname).toBe('Player3');
      
      // Verify final host state
      const finalRoom = roomManager.getRoomState(roomId);
      const finalHost = finalRoom?.players.find(p => p.isHost);
      expect(finalHost?.nickname).toBe('Player3');
    });
  });
});