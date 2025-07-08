"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRoomId = generateRoomId;
exports.releaseRoomId = releaseRoomId;
exports.isRoomIdInUse = isRoomIdInUse;
exports.getActiveRoomCount = getActiveRoomCount;
const crypto_1 = require("crypto");
const uuid_1 = require("uuid");
const existingRoomIds = new Set();
/**
 * Generates a unique 6-character room ID using SHA-256 hash of UUID + timestamp
 * @returns A unique 6-character room ID
 */
function generateRoomId() {
    let shortId;
    do {
        const uuid = (0, uuid_1.v4)();
        const timestamp = Date.now().toString();
        const hash = (0, crypto_1.createHash)('sha256')
            .update(uuid + timestamp)
            .digest('hex');
        shortId = hash.slice(0, 6);
    } while (existingRoomIds.has(shortId));
    existingRoomIds.add(shortId);
    return shortId;
}
/**
 * Releases a room ID back to the available pool
 * @param roomId The room ID to release
 */
function releaseRoomId(roomId) {
    existingRoomIds.delete(roomId);
}
/**
 * Checks if a room ID is currently in use
 * @param roomId The room ID to check
 * @returns True if the room ID is in use
 */
function isRoomIdInUse(roomId) {
    return existingRoomIds.has(roomId);
}
/**
 * Gets the count of currently active room IDs
 * @returns Number of active room IDs
 */
function getActiveRoomCount() {
    return existingRoomIds.size;
}
//# sourceMappingURL=roomId.js.map