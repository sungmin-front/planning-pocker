import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { WebSocketTestClient, startServer, stopServer, waitForServer } from './setup';

describe('Planning Poker Complete Workflow E2E Test', () => {
  let hostClient: WebSocketTestClient;
  let playerClient1: WebSocketTestClient;
  let playerClient2: WebSocketTestClient;
  let roomId: string;

  beforeAll(async () => {
    console.log('Starting server for Planning Poker E2E tests...');
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

  describe('Complete Planning Poker Session', () => {
    it('should complete a full planning poker session workflow', async () => {
      // Step 1: Host creates room
      console.log('Step 1: Creating room...');
      hostClient.send({
        type: 'ROOM_CREATE',
        payload: { nickname: 'ScrumMaster' }
      });

      const createResponse = await hostClient.waitForMessage('room:created');
      roomId = createResponse.payload.room.id;
      
      expect(createResponse.payload.room.name).toBe("ScrumMaster's Room");
      expect(createResponse.payload.room.players).toHaveLength(1);
      expect(createResponse.payload.room.players[0].isHost).toBe(true);

      // Step 2: Players join the room
      console.log('Step 2: Players joining room...');
      
      // Player 1 joins
      playerClient1.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'Developer1' }
      });
      
      const player1JoinResponse = await playerClient1.waitForMessage('room:joined');
      expect(player1JoinResponse.payload.room.players).toHaveLength(2);
      
      // Host should be notified
      await hostClient.waitForMessage('room:playerJoined');

      // Player 2 joins
      playerClient2.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'Developer2' }
      });
      
      const player2JoinResponse = await playerClient2.waitForMessage('room:joined');
      expect(player2JoinResponse.payload.room.players).toHaveLength(3);
      
      // All players should be notified
      await hostClient.waitForMessage('room:playerJoined');
      await playerClient1.waitForMessage('room:playerJoined');

      // Step 3: Host adds a story to vote on
      console.log('Step 3: Adding story for voting...');
      hostClient.send({
        type: 'STORY_ADD',
        payload: {
          title: 'User Login Feature',
          description: 'Implement user authentication with email/password',
          jiraKey: 'PROJ-123',
          priority: 'High'
        }
      });

      // All players should receive the new story
      const hostStoryResponse = await hostClient.waitForMessage('story:added');
      const player1StoryResponse = await playerClient1.waitForMessage('story:added');
      const player2StoryResponse = await playerClient2.waitForMessage('story:added');

      expect(hostStoryResponse.payload.story.title).toBe('User Login Feature');
      expect(player1StoryResponse.payload.story.title).toBe('User Login Feature');
      expect(player2StoryResponse.payload.story.title).toBe('User Login Feature');

      // Step 4: Host starts voting session
      console.log('Step 4: Starting voting session...');
      const storyId = hostStoryResponse.payload.story.id;
      
      hostClient.send({
        type: 'VOTING_START',
        payload: { storyId }
      });

      // All players should receive voting started notification
      const hostVotingResponse = await hostClient.waitForMessage('voting:started');
      const player1VotingResponse = await playerClient1.waitForMessage('voting:started');
      const player2VotingResponse = await playerClient2.waitForMessage('voting:started');

      expect(hostVotingResponse.payload.storyId).toBe(storyId);
      expect(player1VotingResponse.payload.storyId).toBe(storyId);
      expect(player2VotingResponse.payload.storyId).toBe(storyId);

      // Step 5: Players cast their votes
      console.log('Step 5: Players casting votes...');
      
      // Host votes
      hostClient.send({
        type: 'VOTE_CAST',
        payload: { storyId, points: 5 }
      });

      // Player 1 votes
      playerClient1.send({
        type: 'VOTE_CAST',
        payload: { storyId, points: 8 }
      });

      // Player 2 votes
      playerClient2.send({
        type: 'VOTE_CAST',
        payload: { storyId, points: 5 }
      });

      // Wait for vote confirmations
      await hostClient.waitForMessage('vote:cast');
      await playerClient1.waitForMessage('vote:cast');
      await playerClient2.waitForMessage('vote:cast');

      // Step 6: Host reveals votes
      console.log('Step 6: Revealing votes...');
      hostClient.send({
        type: 'VOTING_REVEAL',
        payload: { storyId }
      });

      // All players should see the voting results
      const hostRevealResponse = await hostClient.waitForMessage('voting:revealed');
      const player1RevealResponse = await playerClient1.waitForMessage('voting:revealed');
      const player2RevealResponse = await playerClient2.waitForMessage('voting:revealed');

      // Verify voting results
      expect(hostRevealResponse.payload.results).toBeDefined();
      expect(hostRevealResponse.payload.results.votes).toHaveLength(3);
      
      const votes = hostRevealResponse.payload.results.votes;
      const hostVote = votes.find(v => v.nickname === 'ScrumMaster');
      const player1Vote = votes.find(v => v.nickname === 'Developer1');
      const player2Vote = votes.find(v => v.nickname === 'Developer2');

      expect(hostVote.points).toBe(5);
      expect(player1Vote.points).toBe(8);
      expect(player2Vote.points).toBe(5);

      // Step 7: Host finalizes story points
      console.log('Step 7: Finalizing story points...');
      const agreedPoints = 5; // Majority voted for 5
      
      hostClient.send({
        type: 'STORY_FINALIZE',
        payload: { storyId, finalPoints: agreedPoints }
      });

      // All players should receive finalization notification
      const hostFinalizeResponse = await hostClient.waitForMessage('story:finalized');
      const player1FinalizeResponse = await playerClient1.waitForMessage('story:finalized');
      const player2FinalizeResponse = await playerClient2.waitForMessage('story:finalized');

      expect(hostFinalizeResponse.payload.story.finalPoints).toBe(agreedPoints);
      expect(player1FinalizeResponse.payload.story.finalPoints).toBe(agreedPoints);
      expect(player2FinalizeResponse.payload.story.finalPoints).toBe(agreedPoints);

      // Step 8: Verify room state after voting
      console.log('Step 8: Verifying final room state...');
      playerClient1.send({
        type: 'ROOM_SYNC',
        payload: {}
      });

      const finalStateResponse = await playerClient1.waitForMessage('room:state');
      expect(finalStateResponse.payload.room.stories).toHaveLength(1);
      expect(finalStateResponse.payload.room.stories[0].finalPoints).toBe(agreedPoints);
      expect(finalStateResponse.payload.room.players).toHaveLength(3);

      console.log('✅ Complete Planning Poker workflow test passed!');
    }, 30000);

    it('should handle voting consensus scenarios', async () => {
      // Create room and add players
      hostClient.send({
        type: 'ROOM_CREATE',
        payload: { nickname: 'ProductOwner' }
      });

      const createResponse = await hostClient.waitForMessage('room:created');
      roomId = createResponse.payload.room.id;

      // Add players
      playerClient1.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'Senior Dev' }
      });
      await playerClient1.waitForMessage('room:joined');

      playerClient2.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'Junior Dev' }
      });
      await playerClient2.waitForMessage('room:joined');

      // Add story
      hostClient.send({
        type: 'STORY_ADD',
        payload: {
          title: 'Database Migration',
          description: 'Migrate legacy database to new schema',
          jiraKey: 'PROJ-456',
          priority: 'Critical'
        }
      });

      const storyResponse = await hostClient.waitForMessage('story:added');
      const storyId = storyResponse.payload.story.id;

      // Test scenario: All players vote the same (perfect consensus)
      hostClient.send({
        type: 'VOTING_START',
        payload: { storyId }
      });

      await hostClient.waitForMessage('voting:started');
      await playerClient1.waitForMessage('voting:started');
      await playerClient2.waitForMessage('voting:started');

      // Everyone votes 13 (unanimous)
      hostClient.send({
        type: 'VOTE_CAST',
        payload: { storyId, points: 13 }
      });

      playerClient1.send({
        type: 'VOTE_CAST',
        payload: { storyId, points: 13 }
      });

      playerClient2.send({
        type: 'VOTE_CAST',
        payload: { storyId, points: 13 }
      });

      // Reveal votes
      hostClient.send({
        type: 'VOTING_REVEAL',
        payload: { storyId }
      });

      const revealResponse = await hostClient.waitForMessage('voting:revealed');
      
      // Verify unanimous consensus
      const votes = revealResponse.payload.results.votes;
      expect(votes.every(vote => vote.points === 13)).toBe(true);
      expect(revealResponse.payload.results.consensus).toBe(true);

      // Finalize with consensus value
      hostClient.send({
        type: 'STORY_FINALIZE',
        payload: { storyId, finalPoints: 13 }
      });

      const finalizeResponse = await hostClient.waitForMessage('story:finalized');
      expect(finalizeResponse.payload.story.finalPoints).toBe(13);
    }, 20000);

    it('should handle re-voting when no consensus is reached', async () => {
      // Create room with players
      hostClient.send({
        type: 'ROOM_CREATE',
        payload: { nickname: 'TechLead' }
      });

      const createResponse = await hostClient.waitForMessage('room:created');
      roomId = createResponse.payload.room.id;

      playerClient1.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'Backend Dev' }
      });
      await playerClient1.waitForMessage('room:joined');

      playerClient2.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'Frontend Dev' }
      });
      await playerClient2.waitForMessage('room:joined');

      // Add complex story
      hostClient.send({
        type: 'STORY_ADD',
        payload: {
          title: 'Microservices Refactor',
          description: 'Break monolith into microservices architecture',
          jiraKey: 'PROJ-789',
          priority: 'Medium'
        }
      });

      const storyResponse = await hostClient.waitForMessage('story:added');
      const storyId = storyResponse.payload.story.id;

      // First voting round - wide disagreement
      hostClient.send({
        type: 'VOTING_START',
        payload: { storyId }
      });

      await Promise.all([
        hostClient.waitForMessage('voting:started'),
        playerClient1.waitForMessage('voting:started'),
        playerClient2.waitForMessage('voting:started')
      ]);

      // Wide spread in votes
      hostClient.send({
        type: 'VOTE_CAST',
        payload: { storyId, points: 21 }
      });

      playerClient1.send({
        type: 'VOTE_CAST',
        payload: { storyId, points: 3 }
      });

      playerClient2.send({
        type: 'VOTE_CAST',
        payload: { storyId, points: 13 }
      });

      // Reveal first round
      hostClient.send({
        type: 'VOTING_REVEAL',
        payload: { storyId }
      });

      const firstRevealResponse = await hostClient.waitForMessage('voting:revealed');
      expect(firstRevealResponse.payload.results.consensus).toBe(false);

      // Host initiates re-vote
      hostClient.send({
        type: 'VOTING_RESET',
        payload: { storyId }
      });

      await Promise.all([
        hostClient.waitForMessage('voting:reset'),
        playerClient1.waitForMessage('voting:reset'),
        playerClient2.waitForMessage('voting:reset')
      ]);

      // Second voting round - better consensus
      hostClient.send({
        type: 'VOTING_START',
        payload: { storyId }
      });

      await Promise.all([
        hostClient.waitForMessage('voting:started'),
        playerClient1.waitForMessage('voting:started'),
        playerClient2.waitForMessage('voting:started')
      ]);

      // More aligned votes after discussion
      hostClient.send({
        type: 'VOTE_CAST',
        payload: { storyId, points: 8 }
      });

      playerClient1.send({
        type: 'VOTE_CAST',
        payload: { storyId, points: 8 }
      });

      playerClient2.send({
        type: 'VOTE_CAST',
        payload: { storyId, points: 13 }
      });

      // Reveal second round
      hostClient.send({
        type: 'VOTING_REVEAL',
        payload: { storyId }
      });

      const secondRevealResponse = await hostClient.waitForMessage('voting:revealed');
      
      // Better consensus (2 out of 3 agree)
      const secondVotes = secondRevealResponse.payload.results.votes;
      const eightPointVotes = secondVotes.filter(vote => vote.points === 8);
      expect(eightPointVotes).toHaveLength(2);

      // Finalize with majority value
      hostClient.send({
        type: 'STORY_FINALIZE',
        payload: { storyId, finalPoints: 8 }
      });

      const finalizeResponse = await hostClient.waitForMessage('story:finalized');
      expect(finalizeResponse.payload.story.finalPoints).toBe(8);
    }, 25000);
  });

  describe('Host Management During Session', () => {
    it('should handle host transfer during active voting', async () => {
      // Setup room with active voting
      hostClient.send({
        type: 'ROOM_CREATE',
        payload: { nickname: 'OriginalHost' }
      });

      const createResponse = await hostClient.waitForMessage('room:created');
      roomId = createResponse.payload.room.id;

      playerClient1.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'NewHost' }
      });
      await playerClient1.waitForMessage('room:joined');

      // Add story and start voting
      hostClient.send({
        type: 'STORY_ADD',
        payload: {
          title: 'Critical Bug Fix',
          description: 'Fix production issue affecting customers',
          priority: 'Critical'
        }
      });

      const storyResponse = await hostClient.waitForMessage('story:added');
      const storyId = storyResponse.payload.story.id;

      hostClient.send({
        type: 'VOTING_START',
        payload: { storyId }
      });

      await Promise.all([
        hostClient.waitForMessage('voting:started'),
        playerClient1.waitForMessage('voting:started')
      ]);

      // Transfer host during voting
      hostClient.send({
        type: 'ROOM_TRANSFER_HOST',
        payload: { toNickname: 'NewHost' }
      });

      const transferResponse = await hostClient.waitForMessage('room:transferHost:response');
      expect(transferResponse.payload.success).toBe(true);

      // Both should receive host change notification
      await Promise.all([
        hostClient.waitForMessage('room:hostChanged'),
        playerClient1.waitForMessage('room:hostChanged')
      ]);

      // New host should be able to manage voting
      playerClient1.send({
        type: 'VOTING_REVEAL',
        payload: { storyId }
      });

      // Should work (new host can reveal votes)
      const revealResponse = await playerClient1.waitForMessage('voting:revealed');
      expect(revealResponse).toBeDefined();
    }, 15000);
  });

  describe('Error Handling', () => {
    it('should handle disconnections gracefully', async () => {
      // Create room with players
      hostClient.send({
        type: 'ROOM_CREATE',
        payload: { nickname: 'DisconnectHost' }
      });

      const createResponse = await hostClient.waitForMessage('room:created');
      roomId = createResponse.payload.room.id;

      playerClient1.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'StablePlayer' }
      });
      await playerClient1.waitForMessage('room:joined');

      playerClient2.send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname: 'DisconnectPlayer' }
      });
      await playerClient2.waitForMessage('room:joined');

      // Player 2 disconnects suddenly
      playerClient2.disconnect();

      // Remaining players should be notified
      const disconnectNotification = await playerClient1.waitForMessage('room:playerLeft');
      expect(disconnectNotification.payload.nickname).toBe('DisconnectPlayer');

      // Room should continue to function
      playerClient1.send({
        type: 'ROOM_SYNC',
        payload: {}
      });

      const stateResponse = await playerClient1.waitForMessage('room:state');
      expect(stateResponse.payload.room.players).toHaveLength(2); // Host + remaining player
    }, 10000);
  });
});