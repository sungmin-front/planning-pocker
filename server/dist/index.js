"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const uuid_1 = require("uuid");
const roomManager_1 = require("./roomManager");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const jiraRoutes_1 = require("./routes/jiraRoutes");
const dotenv = __importStar(require("dotenv"));
// Load environment variables
dotenv.config();
const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;
// Create Express app and HTTP server
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/api/jira', jiraRoutes_1.jiraRouter);
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'Planning Poker Server' });
});
// Create WebSocket server using the HTTP server
const wss = new ws_1.WebSocketServer({ server });
const roomManager = new roomManager_1.RoomManager();
const clients = new Map();
// Start the combined server
server.listen(port, () => {
    console.log(`Planning Poker server running on port ${port}`);
    console.log(`WebSocket server listening on port ${port}`);
    console.log(`REST API available at http://localhost:${port}/api`);
});
// Helper function to get socket ID
function getSocketId(ws) {
    return ws.id || (ws.id = (0, uuid_1.v4)());
}
wss.on('connection', function connection(ws) {
    const socketId = getSocketId(ws);
    clients.set(socketId, ws);
    console.log(`New client connected: ${socketId}`);
    ws.on('error', console.error);
    ws.on('message', function message(data) {
        try {
            const message = JSON.parse(data.toString());
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
                    }
                    else {
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
                                if (otherWs && otherWs.readyState === ws_1.WebSocket.OPEN) {
                                    otherWs.send(JSON.stringify({
                                        type: 'room:playerJoined',
                                        payload: {
                                            player: joinResult.room.players.find(p => p.socketId === socketId),
                                            room: publicRoom
                                        }
                                    }));
                                }
                            }
                        });
                    }
                    else {
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
                    }
                    else {
                        console.log('Failed to create story - host check failed');
                        ws.send(JSON.stringify({
                            type: 'story:created',
                            payload: { success: false, error: 'Only the host can create stories' }
                        }));
                    }
                    break;
                }
                case 'VOTE': {
                    const { storyId, vote } = message.payload;
                    const result = roomManager.vote(socketId, storyId, vote);
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
                        type: 'vote:recorded',
                        payload: result
                    }));
                    break;
                }
                case 'REVEAL_VOTES': {
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
                                        type: 'votes:revealed',
                                        payload: {
                                            success: true,
                                            story: result.story
                                        }
                                    }));
                                }
                            });
                        }
                    }
                    else {
                        ws.send(JSON.stringify({
                            type: 'votes:revealed',
                            payload: result
                        }));
                    }
                    break;
                }
                case 'NEW_STORY': {
                    const { title, description } = message.payload;
                    const roomId = roomManager.getUserRoom(socketId);
                    if (!roomId) {
                        ws.send(JSON.stringify({
                            type: 'story:created',
                            payload: { success: false, error: 'Not in a room' }
                        }));
                        break;
                    }
                    const story = roomManager.addStory(roomId, title, description, socketId);
                    if (story) {
                        const roomState = roomManager.getRoomState(roomId);
                        // Broadcast new story to all clients in room
                        wss.clients.forEach(client => {
                            const clientSocketId = getSocketId(client);
                            if (roomManager.getUserRoom(clientSocketId) === roomId) {
                                client.send(JSON.stringify({
                                    type: 'story:created',
                                    payload: { story, roomState }
                                }));
                            }
                        });
                    }
                    else {
                        ws.send(JSON.stringify({
                            type: 'story:created',
                            payload: { success: false, error: 'Only the host can create stories' }
                        }));
                    }
                    break;
                }
                case 'RESET_VOTES': {
                    const { storyId } = message.payload;
                    const result = roomManager.restartVoting(socketId, storyId);
                    if (result.success && result.story) {
                        const roomId = roomManager.getUserRoom(socketId);
                        if (roomId) {
                            // Broadcast voting restart to all clients in room
                            wss.clients.forEach(client => {
                                const clientSocketId = getSocketId(client);
                                if (roomManager.getUserRoom(clientSocketId) === roomId) {
                                    client.send(JSON.stringify({
                                        type: 'votes:restarted',
                                        payload: {
                                            success: true,
                                            story: result.story
                                        }
                                    }));
                                }
                            });
                        }
                    }
                    else {
                        ws.send(JSON.stringify({
                            type: 'votes:restarted',
                            payload: result
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
                    }
                    else {
                        ws.send(JSON.stringify({
                            type: 'story:selected',
                            payload: result
                        }));
                    }
                    break;
                }
                case 'LEAVE_ROOM':
                    // Legacy message types - to be implemented later
                    break;
                default:
                    console.log('Unknown message type:', message.type);
            }
        }
        catch (error) {
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
//# sourceMappingURL=index.js.map