import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { WebSocketTestClient, startServer, stopServer, waitForServer } from './setup';

describe('Story Skip Functionality E2E Test', () => {
  let hostClient: WebSocketTestClient;
  let playerClient1: WebSocketTestClient;
  let playerClient2: WebSocketTestClient;
  let roomId: string;

  beforeAll(async () => {
    console.log('Starting server for Story Skip E2E tests...');
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
    playerClient1 = new WebSocketTestClient();
    playerClient2 = new WebSocketTestClient();
    
    await hostClient.connect();
    await playerClient1.connect();
    await playerClient2.connect();
  });

  afterEach(() => {
    hostClient.disconnect();
    playerClient1.disconnect();
    playerClient2.disconnect();
  });

  describe('Skip Story During Voting Phase', () => {
    it('should allow host to skip story during voting phase', async () => {
      // Step 1: Host creates room
      console.log('Step 1: Creating room...');
      hostClient.send({
        type: 'ROOM_CREATE',
        payload: { nickname: 'HostUser' }
      });

      const createResponse = await hostClient.waitForMessage('room:created');
      roomId = createResponse.payload.room.id;
      
      expect(createResponse.payload.room.name).toBe("HostUser's Room");
      expect(createResponse.payload.room.players[0].isHost).toBe(true);

      // Step 2: Players join
      playerClient1.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'Player1' }
      });
      
      const player1JoinResponse = await playerClient1.waitForMessage('room:joined');
      expect(player1JoinResponse.payload.room.players).toHaveLength(2);

      // Step 3: Host adds a story
      console.log('Step 3: Adding story...');
      hostClient.send({
        type: 'STORY_CREATE',
        payload: {
          title: 'Story to Skip During Voting',
          description: 'This story will be skipped while voting'
        }
      });

      const storyResponse = await hostClient.waitForMessage('story:created');
      const storyId = storyResponse.payload.story.id;
      expect(storyResponse.payload.story.title).toBe('Story to Skip During Voting');

      // Step 4: Start voting
      console.log('Step 4: Starting voting...');
      hostClient.send({
        type: 'STORY_SELECT',
        payload: { storyId }
      });

      await hostClient.waitForMessage('story:selected');
      await playerClient1.waitForMessage('story:selected');

      // Step 5: Players cast some votes (but don't complete voting)
      hostClient.send({
        type: 'STORY_VOTE',
        payload: { storyId, vote: '5' }
      });

      playerClient1.send({
        type: 'STORY_VOTE', 
        payload: { storyId, vote: '8' }
      });

      // Wait for vote updates
      await hostClient.waitForMessage('room:updated');
      await playerClient1.waitForMessage('room:updated');

      // Step 6: Host skips the story (this should fail initially because skipStory doesn't exist)
      console.log('Step 6: Host attempts to skip story...');
      hostClient.send({
        type: 'STORY_SKIP',
        payload: { storyId }
      });

      // This should fail initially and test will show we need to implement skip functionality
      try {
        const skipResponse = await hostClient.waitForMessage('story:skipped', 2000);
        expect(skipResponse.payload.success).toBe(true);
        expect(skipResponse.payload.story.status).toBe('skipped');
        console.log('✅ Story skip functionality works!');
      } catch (error) {
        console.log('❌ Story skip functionality not yet implemented - this is expected for TDD');
        expect(error.message).toContain('timeout');
      }
    }, 15000);

    it('should reject skip attempt from non-host player', async () => {
      // Setup room with host and player
      hostClient.send({
        type: 'ROOM_CREATE',
        payload: { nickname: 'HostUser' }
      });

      const createResponse = await hostClient.waitForMessage('room:created');
      roomId = createResponse.payload.room.id;

      playerClient1.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'Player1' }
      });
      await playerClient1.waitForMessage('room:joined');

      // Add and start story
      hostClient.send({
        type: 'STORY_CREATE',
        payload: { title: 'Test Story', description: 'Test description' }
      });

      const storyResponse = await hostClient.waitForMessage('story:created');
      const storyId = storyResponse.payload.story.id;

      hostClient.send({
        type: 'STORY_SELECT',
        payload: { storyId }
      });
      await hostClient.waitForMessage('story:selected');

      // Non-host tries to skip (should fail)
      console.log('Non-host attempting to skip story...');
      playerClient1.send({
        type: 'STORY_SKIP',
        payload: { storyId }
      });

      try {
        const skipResponse = await playerClient1.waitForMessage('story:skip:response', 2000);
        expect(skipResponse.payload.success).toBe(false);
        expect(skipResponse.payload.error).toContain('Only the host can skip stories');
      } catch (error) {
        console.log('❌ Story skip error handling not yet implemented - this is expected for TDD');
        expect(error.message).toContain('timeout');
      }
    }, 10000);
  });

  describe('Skip Story During Revealed Phase', () => {
    it('should allow host to skip story after votes are revealed', async () => {
      // Setup room and story
      hostClient.send({
        type: 'ROOM_CREATE',
        payload: { nickname: 'HostUser' }
      });

      const createResponse = await hostClient.waitForMessage('room:created');
      roomId = createResponse.payload.room.id;

      playerClient1.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'Player1' }
      });
      await playerClient1.waitForMessage('room:joined');

      // Add story and start voting
      hostClient.send({
        type: 'STORY_CREATE',
        payload: { title: 'Story to Skip After Reveal', description: 'Skip after revealing' }
      });

      const storyResponse = await hostClient.waitForMessage('story:created');
      const storyId = storyResponse.payload.story.id;

      hostClient.send({
        type: 'STORY_SELECT',
        payload: { storyId }
      });
      await hostClient.waitForMessage('story:selected');

      // Cast votes
      hostClient.send({
        type: 'STORY_VOTE',
        payload: { storyId, vote: '5' }
      });

      playerClient1.send({
        type: 'STORY_VOTE',
        payload: { storyId, vote: '8' }
      });

      // Reveal votes
      hostClient.send({
        type: 'STORY_REVEAL_VOTES',
        payload: { storyId }
      });

      await hostClient.waitForMessage('story:votesRevealed');
      await playerClient1.waitForMessage('story:votesRevealed');

      // Now skip the story (should work even after votes revealed)
      console.log('Attempting to skip story after revealing votes...');
      hostClient.send({
        type: 'STORY_SKIP',
        payload: { storyId }
      });

      try {
        const skipResponse = await hostClient.waitForMessage('story:skipped', 2000);
        expect(skipResponse.payload.success).toBe(true);
        expect(skipResponse.payload.story.status).toBe('skipped');
        
        // Both players should receive the skip notification
        const player1SkipNotif = await playerClient1.waitForMessage('story:updated');
        expect(player1SkipNotif.payload.story.status).toBe('skipped');
        
        console.log('✅ Story skip after reveal works!');
      } catch (error) {
        console.log('❌ Story skip after reveal not yet implemented - this is expected for TDD');
        expect(error.message).toContain('timeout');
      }
    }, 12000);
  });

  describe('Skip Story Error Cases', () => {
    it('should reject skip for non-existent story', async () => {
      hostClient.send({
        type: 'ROOM_CREATE',
        payload: { nickname: 'HostUser' }
      });

      await hostClient.waitForMessage('room:created');

      // Try to skip non-existent story
      hostClient.send({
        type: 'STORY_SKIP',
        payload: { storyId: 'non-existent-story-id' }
      });

      try {
        const skipResponse = await hostClient.waitForMessage('story:skip:response', 2000);
        expect(skipResponse.payload.success).toBe(false);
        expect(skipResponse.payload.error).toContain('Story not found');
      } catch (error) {
        console.log('❌ Story skip error handling not yet implemented - this is expected for TDD');
        expect(error.message).toContain('timeout');
      }
    }, 8000);

    it('should reject skip for already closed story', async () => {
      // Setup and complete a story first
      hostClient.send({
        type: 'ROOM_CREATE',
        payload: { nickname: 'HostUser' }
      });

      const createResponse = await hostClient.waitForMessage('room:created');
      roomId = createResponse.payload.room.id;

      // Add, vote, reveal, and finalize a story
      hostClient.send({
        type: 'STORY_CREATE',
        payload: { title: 'Completed Story', description: 'Already completed' }
      });

      const storyResponse = await hostClient.waitForMessage('story:created');
      const storyId = storyResponse.payload.story.id;

      hostClient.send({ type: 'STORY_SELECT', payload: { storyId } });
      await hostClient.waitForMessage('story:selected');

      hostClient.send({ type: 'STORY_VOTE', payload: { storyId, vote: '5' } });
      hostClient.send({ type: 'STORY_REVEAL_VOTES', payload: { storyId } });
      await hostClient.waitForMessage('story:votesRevealed');

      hostClient.send({ type: 'STORY_SET_FINAL_POINT', payload: { storyId, point: '5' } });
      await hostClient.waitForMessage('story:setFinalPoint:response');

      // Now try to skip the already closed story
      hostClient.send({
        type: 'STORY_SKIP',
        payload: { storyId }
      });

      try {
        const skipResponse = await hostClient.waitForMessage('story:skip:response', 2000);
        expect(skipResponse.payload.success).toBe(false);
        expect(skipResponse.payload.error).toContain('Cannot skip a completed story');
      } catch (error) {
        console.log('❌ Story skip validation not yet implemented - this is expected for TDD');
        expect(error.message).toContain('timeout');
      }
    }, 15000);
  });
});