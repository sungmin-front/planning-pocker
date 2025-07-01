import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { WebSocketTestClient, startServer, stopServer, waitForServer } from './setup';

describe('Room URL Access E2E Tests', () => {
  let hostClient: WebSocketTestClient;
  let joinerClient: WebSocketTestClient;
  let roomId: string;

  beforeAll(async () => {
    console.log('Starting server for Room URL Access E2E tests...');
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
    joinerClient = new WebSocketTestClient();
    
    await hostClient.connect();
    
    // Create a room first
    hostClient.send({
      type: 'ROOM_CREATE',
      payload: { nickname: 'HostUser' }
    });
    
    const createResponse = await hostClient.waitForMessage('room:created');
    roomId = createResponse.payload.room.id;
    
    // Clear messages after room creation
    hostClient.clearMessages();
  });

  afterEach(() => {
    hostClient.disconnect();
    joinerClient.disconnect();
  });

  describe('Room URL Direct Access', () => {
    it('should allow joining a room via URL with roomId parameter', async () => {
      await joinerClient.connect();
      
      // Simulate joining with room ID from URL parameter
      joinerClient.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'URLJoiner' }
      });

      const joinResponse = await joinerClient.waitForMessage('room:joined');
      expect(joinResponse.payload.room.id).toBe(roomId);
      expect(joinResponse.payload.player.nickname).toBe('URLJoiner');
      expect(joinResponse.payload.room.players).toHaveLength(2);

      // Host should receive player joined notification
      const hostNotification = await hostClient.waitForMessage('room:playerJoined');
      expect(hostNotification.payload.player.nickname).toBe('URLJoiner');
    });

    it('should handle invalid room ID in URL', async () => {
      await joinerClient.connect();
      
      const invalidRoomId = 'INVALID123';
      joinerClient.send({
        type: 'JOIN_ROOM',
        payload: { roomId: invalidRoomId, nickname: 'URLJoiner' }
      });

      const errorResponse = await joinerClient.waitForMessage('room:joinError');
      expect(errorResponse.payload.error).toBe('Room not found');
    });

    it('should handle duplicate nickname in room via URL', async () => {
      await joinerClient.connect();
      
      // Try to join with the same nickname as host
      joinerClient.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'HostUser' }
      });

      const errorResponse = await joinerClient.waitForMessage('room:joinError');
      expect(errorResponse.payload.error).toBe('Nickname already taken');
    });
  });

  describe('Room ID Format Validation', () => {
    it('should accept valid room ID formats', async () => {
      await joinerClient.connect();
      
      joinerClient.send({
        type: 'JOIN_ROOM',
        payload: { roomId: roomId.toUpperCase(), nickname: 'TestUser' }
      });

      const joinResponse = await joinerClient.waitForMessage('room:joined');
      expect(joinResponse.payload.room.id).toBe(roomId);
    });

    it('should handle case-insensitive room IDs', async () => {
      await joinerClient.connect();
      
      joinerClient.send({
        type: 'JOIN_ROOM',
        payload: { roomId: roomId.toLowerCase(), nickname: 'TestUser' }
      });

      const joinResponse = await joinerClient.waitForMessage('room:joined');
      expect(joinResponse.payload.room.id).toBe(roomId);
    });
  });

  describe('Nickname Validation', () => {
    it('should reject empty nickname', async () => {
      await joinerClient.connect();
      
      joinerClient.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: '' }
      });

      const errorResponse = await joinerClient.waitForMessage('room:joinError');
      expect(errorResponse.payload.error).toContain('Nickname');
    });

    it('should reject very long nicknames', async () => {
      await joinerClient.connect();
      
      const longNickname = 'A'.repeat(50); // Very long nickname
      joinerClient.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: longNickname }
      });

      // Should either be rejected or truncated
      try {
        const response = await joinerClient.waitForMessage('room:joinError', 2000);
        expect(response.payload.error).toBeDefined();
      } catch {
        // If no error, it should have joined with truncated nickname
        const joinResponse = await joinerClient.waitForMessage('room:joined');
        expect(joinResponse.payload.player.nickname.length).toBeLessThanOrEqual(30);
      }
    });

    it('should trim whitespace from nicknames', async () => {
      await joinerClient.connect();
      
      joinerClient.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: '  TestUser  ' }
      });

      const joinResponse = await joinerClient.waitForMessage('room:joined');
      expect(joinResponse.payload.player.nickname).toBe('TestUser');
    });
  });

  describe('Multiple Users Joining via URL', () => {
    it('should handle multiple simultaneous URL joins', async () => {
      const clients = [];
      const joinPromises = [];

      for (let i = 0; i < 5; i++) {
        const client = new WebSocketTestClient();
        clients.push(client);
        await client.connect();
        
        const nickname = `URLUser${i}`;
        client.send({
          type: 'JOIN_ROOM',
          payload: { roomId, nickname }
        });
        
        joinPromises.push(client.waitForMessage('room:joined'));
      }

      const results = await Promise.all(joinPromises);
      
      // All should have joined successfully
      results.forEach((result, index) => {
        expect(result.payload.room.id).toBe(roomId);
        expect(result.payload.player.nickname).toBe(`URLUser${index}`);
        expect(result.payload.room.players.length).toBeGreaterThan(1);
      });

      // Cleanup
      clients.forEach(client => client.disconnect());
    });
  });

  describe('Room State After URL Join', () => {
    it('should provide complete room state when joining via URL', async () => {
      // First create a story as host
      hostClient.send({
        type: 'STORY_CREATE',
        payload: { 
          title: 'Test Story',
          description: 'A story for URL join testing'
        }
      });
      
      await hostClient.waitForMessage('story:created');
      hostClient.clearMessages();

      // Now join via URL
      await joinerClient.connect();
      
      joinerClient.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'URLJoiner' }
      });

      const joinResponse = await joinerClient.waitForMessage('room:joined');
      
      // Should receive complete room state including existing stories
      expect(joinResponse.payload.room.stories).toHaveLength(1);
      expect(joinResponse.payload.room.stories[0].title).toBe('Test Story');
      expect(joinResponse.payload.room.players).toHaveLength(2);
      
      // Should know who is host
      const hostPlayer = joinResponse.payload.room.players.find(p => p.isHost);
      expect(hostPlayer).toBeDefined();
      expect(hostPlayer.nickname).toBe('HostUser');
    });

    it('should allow URL joiner to participate in voting', async () => {
      // Create story as host
      hostClient.send({
        type: 'STORY_CREATE',
        payload: { 
          title: 'Voting Story',
          description: 'Test voting with URL joiner'
        }
      });
      
      const storyResponse = await hostClient.waitForMessage('story:created');
      const storyId = storyResponse.payload.story.id;
      hostClient.clearMessages();

      // Join via URL
      await joinerClient.connect();
      
      joinerClient.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'VotingUser' }
      });

      await joinerClient.waitForMessage('room:joined');
      joinerClient.clearMessages();

      // Vote on the story
      joinerClient.send({
        type: 'VOTE',
        payload: { storyId, vote: '8' }
      });

      const voteResponse = await joinerClient.waitForMessage('vote:recorded');
      expect(voteResponse.payload.success).toBe(true);

      // Host should receive vote notification
      const hostVoteNotification = await hostClient.waitForMessage('player:voted');
      expect(hostVoteNotification.payload.storyId).toBe(storyId);
    });
  });

  describe('Auto-Spectator Detection', () => {
    it('should automatically make users with "spectator" nickname into spectators', async () => {
      await joinerClient.connect();
      
      joinerClient.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'Spectator' }
      });

      const joinResponse = await joinerClient.waitForMessage('room:joined');
      expect(joinResponse.payload.player.isSpectator).toBe(true);
      expect(joinResponse.payload.player.nickname).toBe('Spectator');
    });

    it('should allow spectators to join but not vote', async () => {
      // Create story first
      hostClient.send({
        type: 'STORY_CREATE',
        payload: { 
          title: 'Spectator Test Story',
          description: 'Testing spectator restrictions'
        }
      });
      
      const storyResponse = await hostClient.waitForMessage('story:created');
      const storyId = storyResponse.payload.story.id;
      hostClient.clearMessages();

      // Join as spectator
      await joinerClient.connect();
      
      joinerClient.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'Observer' }
      });

      await joinerClient.waitForMessage('room:joined');
      joinerClient.clearMessages();

      // Try to vote as spectator
      joinerClient.send({
        type: 'VOTE',
        payload: { storyId, vote: '5' }
      });

      const voteResponse = await joinerClient.waitForMessage('vote:recorded');
      expect(voteResponse.payload.success).toBe(false);
      expect(voteResponse.payload.error).toContain('Spectators cannot vote');
    });
  });
});