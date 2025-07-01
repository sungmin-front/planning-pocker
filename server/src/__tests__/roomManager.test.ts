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

    describe('setFinalPoint', () => {
      beforeEach(() => {
        roomManager.vote('socket-1', storyId, '5' as VoteValue);
        roomManager.vote('socket-2', storyId, '8' as VoteValue);
        roomManager.revealVotes('socket-1', storyId);
      });

      it('should allow host to set final point for story', () => {
        const result = roomManager.setFinalPoint('socket-1', storyId, '8' as VoteValue);
        
        expect(result.success).toBe(true);
        expect(result.story?.final_point).toBe('8');
        expect(result.story?.status).toBe('closed');
      });

      it('should reject non-host attempting to set final point', () => {
        const result = roomManager.setFinalPoint('socket-2', storyId, '8' as VoteValue);
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('Only the host can set final points');
      });

      it('should reject setting final point for non-existent story', () => {
        const result = roomManager.setFinalPoint('socket-1', 'invalid-story', '8' as VoteValue);
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('Story not found');
      });

      it('should reject setting final point when not in a room', () => {
        const result = roomManager.setFinalPoint('invalid-socket', storyId, '8' as VoteValue);
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('Not in a room');
      });

      it('should allow host to override voting results with different point', () => {
        // Most votes are for '5', but host can set it to '13'
        const result = roomManager.setFinalPoint('socket-1', storyId, '13' as VoteValue);
        
        expect(result.success).toBe(true);
        expect(result.story?.final_point).toBe('13');
        expect(result.story?.status).toBe('closed');
        
        // Original votes should still be preserved
        expect(result.story?.votes).toBeDefined();
        expect(Object.keys(result.story?.votes || {}).length).toBeGreaterThan(0);
      });
    });
  });

  describe('host reassignment', () => {
    describe('transferHost', () => {
      let roomId: string;

      beforeEach(() => {
        const room = roomManager.createRoom('Alice', 'socket-1');
        roomManager.joinRoom(room.id, 'Bob', 'socket-2');
        roomManager.joinRoom(room.id, 'Charlie', 'socket-3');
        roomId = room.id;
      });

      it('should allow host to transfer role to another player', () => {
        const result = roomManager.transferHost('socket-1', 'Bob');
        
        expect(result.success).toBe(true);
        expect(result.newHost?.nickname).toBe('Bob');
        expect(result.newHost?.isHost).toBe(true);
        expect(result.oldHost?.nickname).toBe('Alice');
        expect(result.oldHost?.isHost).toBe(false);
      });

      it('should reject non-host attempting to transfer role', () => {
        const result = roomManager.transferHost('socket-2', 'Charlie');
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('Only the host can transfer host role');
      });

      it('should reject transfer to non-existent player', () => {
        const result = roomManager.transferHost('socket-1', 'Dave');
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('Target player not found');
      });

      it('should reject transfer to self', () => {
        const result = roomManager.transferHost('socket-1', 'Alice');
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('Cannot transfer host role to yourself');
      });

      it('should reject transfer when not in room', () => {
        const result = roomManager.transferHost('invalid-socket', 'Bob');
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('Not in a room');
      });
    });

    describe('automatic host reassignment on disconnect', () => {
      it('should automatically assign new host when host disconnects', () => {
        const room = roomManager.createRoom('Alice', 'socket-1');
        roomManager.joinRoom(room.id, 'Bob', 'socket-2');
        roomManager.joinRoom(room.id, 'Charlie', 'socket-3');
        
        const result = roomManager.removePlayer('socket-1');
        
        expect(result.hostChanged).toBe(true);
        expect(result.newHost?.nickname).toBe('Bob'); // First remaining player
        expect(result.newHost?.isHost).toBe(true);
        
        const updatedRoom = roomManager.getRoom(room.id);
        expect(updatedRoom?.players).toHaveLength(2);
        expect(updatedRoom?.players.find(p => p.isHost)?.nickname).toBe('Bob');
      });

      it('should not change host when non-host disconnects', () => {
        const room = roomManager.createRoom('Alice', 'socket-1');
        roomManager.joinRoom(room.id, 'Bob', 'socket-2');
        roomManager.joinRoom(room.id, 'Charlie', 'socket-3');
        
        const result = roomManager.removePlayer('socket-2');
        
        expect(result.hostChanged).toBe(false);
        expect(result.newHost).toBeUndefined();
        
        const updatedRoom = roomManager.getRoom(room.id);
        expect(updatedRoom?.players).toHaveLength(2);
        expect(updatedRoom?.players.find(p => p.isHost)?.nickname).toBe('Alice');
      });

      it('should clean up room when last player (host) disconnects', () => {
        const room = roomManager.createRoom('Alice', 'socket-1');
        const roomId = room.id;
        
        const result = roomManager.removePlayer('socket-1');
        
        expect(result.roomId).toBe(roomId);
        expect(result.hostChanged).toBeUndefined();
        expect(result.newHost).toBeUndefined();
        expect(roomManager.getRoom(roomId)).toBeUndefined();
      });
    });
  });

  describe('room sync functionality', () => {
    let roomId: string;
    let storyId: string;

    beforeEach(() => {
      const room = roomManager.createRoom('Alice', 'socket-1');
      roomManager.joinRoom(room.id, 'Bob', 'socket-2');
      roomId = room.id;
      
      const story = roomManager.addStory(roomId, 'Test Story', 'Description');
      storyId = story!.id;
      
      // Add some votes for testing
      roomManager.vote('socket-1', storyId, '5' as VoteValue);
      roomManager.vote('socket-2', storyId, '8' as VoteValue);
    });

    describe('syncRoom', () => {
      it('should return full room state for valid player', () => {
        const result = roomManager.syncRoom('socket-1');
        
        expect(result.success).toBe(true);
        expect(result.playerState).toBeDefined();
        expect(result.roomState).toBeDefined();
        
        // Check player-specific data
        expect(result.playerState?.currentPlayer?.isHost).toBe(true);
        expect(result.playerState?.currentPlayer?.nickname).toBe('Alice');
        expect(result.playerState?.currentPlayer?.id).toBeDefined();
        
        // Check room data
        expect(result.playerState?.room?.id).toBe(roomId);
        expect(result.playerState?.room?.players).toHaveLength(2);
        expect(result.playerState?.room?.stories).toHaveLength(1);
      });

      it('should return correct host status for non-host player', () => {
        const result = roomManager.syncRoom('socket-2');
        
        expect(result.success).toBe(true);
        expect(result.playerState?.currentPlayer?.isHost).toBe(false);
        expect(result.playerState?.currentPlayer?.nickname).toBe('Bob');
      });

      it('should reject sync for player not in room', () => {
        const result = roomManager.syncRoom('invalid-socket');
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('Not in a room');
      });

      it('should reject sync for non-existent room', () => {
        // Remove player first to simulate room not found
        roomManager.removePlayer('socket-1');
        roomManager.removePlayer('socket-2');
        
        const result = roomManager.syncRoom('socket-1');
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('Not in a room');
      });

      it('should include current voting status in sync', () => {
        const result = roomManager.syncRoom('socket-1');
        
        expect(result.success).toBe(true);
        expect(result.playerState?.room?.stories[0].status).toBe('voting');
        expect(result.playerState?.room?.stories[0].votes).toBeDefined();
      });

      it('should include revealed votes after host reveals', () => {
        roomManager.revealVotes('socket-1', storyId);
        const result = roomManager.syncRoom('socket-2');
        
        expect(result.success).toBe(true);
        expect(result.playerState?.room?.stories[0].status).toBe('revealed');
        expect(Object.keys(result.playerState?.room?.stories[0].votes || {})).toHaveLength(2);
      });

      it('should include final point after host sets it', () => {
        roomManager.revealVotes('socket-1', storyId);
        roomManager.setFinalPoint('socket-1', storyId, '13' as VoteValue);
        
        const result = roomManager.syncRoom('socket-2');
        
        expect(result.success).toBe(true);
        expect(result.playerState?.room?.stories[0].status).toBe('closed');
        expect(result.playerState?.room?.stories[0].final_point).toBe('13');
      });
    });
  });

  describe('voluntary leave scenarios', () => {
    describe('host leaves voluntarily', () => {
      it('should reassign host when original host leaves voluntarily', () => {
        const room = roomManager.createRoom('Alice', 'socket-1');
        roomManager.joinRoom(room.id, 'Bob', 'socket-2');
        roomManager.joinRoom(room.id, 'Charlie', 'socket-3');
        
        // Simulate voluntary leave (same as disconnect, but initiated by user)
        const result = roomManager.removePlayer('socket-1');
        
        expect(result.hostChanged).toBe(true);
        expect(result.newHost?.nickname).toBe('Bob');
        expect(result.newHost?.isHost).toBe(true);
        expect(result.roomId).toBe(room.id);
        
        const updatedRoom = roomManager.getRoom(room.id);
        expect(updatedRoom?.players).toHaveLength(2);
        expect(updatedRoom?.players.find(p => p.isHost)?.nickname).toBe('Bob');
        expect(updatedRoom?.players.find(p => p.nickname === 'Alice')).toBeUndefined();
      });

      it('should handle host leaving with ongoing voting', () => {
        const room = roomManager.createRoom('Alice', 'socket-1');
        roomManager.joinRoom(room.id, 'Bob', 'socket-2');
        
        // Add story and start voting
        const story = roomManager.addStory(room.id, 'Test Story', 'Description', 'socket-1');
        roomManager.selectStory(room.id, story!.id, 'socket-1');
        roomManager.vote('socket-1', story!.id, '5' as VoteValue);
        roomManager.vote('socket-2', story!.id, '8' as VoteValue);
        
        // Host leaves during voting
        const result = roomManager.removePlayer('socket-1');
        
        expect(result.hostChanged).toBe(true);
        expect(result.newHost?.nickname).toBe('Bob');
        
        const updatedRoom = roomManager.getRoom(room.id);
        expect(updatedRoom?.stories[0].status).toBe('voting');
        expect(updatedRoom?.currentStoryId).toBe(story!.id);
        
        // Bob should now be able to reveal votes as new host
        const revealResult = roomManager.revealVotes('socket-2', story!.id);
        expect(revealResult.success).toBe(true);
      });
    });

    describe('non-host leaves voluntarily', () => {
      it('should remove player without host change when non-host leaves', () => {
        const room = roomManager.createRoom('Alice', 'socket-1');
        roomManager.joinRoom(room.id, 'Bob', 'socket-2');
        roomManager.joinRoom(room.id, 'Charlie', 'socket-3');
        
        const result = roomManager.removePlayer('socket-2');
        
        expect(result.hostChanged).toBe(false);
        expect(result.newHost).toBeUndefined();
        expect(result.roomId).toBe(room.id);
        
        const updatedRoom = roomManager.getRoom(room.id);
        expect(updatedRoom?.players).toHaveLength(2);
        expect(updatedRoom?.players.find(p => p.isHost)?.nickname).toBe('Alice');
        expect(updatedRoom?.players.find(p => p.nickname === 'Bob')).toBeUndefined();
      });

      it('should preserve voting state when non-host leaves during voting', () => {
        const room = roomManager.createRoom('Alice', 'socket-1');
        roomManager.joinRoom(room.id, 'Bob', 'socket-2');
        roomManager.joinRoom(room.id, 'Charlie', 'socket-3');
        
        // Add story and start voting
        const story = roomManager.addStory(room.id, 'Test Story', 'Description', 'socket-1');
        roomManager.selectStory(room.id, story!.id, 'socket-1');
        roomManager.vote('socket-1', story!.id, '5' as VoteValue);
        roomManager.vote('socket-2', story!.id, '8' as VoteValue);
        roomManager.vote('socket-3', story!.id, '13' as VoteValue);
        
        // Non-host Bob leaves during voting
        roomManager.removePlayer('socket-2');
        
        const updatedRoom = roomManager.getRoom(room.id);
        expect(updatedRoom?.stories[0].status).toBe('voting');
        expect(updatedRoom?.currentStoryId).toBe(story!.id);
        
        // Bob's vote should be removed from ongoing voting
        expect(updatedRoom?.stories[0].votes).toBeDefined();
        const votes = updatedRoom?.stories[0].votes || {};
        const playerIds = updatedRoom?.players.map(p => p.id) || [];
        
        // Only Alice and Charlie's votes should remain
        expect(Object.keys(votes).length).toBe(2);
        expect(Object.keys(votes).every(voterId => playerIds.includes(voterId))).toBe(true);
      });

      it('should preserve completed votes when player leaves after voting is done', () => {
        const room = roomManager.createRoom('Alice', 'socket-1');
        roomManager.joinRoom(room.id, 'Bob', 'socket-2');
        roomManager.joinRoom(room.id, 'Charlie', 'socket-3');
        
        // Add story and complete voting cycle
        const story = roomManager.addStory(room.id, 'Test Story', 'Description', 'socket-1');
        roomManager.selectStory(room.id, story!.id, 'socket-1');
        roomManager.vote('socket-1', story!.id, '5' as VoteValue);
        roomManager.vote('socket-2', story!.id, '8' as VoteValue);
        roomManager.vote('socket-3', story!.id, '13' as VoteValue);
        
        // Complete the voting process
        roomManager.revealVotes('socket-1', story!.id);
        roomManager.setFinalPoint('socket-1', story!.id, '8' as VoteValue);
        
        // Bob leaves after voting is complete
        roomManager.removePlayer('socket-2');
        
        const updatedRoom = roomManager.getRoom(room.id);
        expect(updatedRoom?.stories[0].status).toBe('closed');
        
        // All original votes should be preserved for historical record
        expect(updatedRoom?.stories[0].votes).toBeDefined();
        const votes = updatedRoom?.stories[0].votes || {};
        expect(Object.keys(votes).length).toBe(3); // All 3 votes preserved
        expect(updatedRoom?.stories[0].final_point).toBe('8');
      });
    });

    describe('edge cases for voluntary leave', () => {
      it('should handle single player leaving (room cleanup)', () => {
        const room = roomManager.createRoom('Alice', 'socket-1');
        const roomId = room.id;
        
        const result = roomManager.removePlayer('socket-1');
        
        expect(result.roomId).toBe(roomId);
        expect(result.hostChanged).toBeUndefined();
        expect(result.newHost).toBeUndefined();
        expect(roomManager.getRoom(roomId)).toBeUndefined();
        expect(roomManager.getUserRoom('socket-1')).toBeUndefined();
      });

      it('should handle multiple players leaving in sequence', () => {
        const room = roomManager.createRoom('Alice', 'socket-1');
        roomManager.joinRoom(room.id, 'Bob', 'socket-2');
        roomManager.joinRoom(room.id, 'Charlie', 'socket-3');
        roomManager.joinRoom(room.id, 'Dave', 'socket-4');
        
        // Non-host leaves first
        let result = roomManager.removePlayer('socket-2');
        expect(result.hostChanged).toBe(false);
        expect(roomManager.getRoom(room.id)?.players).toHaveLength(3);
        
        // Host leaves next
        result = roomManager.removePlayer('socket-1');
        expect(result.hostChanged).toBe(true);
        expect(result.newHost?.nickname).toBe('Charlie');
        expect(roomManager.getRoom(room.id)?.players).toHaveLength(2);
        
        // Another player leaves
        result = roomManager.removePlayer('socket-4');
        expect(result.hostChanged).toBe(false);
        expect(roomManager.getRoom(room.id)?.players).toHaveLength(1);
        
        // Last player leaves (room cleanup)
        result = roomManager.removePlayer('socket-3');
        expect(roomManager.getRoom(room.id)).toBeUndefined();
      });

      it('should handle player leaving non-existent room gracefully', () => {
        const result = roomManager.removePlayer('invalid-socket');
        
        expect(result.roomId).toBeUndefined();
        expect(result.hostChanged).toBeUndefined();
        expect(result.newHost).toBeUndefined();
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