import { generateRoomId, releaseRoomId, isRoomIdInUse, getActiveRoomCount } from '../utils/roomId';

describe('Room ID utilities', () => {
  afterEach(() => {
    // Clean up for tests
    const activeCount = getActiveRoomCount();
    for (let i = 0; i < activeCount; i++) {
      const id = generateRoomId();
      releaseRoomId(id);
    }
  });

  describe('generateRoomId', () => {
    it('should generate 6-character room ID', () => {
      const roomId = generateRoomId();
      expect(roomId).toHaveLength(6);
      expect(roomId).toMatch(/^[a-f0-9]{6}$/);
    });

    it('should generate unique room IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        const id = generateRoomId();
        expect(ids.has(id)).toBe(false);
        ids.add(id);
      }
    });

    it('should track active room IDs', () => {
      const initialCount = getActiveRoomCount();
      const roomId = generateRoomId();
      
      expect(getActiveRoomCount()).toBe(initialCount + 1);
      expect(isRoomIdInUse(roomId)).toBe(true);
    });
  });

  describe('releaseRoomId', () => {
    it('should release room ID back to available pool', () => {
      const roomId = generateRoomId();
      const initialCount = getActiveRoomCount();
      
      releaseRoomId(roomId);
      
      expect(getActiveRoomCount()).toBe(initialCount - 1);
      expect(isRoomIdInUse(roomId)).toBe(false);
    });

    it('should allow reusing released room ID', () => {
      const roomId1 = generateRoomId();
      releaseRoomId(roomId1);
      
      // Generate many IDs to potentially get the same one back
      const ids = [];
      for (let i = 0; i < 10; i++) {
        ids.push(generateRoomId());
      }
      
      // Clean up
      ids.forEach(id => releaseRoomId(id));
    });
  });

  describe('isRoomIdInUse', () => {
    it('should return true for active room ID', () => {
      const roomId = generateRoomId();
      expect(isRoomIdInUse(roomId)).toBe(true);
    });

    it('should return false for released room ID', () => {
      const roomId = generateRoomId();
      releaseRoomId(roomId);
      expect(isRoomIdInUse(roomId)).toBe(false);
    });

    it('should return false for non-existent room ID', () => {
      expect(isRoomIdInUse('abcdef')).toBe(false);
    });
  });
});