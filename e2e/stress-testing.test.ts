import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { WebSocketTestClient, startServer, stopServer, waitForServer } from './setup';

describe('Stress Testing E2E', () => {
  beforeAll(async () => {
    console.log('Starting server for stress testing...');
    await startServer();
    await waitForServer();
    console.log('Server ready for stress testing');
  }, 60000);

  afterAll(() => {
    console.log('Stopping server...');
    stopServer();
  });

  describe('High Load Scenarios', () => {
    it('should handle many simultaneous connections', async () => {
      const clientCount = 50;
      const clients: WebSocketTestClient[] = [];
      
      try {
        // Create many clients
        console.log(`Creating ${clientCount} WebSocket connections...`);
        for (let i = 0; i < clientCount; i++) {
          const client = new WebSocketTestClient();
          await client.connect();
          clients.push(client);
        }

        // Verify all connections are active
        expect(clients).toHaveLength(clientCount);
        
        // Test broadcast performance
        const hostClient = clients[0];
        hostClient.send({
          type: 'ROOM_CREATE',
          payload: { nickname: 'StressHost' }
        });

        const createResponse = await hostClient.waitForMessage('room:created');
        const roomId = createResponse.payload.room.id;

        // All other clients join the room
        console.log('Joining all clients to room...');
        const joinPromises = clients.slice(1).map((client, index) => {
          client.send({
            type: 'JOIN_ROOM',
            payload: { roomId, nickname: `Player${index}` }
          });
          return client.waitForMessage('room:joined');
        });

        const joinResponses = await Promise.all(joinPromises);
        expect(joinResponses).toHaveLength(clientCount - 1);

        // Create a story (this will broadcast to all clients)
        hostClient.send({
          type: 'STORY_CREATE',
          payload: { 
            title: 'Stress Test Story',
            description: 'Testing with many clients'
          }
        });

        // All clients should receive the story creation
        const storyPromises = clients.map(client => 
          client.waitForMessage('story:created', 10000)
        );

        const storyResponses = await Promise.all(storyPromises);
        expect(storyResponses).toHaveLength(clientCount);

        console.log('Stress test with many connections completed successfully');
        
      } finally {
        // Cleanup
        clients.forEach(client => client.disconnect());
      }
    }, 120000);

    it('should handle rapid message bursts', async () => {
      const hostClient = new WebSocketTestClient();
      const playerClients: WebSocketTestClient[] = [];
      
      try {
        await hostClient.connect();
        
        // Create room
        hostClient.send({
          type: 'ROOM_CREATE',
          payload: { nickname: 'BurstHost' }
        });

        const createResponse = await hostClient.waitForMessage('room:created');
        const roomId = createResponse.payload.room.id;

        // Add some players
        for (let i = 0; i < 10; i++) {
          const client = new WebSocketTestClient();
          await client.connect();
          playerClients.push(client);
          
          client.send({
            type: 'JOIN_ROOM',
            payload: { roomId, nickname: `BurstPlayer${i}` }
          });
          
          await client.waitForMessage('room:joined');
        }

        // Create a story
        hostClient.send({
          type: 'STORY_CREATE',
          payload: { 
            title: 'Burst Test Story',
            description: 'Testing rapid message bursts'
          }
        });

        const storyResponse = await hostClient.waitForMessage('story:created');
        const storyId = storyResponse.payload.story.id;

        // Rapid voting burst - all players vote simultaneously
        console.log('Starting rapid voting burst...');
        const votes = ['1', '2', '3', '5', '8', '13', '?', '☕'];
        
        const votePromises = playerClients.map((client, index) => {
          const vote = votes[index % votes.length];
          client.send({
            type: 'VOTE',
            payload: { storyId, vote }
          });
          return client.waitForMessage('vote:recorded');
        });

        const voteResponses = await Promise.all(votePromises);
        expect(voteResponses.every(r => r.payload.success)).toBe(true);

        // Rapid story creation burst
        console.log('Starting rapid story creation burst...');
        const storyPromises = [];
        for (let i = 0; i < 20; i++) {
          hostClient.send({
            type: 'STORY_CREATE',
            payload: { 
              title: `Rapid Story ${i}`,
              description: `Story ${i} for burst testing`
            }
          });
          storyPromises.push(hostClient.waitForMessage('story:created'));
        }

        const rapidStoryResponses = await Promise.all(storyPromises);
        expect(rapidStoryResponses).toHaveLength(20);

        console.log('Rapid message burst test completed successfully');
        
      } finally {
        hostClient.disconnect();
        playerClients.forEach(client => client.disconnect());
      }
    }, 60000);

    it('should handle concurrent room operations', async () => {
      const hostCount = 20;
      const hosts: WebSocketTestClient[] = [];
      const roomIds: string[] = [];
      
      try {
        // Create multiple rooms simultaneously
        console.log(`Creating ${hostCount} rooms simultaneously...`);
        
        for (let i = 0; i < hostCount; i++) {
          const host = new WebSocketTestClient();
          await host.connect();
          hosts.push(host);
        }

        // All hosts create rooms simultaneously
        const createPromises = hosts.map((host, index) => {
          host.send({
            type: 'ROOM_CREATE',
            payload: { nickname: `ConcurrentHost${index}` }
          });
          return host.waitForMessage('room:created');
        });

        const createResponses = await Promise.all(createPromises);
        expect(createResponses).toHaveLength(hostCount);

        // Extract room IDs
        createResponses.forEach(response => {
          roomIds.push(response.payload.room.id);
        });

        // Verify all room IDs are unique
        const uniqueRoomIds = new Set(roomIds);
        expect(uniqueRoomIds.size).toBe(hostCount);

        // Add players to each room concurrently
        const playerPromises = hosts.map(async (host, hostIndex) => {
          const roomId = roomIds[hostIndex];
          const players: WebSocketTestClient[] = [];
          
          for (let playerIndex = 0; playerIndex < 5; playerIndex++) {
            const player = new WebSocketTestClient();
            await player.connect();
            players.push(player);
            
            player.send({
              type: 'JOIN_ROOM',
              payload: { roomId, nickname: `Player${hostIndex}_${playerIndex}` }
            });
            
            await player.waitForMessage('room:joined');
          }
          
          return players;
        });

        const allPlayers = await Promise.all(playerPromises);
        
        // Verify all rooms have the correct number of players
        for (let i = 0; i < hostCount; i++) {
          hosts[i].send({
            type: 'ROOM_SYNC',
            payload: {}
          });
          
          const syncResponse = await hosts[i].waitForMessage('room:state');
          expect(syncResponse.payload.room.players).toHaveLength(6); // 1 host + 5 players
        }

        console.log('Concurrent room operations test completed successfully');
        
        // Cleanup players
        allPlayers.flat().forEach(player => player.disconnect());
        
      } finally {
        hosts.forEach(host => host.disconnect());
      }
    }, 90000);
  });

  describe('Memory and Resource Testing', () => {
    it('should handle room lifecycle stress', async () => {
      const cycles = 50;
      
      for (let cycle = 0; cycle < cycles; cycle++) {
        const hostClient = new WebSocketTestClient();
        const playerClients: WebSocketTestClient[] = [];
        
        try {
          await hostClient.connect();
          
          // Create room
          hostClient.send({
            type: 'ROOM_CREATE',
            payload: { nickname: `CycleHost${cycle}` }
          });

          const createResponse = await hostClient.waitForMessage('room:created');
          const roomId = createResponse.payload.room.id;

          // Add players
          for (let i = 0; i < 5; i++) {
            const player = new WebSocketTestClient();
            await player.connect();
            playerClients.push(player);
            
            player.send({
              type: 'JOIN_ROOM',
              payload: { roomId, nickname: `CyclePlayer${cycle}_${i}` }
            });
            
            await player.waitForMessage('room:joined');
          }

          // Create stories and vote
          for (let story = 0; story < 3; story++) {
            hostClient.send({
              type: 'STORY_CREATE',
              payload: { 
                title: `Cycle ${cycle} Story ${story}`,
                description: `Story for cycle ${cycle}`
              }
            });

            const storyResponse = await hostClient.waitForMessage('story:created');
            const storyId = storyResponse.payload.story.id;

            // All players vote
            const votePromises = playerClients.map(player => {
              player.send({
                type: 'VOTE',
                payload: { storyId, vote: '5' }
              });
              return player.waitForMessage('vote:recorded');
            });

            await Promise.all(votePromises);

            // Reveal votes
            hostClient.send({
              type: 'REVEAL_VOTES',
              payload: { storyId }
            });

            await hostClient.waitForMessage('votes:revealed');
          }

          // Log progress
          if (cycle % 10 === 0) {
            console.log(`Completed cycle ${cycle}/${cycles}`);
          }
          
        } finally {
          // Cleanup - disconnect all clients to trigger room cleanup
          hostClient.disconnect();
          playerClients.forEach(player => player.disconnect());
          
          // Wait a bit for server cleanup
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`Room lifecycle stress test completed: ${cycles} cycles`);
    }, 180000);

    it('should handle message queue stress', async () => {
      const hostClient = new WebSocketTestClient();
      const playerClient = new WebSocketTestClient();
      
      try {
        await hostClient.connect();
        await playerClient.connect();

        // Create room
        hostClient.send({
          type: 'ROOM_CREATE',
          payload: { nickname: 'QueueHost' }
        });

        const createResponse = await hostClient.waitForMessage('room:created');
        const roomId = createResponse.payload.room.id;

        // Player joins
        playerClient.send({
          type: 'JOIN_ROOM',
          payload: { roomId, nickname: 'QueuePlayer' }
        });

        await playerClient.waitForMessage('room:joined');

        // Create many stories rapidly without waiting
        console.log('Flooding server with story creation messages...');
        const storyCount = 100;
        
        for (let i = 0; i < storyCount; i++) {
          hostClient.send({
            type: 'STORY_CREATE',
            payload: { 
              title: `Queue Story ${i}`,
              description: `Testing message queue ${i}`
            }
          });
        }

        // Wait for all story creation responses
        const storyResponses = [];
        for (let i = 0; i < storyCount; i++) {
          const response = await hostClient.waitForMessage('story:created', 15000);
          storyResponses.push(response);
        }

        expect(storyResponses).toHaveLength(storyCount);

        // Verify all stories were created correctly
        const storyTitles = storyResponses.map(r => r.payload.story.title);
        for (let i = 0; i < storyCount; i++) {
          expect(storyTitles).toContain(`Queue Story ${i}`);
        }

        console.log('Message queue stress test completed successfully');
        
      } finally {
        hostClient.disconnect();
        playerClient.disconnect();
      }
    }, 120000);
  });

  describe('Error Recovery Stress', () => {
    it('should handle rapid connect/disconnect cycles', async () => {
      const cycles = 30;
      const roomId = await createTestRoom();
      
      for (let cycle = 0; cycle < cycles; cycle++) {
        const client = new WebSocketTestClient();
        
        try {
          await client.connect();
          
          // Join room
          client.send({
            type: 'JOIN_ROOM',
            payload: { roomId, nickname: `Disconnector${cycle}` }
          });

          await client.waitForMessage('room:joined');
          
          // Immediately disconnect
          client.disconnect();
          
          // Wait briefly
          await new Promise(resolve => setTimeout(resolve, 50));
          
        } catch (error) {
          console.log(`Cycle ${cycle} failed:`, error);
        }
      }

      console.log(`Connect/disconnect stress test completed: ${cycles} cycles`);
    }, 60000);

    it('should recover from malformed message floods', async () => {
      const hostClient = new WebSocketTestClient();
      
      try {
        await hostClient.connect();
        
        // Create room
        hostClient.send({
          type: 'ROOM_CREATE',
          payload: { nickname: 'MalformedHost' }
        });

        await hostClient.waitForMessage('room:created');

        // Send many malformed messages
        console.log('Sending malformed messages...');
        for (let i = 0; i < 50; i++) {
          // Send invalid JSON
          (hostClient as any).ws.send('invalid json');
          
          // Send incomplete messages
          (hostClient as any).ws.send(JSON.stringify({ type: 'INVALID_TYPE' }));
          
          // Send messages with wrong payload structure
          (hostClient as any).ws.send(JSON.stringify({ 
            type: 'VOTE', 
            payload: { wrongField: 'value' }
          }));
        }

        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verify connection is still working with valid message
        hostClient.send({
          type: 'STORY_CREATE',
          payload: { 
            title: 'Recovery Test',
            description: 'Testing error recovery'
          }
        });

        const response = await hostClient.waitForMessage('story:created');
        expect(response.payload.story.title).toBe('Recovery Test');

        console.log('Malformed message stress test completed successfully');
        
      } finally {
        hostClient.disconnect();
      }
    }, 30000);
  });

  describe('Performance Benchmarks', () => {
    it('should maintain response times under load', async () => {
      const clientCount = 20;
      const clients: WebSocketTestClient[] = [];
      
      try {
        // Setup clients and room
        const hostClient = new WebSocketTestClient();
        await hostClient.connect();
        clients.push(hostClient);

        hostClient.send({
          type: 'ROOM_CREATE',
          payload: { nickname: 'PerfHost' }
        });

        const createResponse = await hostClient.waitForMessage('room:created');
        const roomId = createResponse.payload.room.id;

        // Add players
        for (let i = 0; i < clientCount - 1; i++) {
          const client = new WebSocketTestClient();
          await client.connect();
          clients.push(client);
          
          client.send({
            type: 'JOIN_ROOM',
            payload: { roomId, nickname: `PerfPlayer${i}` }
          });
          
          await client.waitForMessage('room:joined');
        }

        // Benchmark voting performance
        hostClient.send({
          type: 'STORY_CREATE',
          payload: { 
            title: 'Performance Benchmark',
            description: 'Testing response times'
          }
        });

        const storyResponse = await hostClient.waitForMessage('story:created');
        const storyId = storyResponse.payload.story.id;

        // Measure voting response times
        console.log('Measuring voting response times...');
        const startTime = Date.now();
        
        const votePromises = clients.map((client, index) => {
          const voteStartTime = Date.now();
          client.send({
            type: 'VOTE',
            payload: { storyId, vote: '5' }
          });
          
          return client.waitForMessage('vote:recorded').then(response => ({
            responseTime: Date.now() - voteStartTime,
            success: response.payload.success
          }));
        });

        const voteResults = await Promise.all(votePromises);
        const totalTime = Date.now() - startTime;

        // Analyze results
        const responseTimes = voteResults.map(r => r.responseTime);
        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        const maxResponseTime = Math.max(...responseTimes);
        const minResponseTime = Math.min(...responseTimes);

        console.log(`Performance results:
          - Total clients: ${clientCount}
          - Total time: ${totalTime}ms
          - Average response time: ${avgResponseTime.toFixed(2)}ms
          - Min response time: ${minResponseTime}ms
          - Max response time: ${maxResponseTime}ms
          - All votes successful: ${voteResults.every(r => r.success)}`);

        // Performance assertions
        expect(avgResponseTime).toBeLessThan(1000); // Average under 1 second
        expect(maxResponseTime).toBeLessThan(5000); // Max under 5 seconds
        expect(voteResults.every(r => r.success)).toBe(true);
        
      } finally {
        clients.forEach(client => client.disconnect());
      }
    }, 60000);
  });
});

// Helper function to create a test room
async function createTestRoom(): Promise<string> {
  const hostClient = new WebSocketTestClient();
  await hostClient.connect();
  
  hostClient.send({
    type: 'ROOM_CREATE',
    payload: { nickname: 'TestHost' }
  });

  const response = await hostClient.waitForMessage('room:created');
  const roomId = response.payload.room.id;
  
  hostClient.disconnect();
  return roomId;
}