"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRoomId = generateRoomId;
exports.releaseRoomId = releaseRoomId;
const generatedRoomIds = new Set();
function generateRoomId() {
    let roomId;
    do {
        // Generate 6-character uppercase alphanumeric ID
        roomId = Math.random().toString(36).substring(2, 8).toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (roomId.length < 6) {
            // Pad with random characters if needed
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            while (roomId.length < 6) {
                roomId += chars[Math.floor(Math.random() * chars.length)];
            }
        }
        roomId = roomId.substring(0, 6);
    } while (generatedRoomIds.has(roomId));
    generatedRoomIds.add(roomId);
    return roomId;
}
function releaseRoomId(roomId) {
    generatedRoomIds.delete(roomId);
}
//# sourceMappingURL=utils.js.map