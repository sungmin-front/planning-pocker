import { Room, Player, Story } from '@planning-poker/shared';

export interface ServerRoom extends Room {
  socketIds: Set<string>;
}

export interface SocketUserMap {
  [socketId: string]: {
    roomId?: string;
    playerId?: string;
  };
}