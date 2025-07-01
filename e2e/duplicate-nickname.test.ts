import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { WebSocketTestClient, startServer, stopServer, waitForServer } from './setup';

describe('Duplicate Nickname Handling E2E Tests', () => {
  let hostClient: WebSocketTestClient;
  let player1Client: WebSocketTestClient;
  let player2Client: WebSocketTestClient;
  let roomId: string;

  beforeAll(async () => {
    console.log('Starting server for Duplicate Nickname E2E tests...');
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
    player1Client = new WebSocketTestClient();
    player2Client = new WebSocketTestClient();
    
    await hostClient.connect();
    
    // Create a room with some players
    hostClient.send({
      type: 'ROOM_CREATE',
      payload: { nickname: 'Host' }
    });
    
    const createResponse = await hostClient.waitForMessage('room:created');
    roomId = createResponse.payload.room.id;
    
    // Add first player
    await player1Client.connect();
    player1Client.send({
      type: 'JOIN_ROOM',
      payload: { roomId, nickname: 'Player1' }
    });
    
    await player1Client.waitForMessage('room:joined');
    
    // Clear messages
    hostClient.clearMessages();
    player1Client.clearMessages();
  });

  afterEach(() => {
    hostClient.disconnect();
    player1Client.disconnect();
    player2Client.disconnect();
  });

  describe('Basic Duplicate Detection', () => {
    it('should reject duplicate nickname and provide suggestions', async () => {
      await player2Client.connect();
      
      // Try to join with the same nickname as Player1
      player2Client.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'Player1' }
      });

      const errorResponse = await player2Client.waitForMessage('room:joinError');
      expect(errorResponse.payload.error).toBe('Nickname already taken');
      expect(errorResponse.payload.suggestions).toBeDefined();
      expect(errorResponse.payload.suggestions.length).toBeGreaterThan(0);
      
      // Should contain numbered suggestions
      const suggestions = errorResponse.payload.suggestions;
      expect(suggestions.some(s => s === 'Player12' || s === 'Player1_' || s.startsWith('Player1'))).toBe(true);
    });

    it('should reject duplicate nickname case-insensitive', async () => {
      await player2Client.connect();
      
      // Try to join with different case
      player2Client.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'player1' }
      });

      const errorResponse = await player2Client.waitForMessage('room:joinError');
      expect(errorResponse.payload.error).toBe('Nickname already taken');
    });

    it('should reject duplicate host nickname', async () => {
      await player2Client.connect();
      
      // Try to join with the same nickname as host
      player2Client.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'Host' }
      });

      const errorResponse = await player2Client.waitForMessage('room:joinError');
      expect(errorResponse.payload.error).toBe('Nickname already taken');
      expect(errorResponse.payload.suggestions).toBeDefined();
      expect(errorResponse.payload.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Nickname Suggestions', () => {
    it('should generate numbered suggestions', async () => {
      await player2Client.connect();
      
      player2Client.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'Player1' }
      });

      const errorResponse = await player2Client.waitForMessage('room:joinError');
      const suggestions = errorResponse.payload.suggestions;
      
      // Should include Player12, Player13, etc.
      expect(suggestions.some(s => /^Player1\d+$/.test(s))).toBe(true);
    });

    it('should generate underscore suggestions', async () => {
      await player2Client.connect();
      
      player2Client.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'Host' }
      });

      const errorResponse = await player2Client.waitForMessage('room:joinError');
      const suggestions = errorResponse.payload.suggestions;
      
      // Should include Host_, Host_1, etc.
      expect(suggestions.some(s => s === 'Host_' || s.startsWith('Host_'))).toBe(true);
    });

    it('should generate prefix suggestions', async () => {
      // First add a player with the nickname 'Test'
      await player2Client.connect();
      player2Client.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'Test' }
      });
      await player2Client.waitForMessage('room:joined');
      
      // Now try to join with same nickname to trigger conflict
      const player3Client = new WebSocketTestClient();
      await player3Client.connect();
      
      player3Client.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'Test' }
      });

      const errorResponse = await player3Client.waitForMessage('room:joinError');
      const suggestions = errorResponse.payload.suggestions;
      
      // Should include New_Test, Player_Test, etc.
      expect(suggestions.some(s => s.startsWith('New_') || s.startsWith('Player_') || s.startsWith('User_'))).toBe(true);
      
      player3Client.disconnect();
    });

    it('should avoid suggesting already taken names', async () => {
      // Add players with Test and Test2 nicknames
      await player2Client.connect();
      player2Client.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'Test' }
      });
      await player2Client.waitForMessage('room:joined');
      
      const tempClient = new WebSocketTestClient();
      await tempClient.connect();
      tempClient.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'Test2' }
      });
      await tempClient.waitForMessage('room:joined');
      
      // Now try to join with conflicting name 'Test'
      const player3Client = new WebSocketTestClient();
      await player3Client.connect();
      
      player3Client.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'Test' }
      });

      const errorResponse = await player3Client.waitForMessage('room:joinError');
      const suggestions = errorResponse.payload.suggestions;
      
      // Should not suggest Test2 since it's already taken
      expect(suggestions.includes('Test2')).toBe(false);
      
      tempClient.disconnect();
      player3Client.disconnect();
    });

    it('should limit suggestions to maximum of 3', async () => {
      await player2Client.connect();
      
      player2Client.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'Player1' }
      });

      const errorResponse = await player2Client.waitForMessage('room:joinError');
      const suggestions = errorResponse.payload.suggestions;
      
      expect(suggestions.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Successful Join with Suggested Nickname', () => {
    it('should allow joining with suggested nickname', async () => {
      await player2Client.connect();
      
      // First, get the suggestions
      player2Client.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'Player1' }
      });

      const errorResponse = await player2Client.waitForMessage('room:joinError');
      const suggestions = errorResponse.payload.suggestions;
      expect(suggestions.length).toBeGreaterThan(0);
      
      // Now join with the first suggestion
      const suggestedNickname = suggestions[0];
      player2Client.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: suggestedNickname }
      });

      const joinResponse = await player2Client.waitForMessage('room:joined');
      expect(joinResponse.payload.player.nickname).toBe(suggestedNickname);
      expect(joinResponse.payload.room.players).toHaveLength(3); // Host + Player1 + new player
    });

    it('should handle multiple rounds of suggestions', async () => {
      // Fill up some suggestions first
      const tempClients = [];
      
      for (let i = 2; i <= 4; i++) {
        const tempClient = new WebSocketTestClient();
        await tempClient.connect();
        tempClients.push(tempClient);
        
        tempClient.send({
          type: 'JOIN_ROOM',
          payload: { roomId, nickname: `Player1${i}` }
        });
        
        await tempClient.waitForMessage('room:joined');
      }
      
      // Now try to join with Player1 - should get different suggestions
      await player2Client.connect();
      
      player2Client.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'Player1' }
      });

      const errorResponse = await player2Client.waitForMessage('room:joinError');
      const suggestions = errorResponse.payload.suggestions;
      
      // Should not suggest Player12, Player13, Player14 since they're taken
      expect(suggestions.includes('Player12')).toBe(false);
      expect(suggestions.includes('Player13')).toBe(false);
      expect(suggestions.includes('Player14')).toBe(false);
      
      // But should have other suggestions
      expect(suggestions.length).toBeGreaterThan(0);
      
      // Cleanup
      tempClients.forEach(client => client.disconnect());
    });
  });

  describe('Special Characters and Edge Cases', () => {
    it('should handle nicknames with special characters', async () => {
      // Add player with special characters
      await player2Client.connect();
      player2Client.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'User@123' }
      });
      await player2Client.waitForMessage('room:joined');
      
      // Try to join with same special character nickname
      const player3Client = new WebSocketTestClient();
      await player3Client.connect();
      
      player3Client.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'User@123' }
      });

      const errorResponse = await player3Client.waitForMessage('room:joinError');
      expect(errorResponse.payload.error).toBe('Nickname already taken');
      expect(errorResponse.payload.suggestions.length).toBeGreaterThan(0);
      
      player3Client.disconnect();
    });

    it('should handle very short nicknames', async () => {
      // First add a player with short nickname
      await player2Client.connect();
      player2Client.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'A' }
      });
      await player2Client.waitForMessage('room:joined');
      
      // Now try to join with same short nickname
      const player3Client = new WebSocketTestClient();
      await player3Client.connect();
      
      player3Client.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'A' }
      });

      const errorResponse = await player3Client.waitForMessage('room:joinError');
      const suggestions = errorResponse.payload.suggestions;
      
      // Should generate suggestions for single character
      expect(suggestions.some(s => s.startsWith('A'))).toBe(true);
      
      player3Client.disconnect();
    });

    it('should handle whitespace in nickname conflicts', async () => {
      // Add player with spaces
      await player2Client.connect();
      player2Client.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'User Name' }
      });
      await player2Client.waitForMessage('room:joined');
      
      // Try to join with same nickname (should be trimmed and detected as duplicate)
      const player3Client = new WebSocketTestClient();
      await player3Client.connect();
      
      player3Client.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: '  User Name  ' }
      });

      const errorResponse = await player3Client.waitForMessage('room:joinError');
      expect(errorResponse.payload.error).toBe('Nickname already taken');
      
      player3Client.disconnect();
    });
  });

  describe('Spectator Nickname Suggestions', () => {
    it('should maintain spectator status in suggestions', async () => {
      await player2Client.connect();
      
      // Try to join as spectator with conflicting name
      player2Client.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'Spectator' }
      });
      
      // Since we already have Player1, let's conflict with Host instead
      player2Client.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'Observer' }
      });

      // First should join as spectator (Observer is auto-detected)
      const joinResponse = await player2Client.waitForMessage('room:joined');
      expect(joinResponse.payload.player.isSpectator).toBe(true);
      
      // Now try with conflicting Observer
      const player3Client = new WebSocketTestClient();
      await player3Client.connect();
      
      player3Client.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'Observer' }
      });

      const errorResponse = await player3Client.waitForMessage('room:joinError');
      expect(errorResponse.payload.error).toBe('Nickname already taken');
      const suggestions = errorResponse.payload.suggestions;
      
      // Suggestions should include Observer variations
      expect(suggestions.some(s => s.startsWith('Observer'))).toBe(true);
      
      player3Client.disconnect();
    });
  });
});