import React, { createContext, useContext, useEffect, useState } from 'react';
import { RoomContextType, Room, Player, VoteValue } from '@/types';
import { useWebSocket } from './WebSocketContext';
import { useToast } from '@/hooks/use-toast';

const RoomContext = createContext<RoomContextType | null>(null);

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
};

interface RoomProviderProps {
  children: React.ReactNode;
}

export const RoomProvider: React.FC<RoomProviderProps> = ({ children }) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isHost, setIsHost] = useState(false);
  
  const { socket, sendMessage, isConnected } = useWebSocket();
  const { toast } = useToast();

  // Listen for WebSocket messages
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'room:state':
            setRoom(message.payload);
            setIsHost(message.payload.isHost);
            setCurrentPlayer({
              id: message.payload.myId,
              nickname: message.payload.myNickname,
              socketId: '',
              isHost: message.payload.isHost,
              isSpectator: false
            });
            break;
            
          case 'room:updated':
            setRoom(message.payload);
            break;
            
          case 'room:hostChanged':
            toast({
              title: "Host Changed",
              description: `${message.payload.newHostNickname} is now the host`,
            });
            break;
            
          case 'story:votesRevealed':
            if (room) {
              const updatedRoom = { ...room };
              const story = updatedRoom.stories.find(s => s.id === message.payload.storyId);
              if (story) {
                story.status = 'revealed';
                story.votes = message.payload.votes;
              }
              setRoom(updatedRoom);
            }
            break;
            
          case 'story:updated':
            if (room) {
              const updatedRoom = { ...room };
              const story = updatedRoom.stories.find(s => s.id === message.payload.storyId);
              if (story) {
                if (message.payload.final_point !== undefined) {
                  story.final_point = message.payload.final_point;
                }
                if (message.payload.status) {
                  story.status = message.payload.status;
                }
              }
              setRoom(updatedRoom);
            }
            break;
            
          case 'player:voted':
            toast({
              title: "Vote Submitted",
              description: "A player has voted",
            });
            break;
            
          default:
            console.log('Unhandled message type:', message.type);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    socket.addEventListener('message', handleMessage);
    return () => socket.removeEventListener('message', handleMessage);
  }, [socket, room, toast]);

  const joinRoom = async (roomId: string, nickname: string): Promise<boolean> => {
    if (!isConnected) {
      toast({
        title: "Connection Error",
        description: "Please connect to the server first",
        variant: "destructive",
      });
      return false;
    }

    sendMessage({
      type: 'JOIN_ROOM',
      payload: { roomId, nickname }
    });

    // In a real implementation, you'd wait for a response
    return true;
  };

  const leaveRoom = () => {
    if (room) {
      sendMessage({
        type: 'LEAVE_ROOM',
        payload: { roomId: room.id }
      });
    }
    setRoom(null);
    setCurrentPlayer(null);
    setIsHost(false);
  };

  const createStory = (title: string, description?: string) => {
    if (!room) return;
    
    sendMessage({
      type: 'NEW_STORY',
      payload: { title, description }
    });
  };

  const vote = (storyId: string, vote: VoteValue) => {
    if (!room) return;
    
    sendMessage({
      type: 'STORY_VOTE',
      payload: { storyId, point: vote }
    });
  };

  const revealVotes = (storyId: string) => {
    if (!room || !isHost) return;
    
    sendMessage({
      type: 'STORY_REVEAL_VOTES',
      payload: { storyId }
    });
  };

  const restartVoting = (storyId: string) => {
    if (!room || !isHost) return;
    
    sendMessage({
      type: 'STORY_RESTART_VOTING',
      payload: { storyId }
    });
  };

  const setFinalPoint = (storyId: string, point: VoteValue) => {
    if (!room || !isHost) return;
    
    sendMessage({
      type: 'STORY_SET_FINAL_POINT',
      payload: { storyId, point }
    });
  };

  const transferHost = (toNickname: string) => {
    if (!room || !isHost) return;
    
    sendMessage({
      type: 'ROOM_TRANSFER_HOST',
      payload: { toNickname }
    });
  };

  const syncRoom = () => {
    if (!room) return;
    
    sendMessage({
      type: 'ROOM_SYNC',
      payload: {}
    });
  };

  const value: RoomContextType = {
    room,
    currentPlayer,
    isHost,
    joinRoom,
    leaveRoom,
    createStory,
    vote,
    revealVotes,
    restartVoting,
    setFinalPoint,
    transferHost,
    syncRoom,
  };

  return (
    <RoomContext.Provider value={value}>
      {children}
    </RoomContext.Provider>
  );
};