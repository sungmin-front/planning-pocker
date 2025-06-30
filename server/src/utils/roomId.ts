import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const existingRoomIds = new Set<string>();

/**
 * Generates a unique 6-character room ID using SHA-256 hash of UUID + timestamp
 * @returns A unique 6-character room ID
 */
export function generateRoomId(): string {
  let shortId: string;
  do {
    const uuid = uuidv4();
    const timestamp = Date.now().toString();
    const hash = createHash('sha256')
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
export function releaseRoomId(roomId: string): void {
  existingRoomIds.delete(roomId);
}

/**
 * Checks if a room ID is currently in use
 * @param roomId The room ID to check
 * @returns True if the room ID is in use
 */
export function isRoomIdInUse(roomId: string): boolean {
  return existingRoomIds.has(roomId);
}

/**
 * Gets the count of currently active room IDs
 * @returns Number of active room IDs
 */
export function getActiveRoomCount(): number {
  return existingRoomIds.size;
}