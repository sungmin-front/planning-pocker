import { RoomManager } from '../roomManager';
import { VoteValue } from '@planning-poker/shared';

describe('RoomManager', () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  describe('createRoom', () => {
    it('should create a room with host player', () => {
      const room = roomManager.createRoom('Alice', 'socket-1');
      
      expect(room).toBeDefined();
      expect(room.id).toHaveLength(6);
      expect(room.name).toBe("Alice's Room");
      expect(room.players).toHaveLength(1);
      expect(room.players[0].nickname).toBe('Alice');
      expect(room.players[0].isHost).toBe(true);
      expect(room.stories).toHaveLength(0);
    });
  });

  describe('joinRoom', () => {
    it('should allow player to join existing room', () => {
      const room = roomManager.createRoom('Alice', 'socket-1');
      const result = roomManager.joinRoom(room.id, 'Bob', 'socket-2');
      
      expect(result.success).toBe(true);
      expect(result.room?.players).toHaveLength(2);
      expect(result.room?.players[1].nickname).toBe('Bob');
      expect(result.room?.players[1].isHost).toBe(false);
    });

    it('should reject joining non-existent room', () => {
      const result = roomManager.joinRoom('invalid', 'Bob', 'socket-2');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Room not found');
    });

    it('should reject duplicate nicknames', () => {
      const room = roomManager.createRoom('Alice', 'socket-1');
      const result = roomManager.joinRoom(room.id, 'Alice', 'socket-2');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Nickname already taken');
    });
  });

  describe('voting functionality', () => {
    let roomId: string;
    let storyId: string;

    beforeEach(() => {
      const room = roomManager.createRoom('Alice', 'socket-1');
      roomManager.joinRoom(room.id, 'Bob', 'socket-2');
      roomId = room.id;
      
      const story = roomManager.addStory(roomId, 'Test Story', 'Description');
      storyId = story!.id;
    });

    describe('vote', () => {
      it('should allow player to vote on story', () => {
        const result = roomManager.vote('socket-1', storyId, '5' as VoteValue);
        
        expect(result.success).toBe(true);
        
        const room = roomManager.getRoom(roomId);
        const story = room?.stories.find(s => s.id === storyId);
        expect(story?.status).toBe('voting');
        expect(story?.votes).toBeDefined();
      });

      it('should reject vote from player not in room', () => {
        const result = roomManager.vote('invalid-socket', storyId, '5' as VoteValue);
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('Not in a room');
      });

      it('should reject vote on non-existent story', () => {
        const result = roomManager.vote('socket-1', 'invalid-story', '5' as VoteValue);
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('Story not found');
      });

      it('should reject vote on closed story', () => {
        const room = roomManager.getRoom(roomId);
        const story = room?.stories.find(s => s.id === storyId);
        if (story) story.status = 'closed';

        const result = roomManager.vote('socket-1', storyId, '5' as VoteValue);
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('Voting not allowed for this story');
      });
    });

    describe('revealVotes', () => {
      beforeEach(() => {
        roomManager.vote('socket-1', storyId, '5' as VoteValue);
        roomManager.vote('socket-2', storyId, '8' as VoteValue);
      });

      it('should allow host to reveal votes', () => {
        const result = roomManager.revealVotes('socket-1', storyId);
        
        expect(result.success).toBe(true);
        expect(result.story?.status).toBe('revealed');
      });

      it('should reject non-host attempting to reveal votes', () => {
        const result = roomManager.revealVotes('socket-2', storyId);
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('Only the host can reveal votes');
      });

      it('should reject reveal on non-existent story', () => {
        const result = roomManager.revealVotes('socket-1', 'invalid-story');
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('Story not found');
      });
    });

    describe('restartVoting', () => {
      beforeEach(() => {
        roomManager.vote('socket-1', storyId, '5' as VoteValue);
        roomManager.vote('socket-2', storyId, '8' as VoteValue);
        roomManager.revealVotes('socket-1', storyId);
      });

      it('should allow host to restart voting', () => {
        const result = roomManager.restartVoting('socket-1', storyId);
        
        expect(result.success).toBe(true);
        expect(result.story?.status).toBe('voting');
        expect(result.story?.votes).toEqual({});
      });

      it('should reject non-host attempting to restart voting', () => {
        const result = roomManager.restartVoting('socket-2', storyId);
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('Only the host can restart voting');
      });
    });
  });

  describe('room cleanup', () => {
    it('should remove player and clean up empty room', () => {
      const room = roomManager.createRoom('Alice', 'socket-1');
      const roomId = room.id;
      
      roomManager.removePlayer('socket-1');
      
      expect(roomManager.getRoom(roomId)).toBeUndefined();
      expect(roomManager.getUserRoom('socket-1')).toBeUndefined();
    });

    it('should keep room alive when other players remain', () => {
      const room = roomManager.createRoom('Alice', 'socket-1');
      roomManager.joinRoom(room.id, 'Bob', 'socket-2');
      
      roomManager.removePlayer('socket-1');
      
      expect(roomManager.getRoom(room.id)).toBeDefined();
      expect(roomManager.getRoom(room.id)?.players).toHaveLength(1);
    });
  });
});