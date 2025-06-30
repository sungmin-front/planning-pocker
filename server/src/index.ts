import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketMessage, VoteValue } from '@planning-poker/shared';
import { generateRoomId, releaseRoomId } from './utils';
import { RoomManager } from './roomManager';

const wss = new WebSocketServer({ port: 8080 });
const roomManager = new RoomManager();

console.log('Planning Poker WebSocket server running on port 8080');

// Helper function to get socket ID
function getSocketId(ws: WebSocket): string {
  return (ws as any).id || ((ws as any).id = uuidv4());
}

wss.on('connection', function connection(ws) {
  const socketId = getSocketId(ws);
  console.log(`New client connected: ${socketId}`);
  
  ws.on('error', console.error);

  ws.on('message', function message(data) {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      console.log('Received message:', message);
      
      // Handle different message types
      switch (message.type) {
        case 'STORY_VOTE': {
          const { storyId, point } = message.payload;
          const result = roomManager.vote(socketId, storyId, point);
          
          if (result.success) {
            const roomId = roomManager.getUserRoom(socketId);
            if (roomId) {
              const player = roomManager.getPlayer(socketId);
              // Broadcast vote without revealing the value
              wss.clients.forEach(client => {
                const clientSocketId = getSocketId(client);
                if (roomManager.getUserRoom(clientSocketId) === roomId) {
                  client.send(JSON.stringify({
                    type: 'player:voted',
                    payload: {
                      playerId: player?.id,
                      storyId
                    }
                  }));
                }
              });
            }
          }
          
          ws.send(JSON.stringify({
            type: 'story:vote:response',
            payload: result
          }));
          break;
        }

        case 'STORY_REVEAL_VOTES': {
          const { storyId } = message.payload;
          const result = roomManager.revealVotes(socketId, storyId);
          
          if (result.success && result.story) {
            const roomId = roomManager.getUserRoom(socketId);
            if (roomId) {
              // Broadcast revealed votes to all clients in room
              wss.clients.forEach(client => {
                const clientSocketId = getSocketId(client);
                if (roomManager.getUserRoom(clientSocketId) === roomId) {
                  client.send(JSON.stringify({
                    type: 'story:votesRevealed',
                    payload: {
                      storyId,
                      votes: result.story?.votes || {}
                    }
                  }));
                }
              });
            }
          }
          
          ws.send(JSON.stringify({
            type: 'story:revealVotes:response',
            payload: result
          }));
          break;
        }

        case 'STORY_RESTART_VOTING': {
          const { storyId } = message.payload;
          const result = roomManager.restartVoting(socketId, storyId);
          
          if (result.success) {
            const roomId = roomManager.getUserRoom(socketId);
            if (roomId) {
              // Broadcast voting restart to all clients in room
              wss.clients.forEach(client => {
                const clientSocketId = getSocketId(client);
                if (roomManager.getUserRoom(clientSocketId) === roomId) {
                  client.send(JSON.stringify({
                    type: 'story:votingRestarted',
                    payload: { storyId }
                  }));
                }
              });
            }
          }
          
          ws.send(JSON.stringify({
            type: 'story:restartVoting:response',
            payload: result
          }));
          break;
        }

        case 'STORY_SET_FINAL_POINT': {
          const { storyId, point } = message.payload;
          const result = roomManager.setFinalPoint(socketId, storyId, point);
          
          if (result.success && result.story) {
            const roomId = roomManager.getUserRoom(socketId);
            if (roomId) {
              // Broadcast the final point to all clients in room
              wss.clients.forEach(client => {
                const clientSocketId = getSocketId(client);
                if (roomManager.getUserRoom(clientSocketId) === roomId) {
                  client.send(JSON.stringify({
                    type: 'story:updated',
                    payload: {
                      storyId,
                      final_point: point,
                      status: 'closed'
                    }
                  }));
                }
              });
            }
          }
          
          ws.send(JSON.stringify({
            type: 'story:setFinalPoint:response',
            payload: result
          }));
          break;
        }

        case 'JOIN_ROOM':
        case 'LEAVE_ROOM':
        case 'VOTE':
        case 'REVEAL_VOTES':
        case 'NEW_STORY':
        case 'RESET_VOTES':
          // Legacy message types - to be implemented later
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        payload: { error: 'Invalid message format' }
      }));
    }
  });

  ws.on('close', function close() {
    console.log(`Client disconnected: ${socketId}`);
    roomManager.removePlayer(socketId);
  });
});