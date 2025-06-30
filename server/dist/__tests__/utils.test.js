"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const roomId_1 = require("../utils/roomId");
describe('Room ID utilities', () => {
    afterEach(() => {
        // Clean up for tests
        const activeCount = (0, roomId_1.getActiveRoomCount)();
        for (let i = 0; i < activeCount; i++) {
            const id = (0, roomId_1.generateRoomId)();
            (0, roomId_1.releaseRoomId)(id);
        }
    });
    describe('generateRoomId', () => {
        it('should generate 6-character room ID', () => {
            const roomId = (0, roomId_1.generateRoomId)();
            expect(roomId).toHaveLength(6);
            expect(roomId).toMatch(/^[a-f0-9]{6}$/);
        });
        it('should generate unique room IDs', () => {
            const ids = new Set();
            for (let i = 0; i < 100; i++) {
                const id = (0, roomId_1.generateRoomId)();
                expect(ids.has(id)).toBe(false);
                ids.add(id);
            }
        });
        it('should track active room IDs', () => {
            const initialCount = (0, roomId_1.getActiveRoomCount)();
            const roomId = (0, roomId_1.generateRoomId)();
            expect((0, roomId_1.getActiveRoomCount)()).toBe(initialCount + 1);
            expect((0, roomId_1.isRoomIdInUse)(roomId)).toBe(true);
        });
    });
    describe('releaseRoomId', () => {
        it('should release room ID back to available pool', () => {
            const roomId = (0, roomId_1.generateRoomId)();
            const initialCount = (0, roomId_1.getActiveRoomCount)();
            (0, roomId_1.releaseRoomId)(roomId);
            expect((0, roomId_1.getActiveRoomCount)()).toBe(initialCount - 1);
            expect((0, roomId_1.isRoomIdInUse)(roomId)).toBe(false);
        });
        it('should allow reusing released room ID', () => {
            const roomId1 = (0, roomId_1.generateRoomId)();
            (0, roomId_1.releaseRoomId)(roomId1);
            // Generate many IDs to potentially get the same one back
            const ids = [];
            for (let i = 0; i < 10; i++) {
                ids.push((0, roomId_1.generateRoomId)());
            }
            // Clean up
            ids.forEach(id => (0, roomId_1.releaseRoomId)(id));
        });
    });
    describe('isRoomIdInUse', () => {
        it('should return true for active room ID', () => {
            const roomId = (0, roomId_1.generateRoomId)();
            expect((0, roomId_1.isRoomIdInUse)(roomId)).toBe(true);
        });
        it('should return false for released room ID', () => {
            const roomId = (0, roomId_1.generateRoomId)();
            (0, roomId_1.releaseRoomId)(roomId);
            expect((0, roomId_1.isRoomIdInUse)(roomId)).toBe(false);
        });
        it('should return false for non-existent room ID', () => {
            expect((0, roomId_1.isRoomIdInUse)('abcdef')).toBe(false);
        });
    });
});
//# sourceMappingURL=utils.test.js.map