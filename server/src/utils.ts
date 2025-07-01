const generatedRoomIds = new Set<string>();

export function generateRoomId(): string {
  let roomId: string;
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

export function releaseRoomId(roomId: string): void {
  generatedRoomIds.delete(roomId);
}