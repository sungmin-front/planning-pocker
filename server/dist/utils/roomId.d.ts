/**
 * Generates a unique 6-character room ID using SHA-256 hash of UUID + timestamp
 * @returns A unique 6-character room ID
 */
export declare function generateRoomId(): string;
/**
 * Releases a room ID back to the available pool
 * @param roomId The room ID to release
 */
export declare function releaseRoomId(roomId: string): void;
/**
 * Checks if a room ID is currently in use
 * @param roomId The room ID to check
 * @returns True if the room ID is in use
 */
export declare function isRoomIdInUse(roomId: string): boolean;
/**
 * Gets the count of currently active room IDs
 * @returns Number of active room IDs
 */
export declare function getActiveRoomCount(): number;
