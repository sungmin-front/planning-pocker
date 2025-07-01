import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketMessage, VoteValue } from '@planning-poker/shared';
import { generateRoomId, releaseRoomId } from './utils';
import { RoomManager } from './roomManager';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { jiraRouter } from './routes/jiraRoutes';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;

// Create Express app and HTTP server
const app = express();
const server = createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/jira', jiraRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Planning Poker Server' });
});

// Create WebSocket server using the HTTP server
const wss = new WebSocketServer({ server });
const roomManager = new RoomManager();
const clients = new Map<string, WebSocket>();

// Start the combined server
server.listen(port, () => {
  console.log(`Planning Poker server running on port ${port}`);
  console.log(`WebSocket server listening on port ${port}`);
  console.log(`REST API available at http://localhost:${port}/api`);
});

// Helper function to get socket ID
function getSocketId(ws: WebSocket): string {
  return (ws as any).id || ((ws as any).id = uuidv4());
}

wss.on('connection', function connection(ws) {
  const socketId = getSocketId(ws);
  clients.set(socketId, ws);
  console.log(`New client connected: ${socketId}`);
  
  ws.on('error', console.error);

  ws.on('message', function message(data) {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      console.log('Received message:', message);
      
      // Handle different message types
      switch (message.type) {
        case 'STORY_VOTE': {
          const { storyId, vote, point } = message.payload;
          const voteValue = vote || point; // Support both 'vote' and 'point' for compatibility
          console.log(`Processing STORY_VOTE for story ${storyId}, vote: ${voteValue}`);
          const result = roomManager.vote(socketId, storyId, voteValue);
          console.log('Vote result:', result);
          
          if (result.success) {
            const roomId = roomManager.getUserRoom(socketId);
            console.log(`Vote successful, broadcasting to room: ${roomId}`);
            if (roomId) {
              const player = roomManager.getPlayer(socketId);
              const roomState = roomManager.getRoomState(roomId);
              console.log('RoomState after vote:', JSON.stringify(roomState, null, 2));
              
              // Broadcast updated room state to all clients
              wss.clients.forEach(client => {
                const clientSocketId = getSocketId(client);
                if (roomManager.getUserRoom(clientSocketId) === roomId) {
                  console.log(`Sending room:updated to client ${clientSocketId}`);
                  client.send(JSON.stringify({
                    type: 'room:updated',
                    payload: roomState
                  }));
                }
              });
            }
          } else {
            console.log('Vote failed:', result.error);
          }
          
          ws.send(JSON.stringify({
            type: 'story:vote:response',
            payload: result
          }));
          break;
        }

        case 'STORY_REVEAL_VOTES': {
          const { storyId } = message.payload;
          console.log(`[WebSocket] STORY_REVEAL_VOTES received - socketId: ${socketId}, storyId: ${storyId}`);
          
          const result = roomManager.revealVotes(socketId, storyId);
          console.log(`[WebSocket] revealVotes result:`, result);
          
          if (result.success && result.story) {
            const roomId = roomManager.getUserRoom(socketId);
            console.log(`[WebSocket] Broadcasting votes revealed to room: ${roomId}`);
            
            if (roomId) {
              // Broadcast revealed votes to all clients in room
              let broadcastCount = 0;
              wss.clients.forEach(client => {
                const clientSocketId = getSocketId(client);
                if (roomManager.getUserRoom(clientSocketId) === roomId) {
                  console.log(`[WebSocket] Sending story:votesRevealed to client ${clientSocketId}`);
                  client.send(JSON.stringify({
                    type: 'story:votesRevealed',
                    payload: {
                      storyId,
                      votes: result.story?.votes || {}
                    }
                  }));
                  broadcastCount++;
                }
              });
              console.log(`[WebSocket] Broadcast completed to ${broadcastCount} clients`);
            }
          } else {
            console.log(`[WebSocket] revealVotes failed:`, result.error);
          }
          
          console.log(`[WebSocket] Sending response back to requesting client`);
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

        case 'ROOM_TRANSFER_HOST': {
          const { toNickname } = message.payload;
          const result = roomManager.transferHost(socketId, toNickname);
          
          if (result.success && result.newHost) {
            const roomId = roomManager.getUserRoom(socketId);
            if (roomId) {
              // Broadcast host change to all clients in room
              wss.clients.forEach(client => {
                const clientSocketId = getSocketId(client);
                if (roomManager.getUserRoom(clientSocketId) === roomId) {
                  client.send(JSON.stringify({
                    type: 'room:hostChanged',
                    payload: {
                      newHostId: result.newHost?.id,
                      newHostNickname: result.newHost?.nickname,
                      oldHostId: result.oldHost?.id,
                      oldHostNickname: result.oldHost?.nickname
                    }
                  }));
                }
              });

              // Also send updated room state
              const roomState = roomManager.getRoomState(roomId);
              if (roomState) {
                wss.clients.forEach(client => {
                  const clientSocketId = getSocketId(client);
                  if (roomManager.getUserRoom(clientSocketId) === roomId) {
                    client.send(JSON.stringify({
                      type: 'room:updated',
                      payload: roomState
                    }));
                  }
                });
              }
            }
          }
          
          ws.send(JSON.stringify({
            type: 'room:transferHost:response',
            payload: result
          }));
          break;
        }

        case 'ROOM_CREATE': {
          const { nickname } = message.payload;
          console.log(`Creating room for host: ${nickname}`);
          
          const room = roomManager.createRoom(nickname, socketId);
          console.log(`Room created: ${room.id}`);
          
          // Send room state to the host
          const publicRoom = {
            id: room.id,
            name: room.name,
            players: room.players,
            stories: room.stories,
            createdAt: room.createdAt,
            currentStoryId: null
          };
          
          const hostPlayer = room.players.find(p => p.socketId === socketId);
          ws.send(JSON.stringify({
            type: 'room:created',
            payload: { 
              room: publicRoom,
              player: hostPlayer
            }
          }));
          break;
        }

        case 'ROOM_SYNC': {
          const result = roomManager.syncRoom(socketId);
          
          if (result.success && result.playerState) {
            // Send the current room state to the requesting client
            ws.send(JSON.stringify({
              type: 'room:state',
              payload: result.playerState
            }));
          }
          
          ws.send(JSON.stringify({
            type: 'room:sync:response',
            payload: { 
              success: result.success,
              error: result.error
            }
          }));
          break;
        }

        case 'JOIN_ROOM': {
          const { roomId, nickname, isSpectator } = message.payload;
          const normalizedRoomId = roomId.toUpperCase();
          console.log(`Player ${nickname} attempting to join room ${normalizedRoomId}${isSpectator ? ' as spectator' : ''}`);
          console.log('JOIN_ROOM payload:', message.payload);
          
          const joinResult = roomManager.joinRoom(normalizedRoomId, nickname, socketId, isSpectator);
          console.log('Join result:', joinResult);
          
          if (joinResult.success && joinResult.room) {
            console.log(`Player ${nickname} successfully joined room ${roomId}`);
            
            // Send room state to the joining player
            const publicRoom = {
              id: joinResult.room.id,
              name: joinResult.room.name,
              players: joinResult.room.players,
              stories: joinResult.room.stories,
              createdAt: joinResult.room.createdAt,
              currentStoryId: joinResult.room.currentStoryId || null
            };
            
            const joinedPlayer = joinResult.room.players.find(p => p.socketId === socketId);
            ws.send(JSON.stringify({
              type: 'room:joined',
              payload: { 
                room: publicRoom,
                player: joinedPlayer
              }
            }));
            
            // Notify other players in the room
            joinResult.room.socketIds.forEach(sid => {
              if (sid !== socketId) {
                const otherWs = clients.get(sid);
                if (otherWs && otherWs.readyState === WebSocket.OPEN) {
                  otherWs.send(JSON.stringify({
                    type: 'room:playerJoined',
                    payload: { 
                      player: joinResult.room!.players.find(p => p.socketId === socketId),
                      room: publicRoom
                    }
                  }));
                }
              }
            });
          } else {
            console.log(`Player ${nickname} failed to join room ${normalizedRoomId}: ${joinResult.error}`);
            ws.send(JSON.stringify({
              type: 'room:joinError',
              payload: { 
                error: joinResult.error || 'Failed to join room',
                suggestions: joinResult.suggestions || []
              }
            }));
          }
          break;
        }

        case 'STORY_CREATE': {
          const { title, description } = message.payload;
          console.log(`Processing STORY_CREATE for title: ${title}`);
          const roomId = roomManager.getUserRoom(socketId);
          console.log(`Socket ${socketId} is in room: ${roomId}`);
          
          if (!roomId) {
            console.log('No room found for socket');
            ws.send(JSON.stringify({
              type: 'story:created',
              payload: { success: false, error: 'Not in a room' }
            }));
            break;
          }
          
          const story = roomManager.addStory(roomId, title, description, socketId);
          console.log('addStory result:', story);
          
          if (story) {
            const roomState = roomManager.getRoomState(roomId);
            console.log('Broadcasting story to room clients');
            
            // Broadcast new story to all clients in room
            wss.clients.forEach(client => {
              const clientSocketId = getSocketId(client);
              if (roomManager.getUserRoom(clientSocketId) === roomId) {
                console.log(`Sending story:created to client ${clientSocketId}`);
                client.send(JSON.stringify({
                  type: 'story:created',
                  payload: { story, roomState }
                }));
              }
            });
          } else {
            console.log('Failed to create story - host check failed');
            ws.send(JSON.stringify({
              type: 'story:created',
              payload: { success: false, error: 'Only the host can create stories' }
            }));
          }
          break;
        }


        case 'STORY_SELECT': {
          const { storyId } = message.payload;
          const roomId = roomManager.getUserRoom(socketId);
          if (!roomId) {
            ws.send(JSON.stringify({
              type: 'story:selected',
              payload: { success: false, error: 'Not in a room' }
            }));
            break;
          }
          
          const result = roomManager.selectStory(roomId, storyId, socketId);
          if (result.success) {
            // Broadcast story selection to all clients in room
            wss.clients.forEach(client => {
              const clientSocketId = getSocketId(client);
              if (roomManager.getUserRoom(clientSocketId) === roomId) {
                client.send(JSON.stringify({
                  type: 'story:selected',
                  payload: { 
                    success: true,
                    storyId,
                    roomState: roomManager.getRoomState(roomId)
                  }
                }));
              }
            });
          } else {
            ws.send(JSON.stringify({
              type: 'story:selected',
              payload: result
            }));
          }
          break;
        }

        case 'LEAVE_ROOM': {
          console.log(`Player ${socketId} leaving room voluntarily`);
          const result = roomManager.removePlayer(socketId);
          
          // Handle automatic host reassignment on voluntary leave
          if (result.hostChanged && result.newHost && result.roomId) {
            console.log(`Host left voluntarily, reassigning to: ${result.newHost.nickname}`);
            
            // Broadcast host change to all remaining clients in room
            wss.clients.forEach(client => {
              const clientSocketId = getSocketId(client);
              if (roomManager.getUserRoom(clientSocketId) === result.roomId) {
                client.send(JSON.stringify({
                  type: 'room:hostChanged',
                  payload: {
                    newHostId: result.newHost?.id,
                    newHostNickname: result.newHost?.nickname,
                    reason: 'host_left'
                  }
                }));
              }
            });

            // Also send updated room state
            const roomState = roomManager.getRoomState(result.roomId);
            if (roomState) {
              wss.clients.forEach(client => {
                const clientSocketId = getSocketId(client);
                if (roomManager.getUserRoom(clientSocketId) === result.roomId) {
                  client.send(JSON.stringify({
                    type: 'room:updated',
                    payload: roomState
                  }));
                }
              });
            }
          } else if (result.roomId) {
            // If no host change but room still exists, just update room state
            const roomState = roomManager.getRoomState(result.roomId);
            if (roomState) {
              wss.clients.forEach(client => {
                const clientSocketId = getSocketId(client);
                if (roomManager.getUserRoom(clientSocketId) === result.roomId) {
                  client.send(JSON.stringify({
                    type: 'room:updated',
                    payload: roomState
                  }));
                }
              });
            }
          }
          
          // Confirm to the leaving client
          ws.send(JSON.stringify({
            type: 'room:left',
            payload: { success: true }
          }));
          break;
        }

        case 'HOST_DELEGATE': {
          const { roomId, newHostId } = message.payload;
          console.log(`Host delegation requested: ${socketId} -> ${newHostId} in room ${roomId}`);
          
          const result = roomManager.delegateHost(socketId, newHostId);
          console.log('Host delegation result:', result);
          
          if (result.success) {
            console.log('Host delegation successful, broadcasting messages...');
            // Broadcast host change to all clients in room
            wss.clients.forEach(client => {
              const clientSocketId = getSocketId(client);
              if (roomManager.getUserRoom(clientSocketId) === roomId) {
                client.send(JSON.stringify({
                  type: 'room:hostChanged',
                  payload: {
                    newHostId: newHostId,
                    newHostNickname: result.newHost?.nickname,
                    oldHostId: result.oldHost?.id,
                    oldHostNickname: result.oldHost?.nickname,
                    reason: 'delegated'
                  }
                }));
              }
            });

            // Send updated room state
            const roomState = roomManager.getRoomState(roomId);
            if (roomState) {
              wss.clients.forEach(client => {
                const clientSocketId = getSocketId(client);
                if (roomManager.getUserRoom(clientSocketId) === roomId) {
                  client.send(JSON.stringify({
                    type: 'room:updated',
                    payload: roomState
                  }));
                }
              });
            }
          }

          ws.send(JSON.stringify({
            type: 'host:delegated',
            payload: result
          }));
          break;
        }

        case 'PLAYER_KICK': {
          const { roomId, playerId } = message.payload;
          console.log(`Player kick requested: ${playerId} from room ${roomId} by ${socketId}`);
          
          const result = roomManager.kickPlayer(socketId, playerId);
          
          if (result.success) {
            // Notify the kicked player first
            wss.clients.forEach(client => {
              const clientSocketId = getSocketId(client);
              if (clientSocketId === playerId) {
                client.send(JSON.stringify({
                  type: 'player:kicked',
                  payload: { reason: 'kicked_by_host' }
                }));
              }
            });

            // Update room state for remaining clients
            const roomState = roomManager.getRoomState(roomId);
            if (roomState) {
              wss.clients.forEach(client => {
                const clientSocketId = getSocketId(client);
                if (roomManager.getUserRoom(clientSocketId) === roomId) {
                  client.send(JSON.stringify({
                    type: 'room:updated',
                    payload: roomState
                  }));
                }
              });
            }
          }

          ws.send(JSON.stringify({
            type: 'player:kicked:response',
            payload: result
          }));
          break;
        }

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
    clients.delete(socketId);
    const result = roomManager.removePlayer(socketId);
    
    // Handle automatic host reassignment on disconnect
    if (result.hostChanged && result.newHost && result.roomId) {
      console.log(`Host disconnected, reassigning to: ${result.newHost.nickname}`);
      
      // Broadcast host change to all remaining clients in room
      wss.clients.forEach(client => {
        const clientSocketId = getSocketId(client);
        if (roomManager.getUserRoom(clientSocketId) === result.roomId) {
          client.send(JSON.stringify({
            type: 'room:hostChanged',
            payload: {
              newHostId: result.newHost?.id,
              newHostNickname: result.newHost?.nickname,
              reason: 'host_disconnected'
            }
          }));
        }
      });

      // Also send updated room state
      const roomState = roomManager.getRoomState(result.roomId);
      if (roomState) {
        wss.clients.forEach(client => {
          const clientSocketId = getSocketId(client);
          if (roomManager.getUserRoom(clientSocketId) === result.roomId) {
            client.send(JSON.stringify({
              type: 'room:updated',
              payload: roomState
            }));
          }
        });
      }
    }
  });
});