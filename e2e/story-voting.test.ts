import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { WebSocketTestClient, startServer, stopServer, waitForServer } from './setup';

describe('Story and Voting E2E Tests', () => {
  let hostClient: WebSocketTestClient;
  let player1Client: WebSocketTestClient;
  let player2Client: WebSocketTestClient;
  let roomId: string;

  beforeAll(async () => {
    console.log('Starting server for Story/Voting E2E tests...');
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
    await player1Client.connect();
    await player2Client.connect();

    // Create room and add players
    hostClient.send({
      type: 'ROOM_CREATE',
      payload: { nickname: 'VotingHost' }
    });
    
    const createResponse = await hostClient.waitForMessage('room:created');
    roomId = createResponse.payload.room.id;

    // Add players
    player1Client.send({
      type: 'JOIN_ROOM',
      payload: { roomId, nickname: 'Voter1' }
    });
    
    player2Client.send({
      type: 'JOIN_ROOM',
      payload: { roomId, nickname: 'Voter2' }
    });

    await player1Client.waitForMessage('room:joined');
    await player2Client.waitForMessage('room:joined');
    
    // Clear any join notifications
    hostClient.clearMessages();
    player1Client.clearMessages();
    player2Client.clearMessages();
  });

  afterEach(() => {
    hostClient.disconnect();
    player1Client.disconnect();
    player2Client.disconnect();
  });

  describe('Story Management', () => {
    it('should create a new story', async () => {
      hostClient.send({
        type: 'STORY_CREATE',
        payload: { 
          title: 'User Registration Feature',
          description: 'Allow users to register with email and password'
        }
      });

      const response = await hostClient.waitForMessage('story:created');
      expect(response).toBeDefined();
      expect(response.payload.story).toBeDefined();
      expect(response.payload.story.title).toBe('User Registration Feature');
      expect(response.payload.story.description).toBe('Allow users to register with email and password');
      expect(response.payload.story.status).toBe('voting');
      expect(response.payload.story.votes).toEqual({});

      // Other players should receive story created notification
      const player1Notification = await player1Client.waitForMessage('story:created');
      const player2Notification = await player2Client.waitForMessage('story:created');
      
      expect(player1Notification.payload.story.title).toBe('User Registration Feature');
      expect(player2Notification.payload.story.title).toBe('User Registration Feature');
    });

    it('should only allow host to create stories', async () => {
      player1Client.send({
        type: 'STORY_CREATE',
        payload: { 
          title: 'Unauthorized Story',
          description: 'This should fail'
        }
      });

      const response = await player1Client.waitForMessage('story:created');
      expect(response.payload.success).toBe(false);
      expect(response.payload.error).toContain('Only the host can create stories');
    });

    it('should create multiple stories and track them', async () => {
      const stories = [
        { title: 'Story 1', description: 'First story' },
        { title: 'Story 2', description: 'Second story' },
        { title: 'Story 3', description: 'Third story' }
      ];

      for (const story of stories) {
        hostClient.send({
          type: 'STORY_CREATE',
          payload: story
        });
        
        const response = await hostClient.waitForMessage('story:created');
        expect(response.payload.story.title).toBe(story.title);
      }

      // Sync room to get all stories
      hostClient.send({
        type: 'ROOM_SYNC',
        payload: {}
      });

      const syncResponse = await hostClient.waitForMessage('room:state');
      expect(syncResponse.payload.room.stories).toHaveLength(3);
    });
  });

  describe('Voting Process', () => {
    let storyId: string;

    beforeEach(async () => {
      // Create a story for voting
      hostClient.send({
        type: 'STORY_CREATE',
        payload: { 
          title: 'Voting Test Story',
          description: 'A story for testing voting'
        }
      });

      const response = await hostClient.waitForMessage('story:created');
      storyId = response.payload.story.id;
      
      // Clear messages
      hostClient.clearMessages();
      player1Client.clearMessages();
      player2Client.clearMessages();
    });

    it('should allow players to vote', async () => {
      // Player 1 votes
      player1Client.send({
        type: 'VOTE',
        payload: { storyId, vote: '5' }
      });

      const vote1Response = await player1Client.waitForMessage('vote:recorded');
      expect(vote1Response.payload.success).toBe(true);

      // Player 2 votes
      player2Client.send({
        type: 'VOTE',
        payload: { storyId, vote: '8' }
      });

      const vote2Response = await player2Client.waitForMessage('vote:recorded');
      expect(vote2Response.payload.success).toBe(true);

      // Host votes
      hostClient.send({
        type: 'VOTE',
        payload: { storyId, vote: '3' }
      });

      const hostVoteResponse = await hostClient.waitForMessage('vote:recorded');
      expect(hostVoteResponse.payload.success).toBe(true);

      // All clients should receive vote notifications
      // Note: The exact notification format depends on implementation
    });

    it('should allow players to change their votes', async () => {
      // Initial vote
      player1Client.send({
        type: 'VOTE',
        payload: { storyId, vote: '5' }
      });

      await player1Client.waitForMessage('vote:recorded');

      // Change vote
      player1Client.send({
        type: 'VOTE',
        payload: { storyId, vote: '8' }
      });

      const changeResponse = await player1Client.waitForMessage('vote:recorded');
      expect(changeResponse.payload.success).toBe(true);
    });

    it('should reveal votes when host requests', async () => {
      // All players vote
      const votes = [
        { client: player1Client, vote: '5' },
        { client: player2Client, vote: '8' },
        { client: hostClient, vote: '3' }
      ];

      for (const { client, vote } of votes) {
        client.send({
          type: 'VOTE',
          payload: { storyId, vote }
        });
        await client.waitForMessage('vote:recorded');
      }

      // Host reveals votes
      hostClient.send({
        type: 'REVEAL_VOTES',
        payload: { storyId }
      });

      const revealResponse = await hostClient.waitForMessage('votes:revealed');
      expect(revealResponse.payload.success).toBe(true);
      expect(revealResponse.payload.story.status).toBe('revealed');
      expect(Object.keys(revealResponse.payload.story.votes)).toHaveLength(3);

      // All players should receive the revealed votes
      const player1Reveal = await player1Client.waitForMessage('votes:revealed');
      const player2Reveal = await player2Client.waitForMessage('votes:revealed');

      expect(player1Reveal.payload.story.votes).toBeDefined();
      expect(player2Reveal.payload.story.votes).toBeDefined();
    });

    it('should only allow host to reveal votes', async () => {
      player1Client.send({
        type: 'REVEAL_VOTES',
        payload: { storyId }
      });

      const response = await player1Client.waitForMessage('votes:revealed');
      expect(response.payload.success).toBe(false);
      expect(response.payload.error).toContain('Only the host can reveal votes');
    });

    it('should restart voting when host requests', async () => {
      // Vote and reveal first
      player1Client.send({
        type: 'VOTE',
        payload: { storyId, vote: '5' }
      });
      await player1Client.waitForMessage('vote:recorded');

      hostClient.send({
        type: 'REVEAL_VOTES',
        payload: { storyId }
      });
      await hostClient.waitForMessage('votes:revealed');

      // Restart voting
      hostClient.send({
        type: 'RESET_VOTES',
        payload: { storyId }
      });

      const restartResponse = await hostClient.waitForMessage('votes:restarted');
      expect(restartResponse.payload.success).toBe(true);
      expect(restartResponse.payload.story.status).toBe('voting');
      expect(restartResponse.payload.story.votes).toEqual({});

      // All players should receive restart notification
      const player1Restart = await player1Client.waitForMessage('votes:restarted');
      const player2Restart = await player2Client.waitForMessage('votes:restarted');

      expect(player1Restart.payload.story.status).toBe('voting');
      expect(player2Restart.payload.story.status).toBe('voting');
    });
  });

  describe('Story Finalization', () => {
    let storyId: string;

    beforeEach(async () => {
      // Create story and complete voting process
      hostClient.send({
        type: 'STORY_CREATE',
        payload: { 
          title: 'Finalization Test Story',
          description: 'A story for testing finalization'
        }
      });

      const response = await hostClient.waitForMessage('story:created');
      storyId = response.payload.story.id;

      // Vote and reveal
      const votes = [
        { client: player1Client, vote: '5' },
        { client: player2Client, vote: '5' },
        { client: hostClient, vote: '5' }
      ];

      for (const { client, vote } of votes) {
        client.send({
          type: 'VOTE',
          payload: { storyId, vote }
        });
        await client.waitForMessage('vote:recorded');
      }

      hostClient.send({
        type: 'REVEAL_VOTES',
        payload: { storyId }
      });
      await hostClient.waitForMessage('votes:revealed');

      // Clear messages
      hostClient.clearMessages();
      player1Client.clearMessages();
      player2Client.clearMessages();
    });

    it('should allow host to set final points', async () => {
      hostClient.send({
        type: 'STORY_SET_FINAL_POINT',
        payload: { storyId, point: '5' }
      });

      const response = await hostClient.waitForMessage('story:setFinalPoint:response');
      expect(response.payload.success).toBe(true);

      // All players should receive story update
      const player1Update = await player1Client.waitForMessage('story:updated');
      const player2Update = await player2Client.waitForMessage('story:updated');

      expect(player1Update.payload.final_point).toBe('5');
      expect(player1Update.payload.status).toBe('closed');
      expect(player2Update.payload.final_point).toBe('5');
      expect(player2Update.payload.status).toBe('closed');
    });

    it('should only allow host to set final points', async () => {
      player1Client.send({
        type: 'STORY_SET_FINAL_POINT',
        payload: { storyId, point: '5' }
      });

      const response = await player1Client.waitForMessage('story:setFinalPoint:response');
      expect(response.payload.success).toBe(false);
      expect(response.payload.error).toContain('Only the host can set final points');
    });
  });

  describe('Voting Edge Cases', () => {
    let storyId: string;

    beforeEach(async () => {
      hostClient.send({
        type: 'STORY_CREATE',
        payload: { 
          title: 'Edge Case Story',
          description: 'Testing edge cases'
        }
      });

      const response = await hostClient.waitForMessage('story:created');
      storyId = response.payload.story.id;
      
      // Clear messages
      hostClient.clearMessages();
      player1Client.clearMessages();
      player2Client.clearMessages();
    });

    it('should handle invalid vote values', async () => {
      player1Client.send({
        type: 'VOTE',
        payload: { storyId, vote: 'invalid_value' }
      });

      const response = await player1Client.waitForMessage('vote:recorded');
      expect(response.payload.success).toBe(false);
      expect(response.payload.error).toContain('Invalid vote value');
    });

    it('should handle voting on non-existent story', async () => {
      player1Client.send({
        type: 'VOTE',
        payload: { storyId: 'non-existent', vote: '5' }
      });

      const response = await player1Client.waitForMessage('vote:recorded');
      expect(response.payload.success).toBe(false);
      expect(response.payload.error).toContain('Story not found');
    });

    it('should handle revealing votes with no votes cast', async () => {
      hostClient.send({
        type: 'REVEAL_VOTES',
        payload: { storyId }
      });

      const response = await hostClient.waitForMessage('votes:revealed');
      expect(response.payload.success).toBe(true);
      expect(response.payload.story.votes).toEqual({});
    });

    it('should handle concurrent voting', async () => {
      // Multiple players vote simultaneously
      const promises = [
        (async () => {
          player1Client.send({
            type: 'VOTE',
            payload: { storyId, vote: '3' }
          });
          return player1Client.waitForMessage('vote:recorded');
        })(),
        (async () => {
          player2Client.send({
            type: 'VOTE',
            payload: { storyId, vote: '5' }
          });
          return player2Client.waitForMessage('vote:recorded');
        })(),
        (async () => {
          hostClient.send({
            type: 'VOTE',
            payload: { storyId, vote: '8' }
          });
          return hostClient.waitForMessage('vote:recorded');
        })()
      ];

      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.payload.success).toBe(true);
      });

      // Verify all votes were recorded
      hostClient.send({
        type: 'REVEAL_VOTES',
        payload: { storyId }
      });

      const revealResponse = await hostClient.waitForMessage('votes:revealed');
      expect(Object.keys(revealResponse.payload.story.votes)).toHaveLength(3);
    });
  });

  describe('Spectator Behavior', () => {
    let spectatorClient: WebSocketTestClient;
    let storyId: string;

    beforeEach(async () => {
      spectatorClient = new WebSocketTestClient();
      await spectatorClient.connect();

      // Add spectator to room
      spectatorClient.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'Spectator' }
      });
      await spectatorClient.waitForMessage('room:joined');

      // Create a story
      hostClient.send({
        type: 'STORY_CREATE',
        payload: { 
          title: 'Spectator Test Story',
          description: 'Testing spectator permissions'
        }
      });

      const response = await hostClient.waitForMessage('story:created');
      storyId = response.payload.story.id;
      
      // Clear messages
      hostClient.clearMessages();
      player1Client.clearMessages();
      player2Client.clearMessages();
      spectatorClient.clearMessages();
    });

    afterEach(() => {
      spectatorClient.disconnect();
    });

    it('should allow spectators to observe but not vote', async () => {
      // Spectator tries to vote
      spectatorClient.send({
        type: 'VOTE',
        payload: { storyId, vote: '5' }
      });

      const response = await spectatorClient.waitForMessage('vote:recorded');
      expect(response.payload.success).toBe(false);
      expect(response.payload.error).toContain('Spectators cannot vote');
    });

    it('should allow spectators to see vote reveals', async () => {
      // Players vote
      player1Client.send({
        type: 'VOTE',
        payload: { storyId, vote: '5' }
      });
      await player1Client.waitForMessage('vote:recorded');

      // Host reveals
      hostClient.send({
        type: 'REVEAL_VOTES',
        payload: { storyId }
      });
      await hostClient.waitForMessage('votes:revealed');

      // Spectator should receive reveal notification
      const spectatorReveal = await spectatorClient.waitForMessage('votes:revealed');
      expect(spectatorReveal.payload.story.votes).toBeDefined();
    });
  });
});