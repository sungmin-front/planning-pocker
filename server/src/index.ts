import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketMessage, Room, Player } from '@planning-poker/shared';

const wss = new WebSocketServer({ port: 8080 });

const rooms = new Map<string, Room>();

console.log('Planning Poker WebSocket server running on port 8080');

wss.on('connection', function connection(ws) {
  console.log('New client connected');
  
  ws.on('error', console.error);

  ws.on('message', function message(data) {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      console.log('Received message:', message);
      
      // Handle different message types
      switch (message.type) {
        case 'JOIN_ROOM':
          // Handle room joining logic
          break;
        case 'LEAVE_ROOM':
          // Handle room leaving logic
          break;
        case 'VOTE':
          // Handle voting logic
          break;
        case 'REVEAL_VOTES':
          // Handle vote revealing logic
          break;
        case 'NEW_STORY':
          // Handle new story logic
          break;
        case 'RESET_VOTES':
          // Handle vote reset logic
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.on('close', function close() {
    console.log('Client disconnected');
  });
});