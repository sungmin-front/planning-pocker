import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { WebSocketTestClient, startServer, stopServer, waitForServer } from './setup';

describe('Room Management E2E Tests', () => {
  let hostClient: WebSocketTestClient;
  let playerClient: WebSocketTestClient;
  let spectatorClient: WebSocketTestClient;

  beforeAll(async () => {
    console.log('Starting server for E2E tests...');
    await startServer();
    await waitForServer();
    console.log('Server ready for testing');
  }, 60000);

  afterAll(() => {
    console.log('Stopping server...');
    stopServer();
  });

  beforeEach(async () => {
    hostClient = new WebSocketTestClient();
    playerClient = new WebSocketTestClient();
    spectatorClient = new WebSocketTestClient();
    
    await hostClient.connect();
    await playerClient.connect();
    await spectatorClient.connect();
  });

  afterEach(() => {
    hostClient.disconnect();
    playerClient.disconnect();
    spectatorClient.disconnect();
  });

  describe('Room Creation', () => {
    it('should create a room and set host correctly', async () => {
      // Host creates a room
      hostClient.send({
        type: 'ROOM_CREATE',
        payload: { nickname: 'HostPlayer' }
      });

      // Wait for room creation response
      const createResponse = await hostClient.waitForMessage('room:created');
      
      expect(createResponse).toBeDefined();
      expect(createResponse.payload.room).toBeDefined();
      expect(createResponse.payload.room.name).toBe("HostPlayer's Room");
      expect(createResponse.payload.room.players).toHaveLength(1);
      expect(createResponse.payload.room.players[0].nickname).toBe('HostPlayer');
      expect(createResponse.payload.room.players[0].isHost).toBe(true);
      expect(createResponse.payload.player).toBeDefined();
      expect(createResponse.payload.player.isHost).toBe(true);
    });

    it('should generate unique room IDs', async () => {
      // Create first room
      hostClient.send({
        type: 'ROOM_CREATE',
        payload: { nickname: 'Host1' }
      });
      
      const room1Response = await hostClient.waitForMessage('room:created');
      const room1Id = room1Response.payload.room.id;

      // Create second room with different client
      playerClient.send({
        type: 'ROOM_CREATE',
        payload: { nickname: 'Host2' }
      });
      
      const room2Response = await playerClient.waitForMessage('room:created');
      const room2Id = room2Response.payload.room.id;

      expect(room1Id).not.toBe(room2Id);
      expect(room1Id).toMatch(/^[A-Z0-9]{6}$/);
      expect(room2Id).toMatch(/^[A-Z0-9]{6}$/);
    });
  });

  describe('Room Joining', () => {
    let roomId: string;

    beforeEach(async () => {
      // Create a room first
      hostClient.send({
        type: 'ROOM_CREATE',
        payload: { nickname: 'GameHost' }
      });
      
      const createResponse = await hostClient.waitForMessage('room:created');
      roomId = createResponse.payload.room.id;
    });

    it('should allow players to join existing room', async () => {
      // Player joins the room
      playerClient.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'Player1' }
      });

      // Wait for join response
      const joinResponse = await playerClient.waitForMessage('room:joined');
      
      expect(joinResponse).toBeDefined();
      expect(joinResponse.payload.room.id).toBe(roomId);
      expect(joinResponse.payload.room.players).toHaveLength(2);
      expect(joinResponse.payload.player.nickname).toBe('Player1');
      expect(joinResponse.payload.player.isHost).toBe(false);

      // Host should receive player joined notification
      const hostNotification = await hostClient.waitForMessage('room:playerJoined');
      expect(hostNotification).toBeDefined();
      expect(hostNotification.payload.player.nickname).toBe('Player1');
      expect(hostNotification.payload.room.players).toHaveLength(2);
    });

    it('should reject joining non-existent room', async () => {
      playerClient.send({
        type: 'JOIN_ROOM',
        payload: { roomId: 'INVALID', nickname: 'Player1' }
      });

      const errorResponse = await playerClient.waitForMessage('room:joinError');
      expect(errorResponse).toBeDefined();
      expect(errorResponse.payload.error).toBe('Room not found');
    });

    it('should reject duplicate nicknames in same room', async () => {
      // First player joins
      playerClient.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'SameName' }
      });

      await playerClient.waitForMessage('room:joined');

      // Second player tries to join with same nickname
      spectatorClient.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'SameName' }
      });

      const errorResponse = await spectatorClient.waitForMessage('room:joinError');
      expect(errorResponse).toBeDefined();
      expect(errorResponse.payload.error).toBe('Nickname already taken');
    });

    it('should support multiple players joining', async () => {
      const players = ['Alice', 'Bob', 'Charlie'];
      const clients = [playerClient, spectatorClient];
      
      // Add more clients for this test
      const extraClient = new WebSocketTestClient();
      await extraClient.connect();
      clients.push(extraClient);

      // All players join
      for (let i = 0; i < players.length; i++) {
        if (i < clients.length) {
          clients[i].send({
            type: 'JOIN_ROOM',
            payload: { roomId, nickname: players[i] }
          });
          
          const joinResponse = await clients[i].waitForMessage('room:joined');
          expect(joinResponse.payload.room.players).toHaveLength(i + 2); // +1 for host, +1 for current player
        }
      }

      extraClient.disconnect();
    });
  });

  describe('Host Management', () => {
    let roomId: string;

    beforeEach(async () => {
      // Create room and add a player
      hostClient.send({
        type: 'ROOM_CREATE',
        payload: { nickname: 'OriginalHost' }
      });
      
      const createResponse = await hostClient.waitForMessage('room:created');
      roomId = createResponse.payload.room.id;

      playerClient.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'Player1' }
      });
      
      await playerClient.waitForMessage('room:joined');
      await hostClient.waitForMessage('room:playerJoined');
    });

    it('should transfer host to another player', async () => {
      // Host transfers host role
      hostClient.send({
        type: 'ROOM_TRANSFER_HOST',
        payload: { toNickname: 'Player1' }
      });

      // Wait for transfer response
      const transferResponse = await hostClient.waitForMessage('room:transferHost:response');
      expect(transferResponse.payload.success).toBe(true);

      // Both clients should receive host changed notification
      const hostNotification = await hostClient.waitForMessage('room:hostChanged');
      const playerNotification = await playerClient.waitForMessage('room:hostChanged');

      expect(hostNotification.payload.newHostNickname).toBe('Player1');
      expect(hostNotification.payload.oldHostNickname).toBe('OriginalHost');
      expect(playerNotification.payload.newHostNickname).toBe('Player1');
    });

    it('should automatically reassign host when host disconnects', async () => {
      // Host disconnects
      hostClient.disconnect();

      // Player should receive host changed notification
      const hostChangeNotification = await playerClient.waitForMessage('room:hostChanged');
      expect(hostChangeNotification.payload.newHostNickname).toBe('Player1');
      expect(hostChangeNotification.payload.reason).toBe('host_disconnected');
    });

    it('should not allow non-host to transfer host', async () => {
      // Player tries to transfer host (should fail)
      playerClient.send({
        type: 'ROOM_TRANSFER_HOST',
        payload: { toNickname: 'OriginalHost' }
      });

      const transferResponse = await playerClient.waitForMessage('room:transferHost:response');
      expect(transferResponse.payload.success).toBe(false);
      expect(transferResponse.payload.error).toContain('Only the host can transfer');
    });
  });

  describe('Room Synchronization', () => {
    let roomId: string;

    beforeEach(async () => {
      // Create room with multiple players
      hostClient.send({
        type: 'ROOM_CREATE',
        payload: { nickname: 'SyncHost' }
      });
      
      const createResponse = await hostClient.waitForMessage('room:created');
      roomId = createResponse.payload.room.id;

      playerClient.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'SyncPlayer' }
      });
      
      await playerClient.waitForMessage('room:joined');
      await hostClient.waitForMessage('room:playerJoined');
    });

    it('should sync room state for existing players', async () => {
      // Player requests room sync
      playerClient.send({
        type: 'ROOM_SYNC',
        payload: {}
      });

      // Should receive current room state
      const stateResponse = await playerClient.waitForMessage('room:state');
      expect(stateResponse.payload.room).toBeDefined();
      expect(stateResponse.payload.room.id).toBe(roomId);
      expect(stateResponse.payload.room.players).toHaveLength(2);
      expect(stateResponse.payload.currentPlayer).toBeDefined();
      expect(stateResponse.payload.currentPlayer.nickname).toBe('SyncPlayer');

      const syncResponse = await playerClient.waitForMessage('room:sync:response');
      expect(syncResponse.payload.success).toBe(true);
    });

    it('should fail sync for players not in any room', async () => {
      // Spectator (not in room) requests sync
      spectatorClient.send({
        type: 'ROOM_SYNC',
        payload: {}
      });

      const syncResponse = await spectatorClient.waitForMessage('room:sync:response');
      expect(syncResponse.payload.success).toBe(false);
      expect(syncResponse.payload.error).toContain('not in a room');
    });
  });

  describe('Room Cleanup', () => {
    it('should clean up room when all players leave', async () => {
      // Create room
      hostClient.send({
        type: 'ROOM_CREATE',
        payload: { nickname: 'TempHost' }
      });
      
      const createResponse = await hostClient.waitForMessage('room:created');
      const roomId = createResponse.payload.room.id;

      // Add a player
      playerClient.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'TempPlayer' }
      });
      
      await playerClient.waitForMessage('room:joined');

      // Both players disconnect
      hostClient.disconnect();
      playerClient.disconnect();

      // Try to join the room with a new client - should fail
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for cleanup

      const newClient = new WebSocketTestClient();
      await newClient.connect();
      
      newClient.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'NewPlayer' }
      });

      const errorResponse = await newClient.waitForMessage('room:joinError');
      expect(errorResponse.payload.error).toBe('Room not found');
      
      newClient.disconnect();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple simultaneous joins', async () => {
      // Create room
      hostClient.send({
        type: 'ROOM_CREATE',
        payload: { nickname: 'ConcurrentHost' }
      });
      
      const createResponse = await hostClient.waitForMessage('room:created');
      const roomId = createResponse.payload.room.id;

      // Multiple clients try to join simultaneously
      const clients = [];
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        const client = new WebSocketTestClient();
        await client.connect();
        clients.push(client);
        
        client.send({
          type: 'JOIN_ROOM',
          payload: { roomId, nickname: `Player${i}` }
        });
        
        promises.push(client.waitForMessage('room:joined'));
      }

      // All should succeed
      const responses = await Promise.all(promises);
      responses.forEach((response, index) => {
        expect(response.payload.player.nickname).toBe(`Player${index}`);
        expect(response.payload.room.players.length).toBeGreaterThan(1);
      });

      // Cleanup
      clients.forEach(client => client.disconnect());
    });
  });
});