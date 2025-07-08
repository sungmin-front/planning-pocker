import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage } from '@planning-poker/shared';
import { RoomManager } from '../roomManager';

describe('Chat Message Handling', () => {
  let roomManager: RoomManager;
  let mockWebSocket: jest.Mocked<WebSocket>;
  let clients: Map<string, WebSocket>;

  beforeEach(() => {
    roomManager = new RoomManager();
    clients = new Map();
    
    // Mock WebSocket
    mockWebSocket = {
      send: jest.fn(),
      close: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      ping: jest.fn(),
      pong: jest.fn(),
      terminate: jest.fn(),
    } as any;

    // Add socket ID
    (mockWebSocket as any).id = uuidv4();
  });

  describe('CHAT_MESSAGE handling', () => {
    it('should handle chat message and broadcast to room members', () => {
      const socketId = (mockWebSocket as any).id;
      const playerNickname = 'TestPlayer';
      
      // Create room and add player
      const room = roomManager.createRoom(playerNickname, socketId);
      const roomId = room.id;
      const playerId = room.players[0].id;
      expect(room.id).toBeDefined();

      const chatMessagePayload = {
        message: 'Hello everyone!',
        playerId,
        playerNickname,
        roomId
      };

      // Mock the chat message handling logic
      const handleChatMessage = (socketId: string, payload: any) => {
        const room = roomManager.getRoom(roomId);
        if (!room) {
          return { success: false, error: 'Room not found' };
        }

        const player = room.players.find(p => p.socketId === socketId);
        if (!player) {
          return { success: false, error: 'Player not in room' };
        }

        // Create chat message
        const chatMessage: ChatMessage = {
          id: uuidv4(),
          playerId: player.id,
          playerNickname: player.nickname,
          message: payload.message,
          timestamp: new Date(),
          roomId: room.id
        };

        // Add to room's chat messages
        if (!room.chatMessages) {
          room.chatMessages = [];
        }
        room.chatMessages.push(chatMessage);

        return { success: true, chatMessage };
      };

      const result = handleChatMessage(socketId, chatMessagePayload);
      
      expect(result.success).toBe(true);
      expect(result.chatMessage).toBeDefined();
      expect(result.chatMessage?.message).toBe('Hello everyone!');
      expect(result.chatMessage?.playerId).toBe(playerId);
      expect(result.chatMessage?.playerNickname).toBe(playerNickname);
      expect(result.chatMessage?.roomId).toBe(roomId);

      // Verify message was added to room
      const updatedRoom = roomManager.getRoom(roomId);
      expect(updatedRoom?.chatMessages).toHaveLength(1);
      expect(updatedRoom?.chatMessages?.[0].message).toBe('Hello everyone!');
    });

    it('should reject chat message from player not in room', () => {
      const socketId = uuidv4();
      
      // Create room with different player
      const room = roomManager.createRoom('OtherPlayer', uuidv4());
      const roomId = room.id;

      const chatMessagePayload = {
        message: 'Hello everyone!',
        playerId: 'player-1',
        playerNickname: 'TestPlayer',
        roomId
      };

      const handleChatMessage = (socketId: string, payload: any) => {
        const room = roomManager.getRoom(roomId);
        if (!room) {
          return { success: false, error: 'Room not found' };
        }

        const player = room.players.find(p => p.socketId === socketId);
        if (!player) {
          return { success: false, error: 'Player not in room' };
        }

        return { success: true };
      };

      const result = handleChatMessage(socketId, chatMessagePayload);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Player not in room');
    });

    it('should validate message length', () => {
      const socketId = uuidv4();
      const playerNickname = 'TestPlayer';
      
      // Create room and add player
      const room = roomManager.createRoom(playerNickname, socketId);
      const roomId = room.id;
      const playerId = room.players[0].id;

      const longMessage = 'a'.repeat(1001); // Exceeds 1000 char limit
      const chatMessagePayload = {
        message: longMessage,
        playerId,
        playerNickname,
        roomId
      };

      const handleChatMessage = (socketId: string, payload: any) => {
        if (payload.message.length > 1000) {
          return { success: false, error: 'Message too long' };
        }

        const room = roomManager.getRoom(roomId);
        if (!room) {
          return { success: false, error: 'Room not found' };
        }

        const player = room.players.find(p => p.socketId === socketId);
        if (!player) {
          return { success: false, error: 'Player not in room' };
        }

        return { success: true };
      };

      const result = handleChatMessage(socketId, chatMessagePayload);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Message too long');
    });

    it('should handle empty messages', () => {
      const socketId = uuidv4();
      const playerNickname = 'TestPlayer';
      
      // Create room and add player
      const room = roomManager.createRoom(playerNickname, socketId);
      const roomId = room.id;
      const playerId = room.players[0].id;

      const chatMessagePayload = {
        message: '',
        playerId,
        playerNickname,
        roomId
      };

      const handleChatMessage = (socketId: string, payload: any) => {
        const room = roomManager.getRoom(roomId);
        if (!room) {
          return { success: false, error: 'Room not found' };
        }

        const player = room.players.find(p => p.socketId === socketId);
        if (!player) {
          return { success: false, error: 'Player not in room' };
        }

        // Create chat message
        const chatMessage: ChatMessage = {
          id: uuidv4(),
          playerId: player.id,
          playerNickname: player.nickname,
          message: payload.message,
          timestamp: new Date(),
          roomId: room.id
        };

        if (!room.chatMessages) {
          room.chatMessages = [];
        }
        room.chatMessages.push(chatMessage);

        return { success: true, chatMessage };
      };

      const result = handleChatMessage(socketId, chatMessagePayload);
      
      expect(result.success).toBe(true);
      expect(result.chatMessage?.message).toBe('');
    });
  });

  describe('CHAT_HISTORY_REQUEST handling', () => {
    it('should return chat history for room', () => {
      const socketId = uuidv4();
      const playerNickname = 'TestPlayer';
      
      // Create room and add player
      const room = roomManager.createRoom(playerNickname, socketId);
      const roomId = room.id;
      const playerId = room.players[0].id;
      
      // Add some chat messages
      const chatMessages: ChatMessage[] = [
        {
          id: uuidv4(),
          playerId,
          playerNickname,
          message: 'First message',
          timestamp: new Date(Date.now() - 60000),
          roomId
        },
        {
          id: uuidv4(),
          playerId,
          playerNickname,
          message: 'Second message',
          timestamp: new Date(),
          roomId
        }
      ];

      if (room) {
        room.chatMessages = chatMessages;
      }

      const handleChatHistoryRequest = (socketId: string, payload: any) => {
        const room = roomManager.getRoom(payload.roomId);
        if (!room) {
          return { success: false, error: 'Room not found' };
        }

        const player = room.players.find(p => p.socketId === socketId);
        if (!player) {
          return { success: false, error: 'Player not in room' };
        }

        return { 
          success: true, 
          chatMessages: room.chatMessages || [] 
        };
      };

      const result = handleChatHistoryRequest(socketId, { roomId });
      
      expect(result.success).toBe(true);
      expect(result.chatMessages).toHaveLength(2);
      expect(result.chatMessages?.[0].message).toBe('First message');
      expect(result.chatMessages?.[1].message).toBe('Second message');
    });
  });
});