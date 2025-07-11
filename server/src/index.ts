import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketMessage, VoteValue, ChatMessage } from '@planning-poker/shared';
import { generateRoomId, releaseRoomId } from './utils';
import { RoomManager } from './roomManager';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { createJiraRouter } from './routes/jiraRoutes';
import { exportRouter } from './routes/exportRoutes';
import * as dotenv from 'dotenv';
import Database from './database';
import StoryResultService from './services/StoryResultService';
import RoomSessionService from './services/RoomSessionService';

// Load environment variables
dotenv.config();

// Initialize database connection (optional for development)
Database.connect().catch(error => {
  console.warn('⚠️ MongoDB connection failed - running without persistence:', error.message);
});

const port = process.env.PORT ? parseInt(process.env.PORT) : 9000;

// Create Express app and HTTP server
const app = express();
const server = createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Planning Poker Server' });
});

// Create WebSocket server using the HTTP server
const wss = new WebSocketServer({ server });
const roomManager = new RoomManager();
const clients = new Map<string, WebSocket>();
const storyResultService = StoryResultService;
const roomSessionService = RoomSessionService;

// Routes (after roomManager and wss are created)
app.use('/api/jira', createJiraRouter(roomManager, wss));
app.use('/api/export', exportRouter);

// Debug endpoints for room management inspection
app.get('/api/debug/rooms', (_req, res) => {
  const allRooms = roomManager.getAllRooms();
  const rooms = Array.from(allRooms.entries()).map(([id, room]) => ({
    id,
    name: room.name,
    playerCount: room.players.length,
    storyCount: room.stories.length,
    createdAt: room.createdAt,
    currentStoryId: room.currentStoryId,
    players: room.players.map(p => ({
      id: p.id,
      nickname: p.nickname,
      isHost: p.isHost,
      isSpectator: p.isSpectator,
      socketId: p.socketId
    })),
    backlogSettings: room.backlogSettings
  }));
  
  res.json({
    totalRooms: rooms.length,
    totalActivePlayers: rooms.reduce((sum, room) => sum + room.playerCount, 0),
    rooms
  });
});

app.get('/api/debug/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = roomManager.getRoom(roomId.toUpperCase());
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  res.json({
    room: {
      id: room.id,
      name: room.name,
      players: room.players,
      stories: room.stories,
      createdAt: room.createdAt,
      currentStoryId: room.currentStoryId,
      backlogSettings: room.backlogSettings,
      socketIds: Array.from(room.socketIds)
    },
    roomState: roomManager.getRoomState(room.id)
  });
});

app.get('/api/debug/sockets', (req, res) => {
  const socketMap = (roomManager as any).socketUserMap;
  const activeClients = Array.from(clients.keys());
  
  res.json({
    totalConnectedClients: activeClients.length,
    totalMappedSockets: Object.keys(socketMap).length,
    socketMappings: socketMap,
    activeClientIds: activeClients,
    unmappedClients: activeClients.filter(clientId => !socketMap[clientId])
  });
});

app.post('/api/debug/rooms/:roomId/cleanup', (req, res) => {
  const { roomId } = req.params;
  const room = roomManager.getRoom(roomId.toUpperCase());
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  // Force remove all players to trigger cleanup
  const playerSocketIds = Array.from(room.socketIds);
  playerSocketIds.forEach(socketId => {
    roomManager.removePlayer(socketId);
  });
  
  res.json({ 
    message: `Room ${roomId} cleaned up`, 
    removedPlayers: playerSocketIds.length 
  });
});

// Start the combined server
server.listen(port, '0.0.0.0', () => {
  console.log(`Planning Poker server running on port ${port}`);
  console.log(`WebSocket server listening on port ${port}`);
  console.log(`REST API available at http://0.0.0.0:${port}/api`);
});

// Helper function to get socket ID
function getSocketId(ws: WebSocket): string {
  return (ws as any).id || ((ws as any).id = uuidv4());
}

wss.on('connection', function connection(ws) {
  const socketId = getSocketId(ws);
  clients.set(socketId, ws);
  console.log(`New client connected: ${socketId}`);
  
  // Send socket ID to client for session management
  ws.send(JSON.stringify({
    type: 'SOCKET_ID',
    payload: { socketId }
  }));
  
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
              
              // RoomSession: 투표 기록
              if (player) {
                roomSessionService.recordVote(roomId, storyId, player, voteValue).catch(console.error);
              }
              
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
              // RoomSession: 투표 공개 및 통계 저장
              const room = roomManager.getRoom(roomId);
              if (room && result.story.votes) {
                roomSessionService.revealVotes(roomId, storyId, result.story.votes, room.players).catch(console.error);
              }
              
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
              // RoomSession: 투표 재시작
              roomSessionService.restartVoting(roomId, storyId).catch(console.error);
              
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
              const room = roomManager.getRoom(roomId);
              const playerObj = room?.players.find(p => p.socketId === socketId);
              
              // 스토리 완료 결과 저장
              if (room && result.story && playerObj) {
                const playerNicknames: Record<string, string> = {};
                room.players.forEach(p => {
                  playerNicknames[p.id] = p.nickname;
                });
                
                // 기존 StoryResult 저장 (하위호환성)
                storyResultService.saveStoryResult(
                  room.id,
                  room.name,
                  result.story.id,
                  result.story.title,
                  result.story.description,
                  result.story.votes,
                  point,
                  { playerId: playerObj.id, nickname: playerObj.nickname },
                  playerNicknames
                ).catch(console.error);
                
                // RoomSession: 스토리 완료
                roomSessionService.completeStory(room.id, result.story.id, point, playerObj).catch(console.error);
              }
              
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

        case 'STORY_SKIP': {
          const { storyId } = message.payload;
          const result = roomManager.skipStory(socketId, storyId);
          
          if (result.success && result.story) {
            const roomId = roomManager.getUserRoom(socketId);
            if (roomId) {
              // Broadcast the skipped story to all clients in room
              wss.clients.forEach(client => {
                const clientSocketId = getSocketId(client);
                if (roomManager.getUserRoom(clientSocketId) === roomId) {
                  client.send(JSON.stringify({
                    type: 'story:skipped',
                    payload: {
                      story: result.story
                    }
                  }));
                }
              });
            }
          }
          
          ws.send(JSON.stringify({
            type: 'story:skip:response',
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
          
          // RoomSession: 새 세션 생성 또는 재개
          roomSessionService.createOrResumeSession(room).catch(console.error);
          
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
            
            // RoomSession: 세션 업데이트 (참여자 추가)
            roomSessionService.createOrResumeSession(joinResult.room).catch(console.error);
            
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

        case 'BACKLOG_SETTINGS_UPDATE': {
          const { sortOption, filterOption } = message.payload;
          console.log(`Backlog settings update requested by ${socketId}:`, { sortOption, filterOption });
          
          const result = roomManager.updateBacklogSettings(socketId, { sortOption, filterOption });
          
          if (result.success) {
            const roomId = roomManager.getUserRoom(socketId);
            if (roomId) {
              // Broadcast settings update to all clients in room
              wss.clients.forEach(client => {
                const clientSocketId = getSocketId(client);
                if (roomManager.getUserRoom(clientSocketId) === roomId) {
                  client.send(JSON.stringify({
                    type: 'backlog:settingsUpdated',
                    payload: {
                      sortOption,
                      filterOption
                    }
                  }));
                }
              });
            }
          }

          ws.send(JSON.stringify({
            type: 'backlog:settings:response',
            payload: result
          }));
          break;
        }

        case 'REJOIN_ROOM': {
          const { roomId, nickname, previousSocketId } = message.payload;
          
          // If we have a previous socket ID, clean up that connection first
          if (previousSocketId) {
            const oldPlayer = roomManager.getPlayer(previousSocketId);
            if (oldPlayer) {
              roomManager.removePlayer(previousSocketId);
            }
          }
          
          // Try to join/rejoin the room
          const result = roomManager.joinRoom(roomId, nickname, socketId);
          
          if (result.success && result.room) {
            // Find the player that was just added
            const player = result.room.players.find(p => p.socketId === socketId);
            
            // Send confirmation to the rejoining player
            ws.send(JSON.stringify({
              type: 'room:joined',
              payload: {
                room: result.room,
                player: player
              }
            }));
            
            // Broadcast player joined to other room members
            wss.clients.forEach(client => {
              const clientSocketId = getSocketId(client);
              if (clientSocketId !== socketId && roomManager.getUserRoom(clientSocketId) === roomId) {
                client.send(JSON.stringify({
                  type: 'room:playerJoined',
                  payload: {
                    room: result.room,
                    player: player
                  }
                }));
              }
            });
          } else {
            ws.send(JSON.stringify({
              type: 'room:joinError',
              payload: {
                error: result.error || 'Failed to rejoin room'
              }
            }));
          }
          break;
        }

        case 'CHAT_MESSAGE': {
          const { message: chatText } = message.payload;
          console.log(`Chat message received from ${socketId}: ${chatText}`);
          
          // Validate message length
          if (!chatText || typeof chatText !== 'string') {
            ws.send(JSON.stringify({
              type: 'chat:message:response',
              payload: { success: false, error: 'Invalid message content' }
            }));
            break;
          }

          if (chatText.length > 1000) {
            ws.send(JSON.stringify({
              type: 'chat:message:response',
              payload: { success: false, error: 'Message too long (max 1000 characters)' }
            }));
            break;
          }

          const roomId = roomManager.getUserRoom(socketId);
          if (!roomId) {
            ws.send(JSON.stringify({
              type: 'chat:message:response',
              payload: { success: false, error: 'Not in a room' }
            }));
            break;
          }

          const room = roomManager.getRoom(roomId);
          if (!room) {
            ws.send(JSON.stringify({
              type: 'chat:message:response',
              payload: { success: false, error: 'Room not found' }
            }));
            break;
          }

          const player = room.players.find(p => p.socketId === socketId);
          if (!player) {
            ws.send(JSON.stringify({
              type: 'chat:message:response',
              payload: { success: false, error: 'Player not in room' }
            }));
            break;
          }

          // Create chat message
          const chatMessage: ChatMessage = {
            id: uuidv4(),
            playerId: player.id,
            playerNickname: player.nickname,
            message: chatText,
            timestamp: new Date(),
            roomId: room.id
          };

          // Add to room's chat messages
          if (!room.chatMessages) {
            room.chatMessages = [];
          }
          room.chatMessages.push(chatMessage);

          console.log(`Broadcasting chat message to room ${roomId}`);

          // Broadcast chat message to all clients in room
          let broadcastCount = 0;
          wss.clients.forEach(client => {
            const clientSocketId = getSocketId(client);
            if (roomManager.getUserRoom(clientSocketId) === roomId) {
              client.send(JSON.stringify({
                type: 'chat:messageReceived',
                payload: chatMessage
              }));
              broadcastCount++;
            }
          });

          console.log(`Broadcast chat message to ${broadcastCount} clients`);

          // Send success response to sender
          ws.send(JSON.stringify({
            type: 'chat:message:response',
            payload: { success: true, chatMessage }
          }));
          break;
        }

        case 'CHAT_HISTORY_REQUEST': {
          console.log(`Chat history requested by ${socketId}`);
          
          const roomId = roomManager.getUserRoom(socketId);
          if (!roomId) {
            ws.send(JSON.stringify({
              type: 'chat:history:response',
              payload: { success: false, error: 'Not in a room' }
            }));
            break;
          }

          const room = roomManager.getRoom(roomId);
          if (!room) {
            ws.send(JSON.stringify({
              type: 'chat:history:response',
              payload: { success: false, error: 'Room not found' }
            }));
            break;
          }

          const player = room.players.find(p => p.socketId === socketId);
          if (!player) {
            ws.send(JSON.stringify({
              type: 'chat:history:response',
              payload: { success: false, error: 'Player not in room' }
            }));
            break;
          }

          // Return chat history
          const chatMessages = room.chatMessages || [];
          console.log(`Sending ${chatMessages.length} chat messages to ${socketId}`);

          ws.send(JSON.stringify({
            type: 'chat:history:response',
            payload: { success: true, chatMessages }
          }));
          break;
        }

        case 'CHAT_TYPING_START': {
          const roomId = roomManager.getUserRoom(socketId);
          if (!roomId) {
            console.log('User not in a room for typing start');
            ws.send(JSON.stringify({
              type: 'error',
              payload: { error: 'Not in a room' }
            }));
            break;
          }

          const room = roomManager.getRoom(roomId);
          const player = roomManager.getPlayer(socketId);
          
          if (!room || !player) {
            console.log('Room or player not found for typing start');
            break;
          }

          // Initialize typingUsers array if it doesn't exist
          if (!room.typingUsers) {
            room.typingUsers = [];
          }

          // Add or update typing indicator
          const existingIndex = room.typingUsers.findIndex(t => t.playerId === player.id);
          const typingIndicator = {
            playerId: player.id,
            playerNickname: player.nickname,
            roomId,
            timestamp: new Date()
          };

          if (existingIndex >= 0) {
            room.typingUsers[existingIndex] = typingIndicator;
          } else {
            room.typingUsers.push(typingIndicator);
          }

          // Broadcast to all room members except sender
          console.log(`Broadcasting typing start for ${player.nickname} in room ${roomId}`);
          wss.clients.forEach(client => {
            const clientSocketId = getSocketId(client);
            if (roomManager.getUserRoom(clientSocketId) === roomId && clientSocketId !== socketId) {
              client.send(JSON.stringify({
                type: 'chat:typing:start',
                payload: { 
                  playerId: player.id,
                  playerNickname: player.nickname
                }
              }));
            }
          });
          break;
        }

        case 'CHAT_TYPING_STOP': {
          const roomId = roomManager.getUserRoom(socketId);
          if (!roomId) {
            console.log('User not in a room for typing stop');
            break;
          }

          const room = roomManager.getRoom(roomId);
          const player = roomManager.getPlayer(socketId);
          
          if (!room || !player) {
            console.log('Room or player not found for typing stop');
            break;
          }

          // Remove typing indicator
          if (room.typingUsers) {
            room.typingUsers = room.typingUsers.filter(t => t.playerId !== player.id);
          }

          // Broadcast to all room members except sender
          console.log(`Broadcasting typing stop for ${player.nickname} in room ${roomId}`);
          wss.clients.forEach(client => {
            const clientSocketId = getSocketId(client);
            if (roomManager.getUserRoom(clientSocketId) === roomId && clientSocketId !== socketId) {
              client.send(JSON.stringify({
                type: 'chat:typing:stop',
                payload: { 
                  playerId: player.id,
                  playerNickname: player.nickname
                }
              }));
            }
          });
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
    
    // Clean up typing indicators before removing player
    const roomId = roomManager.getUserRoom(socketId);
    const player = roomManager.getPlayer(socketId);
    if (roomId && player) {
      const room = roomManager.getRoom(roomId);
      if (room && (room as any).typingUsers) {
        const wasTyping = (room as any).typingUsers.some((t: any) => t.playerId === player.id);
        (room as any).typingUsers = (room as any).typingUsers.filter((t: any) => t.playerId !== player.id);
        
        // Broadcast typing stop if user was typing
        if (wasTyping) {
          wss.clients.forEach(client => {
            const clientSocketId = getSocketId(client);
            if (roomManager.getUserRoom(clientSocketId) === roomId && clientSocketId !== socketId) {
              client.send(JSON.stringify({
                type: 'chat:typing:stop',
                payload: { 
                  playerId: player.id,
                  playerNickname: player.nickname
                }
              }));
            }
          });
        }
      }
    }
    
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