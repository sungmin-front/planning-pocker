import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [joinError, setJoinError] = useState<string | null>(null);
  const [nicknameSuggestions, setNicknameSuggestions] = useState<string[]>([]);
  
  const { send, on, off, isConnected } = useWebSocket();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Listen for WebSocket messages
  useEffect(() => {
    const handleMessage = (message: any) => {
      switch (message.type) {
        case 'JOIN_ROOM':
          setRoom(message.payload.room);
          setCurrentPlayer(message.payload.player);
          setIsHost(message.payload.player.isHost);
          break;
          
        case 'room:created':
          setRoom(message.payload.room);
          if (message.payload.player) {
            setCurrentPlayer(message.payload.player);
            setIsHost(message.payload.player.isHost);
          }
          // Navigate to the created room
          navigate(`/room/${message.payload.room.id}`);
          break;
          
        case 'room:joined':
          setRoom(message.payload.room);
          setJoinError(null);
          setNicknameSuggestions([]);
          // The server should tell us which player we are
          if (message.payload.player) {
            setCurrentPlayer(message.payload.player);
            setIsHost(message.payload.player.isHost);
          }
          
          toast({
            title: "Room Joined",
            description: `Successfully joined ${message.payload.room.name}`,
          });
          
          // Navigate to the joined room
          navigate(`/room/${message.payload.room.id}`);
          break;

        case 'room:joinError':
          const { error, suggestions = [] } = message.payload;
          console.log('Received room:joinError:', { error, suggestions });
          setJoinError(error);
          setNicknameSuggestions(suggestions);
          console.log('Updated state - joinError:', error, 'nicknameSuggestions:', suggestions);
          
          // Don't show toast for nickname conflicts - let the component handle it
          if (!error.includes('already taken')) {
            toast({
              title: "Failed to Join Room",
              description: error,
              variant: "destructive",
            });
          }
          break;
          
          
        case 'ROOM_SYNC':
          setRoom(message.payload.room);
          break;
          
        case 'LEAVE_ROOM':
          setRoom(null);
          setCurrentPlayer(null);
          setIsHost(false);
          break;
          
        case 'room:hostChanged':
          const { newHostId, newHostNickname, oldHostId, oldHostNickname, reason } = message.payload;
          
          // Update isHost state if current player is involved
          // Use callback form to get the current player state
          setCurrentPlayer(currentPlayerState => {
            if (currentPlayerState?.id === newHostId) {
              setIsHost(true);
            } else if (currentPlayerState?.id === oldHostId) {
              setIsHost(false);
            }
            return currentPlayerState; // Don't change the player state
          });
          
          // Show notification
          const reasonText = reason === 'host_disconnected' ? ' (previous host disconnected)' : '';
          toast({
            title: "Host Changed",
            description: `${newHostNickname} is now the host${reasonText}`,
          });
          break;
          
        default:
          // Handle unknown message types gracefully
          break;
      }
    };

    on('message', handleMessage);
    return () => off('message', handleMessage);
  }, [on, off, toast]);

  const createRoom = async (nickname: string): Promise<string | null> => {
    if (!isConnected) {
      toast({
        title: "Connection Error",
        description: "Please connect to the server first",
        variant: "destructive",
      });
      return null;
    }

    send({
      type: 'ROOM_CREATE',
      payload: { nickname }
    });

    // In a real implementation, you'd wait for a response
    return "pending";
  };

  const joinRoom = async (roomId: string, nickname: string): Promise<boolean> => {
    if (!isConnected) {
      toast({
        title: "Connection Error",
        description: "Please connect to the server first",
        variant: "destructive",
      });
      return false;
    }

    send({
      type: 'JOIN_ROOM',
      payload: { roomId, nickname }
    });

    // In a real implementation, you'd wait for a response
    return true;
  };

  const leaveRoom = () => {
    if (room) {
      send({
        type: 'LEAVE_ROOM',
        payload: {}
      });
    }
    setRoom(null);
    setCurrentPlayer(null);
    setIsHost(false);
    navigate('/');
  };

  const createStory = (title: string, description?: string) => {
    if (!room) return;
    
    send({
      type: 'NEW_STORY',
      payload: { title, description }
    });
  };

  const vote = (storyId: string, vote: VoteValue) => {
    if (!room) return;
    
    send({
      type: 'STORY_VOTE',
      payload: { storyId, vote }
    });
  };

  const revealVotes = (storyId: string) => {
    if (!room || !isHost) return;
    
    send({
      type: 'STORY_REVEAL_VOTES',
      payload: { storyId }
    });
  };

  const restartVoting = (storyId: string) => {
    if (!room || !isHost) return;
    
    send({
      type: 'STORY_RESTART_VOTING',
      payload: { storyId }
    });
  };

  const setFinalPoint = (storyId: string, point: VoteValue) => {
    if (!room || !isHost) return;
    
    send({
      type: 'STORY_SET_FINAL_POINT',
      payload: { storyId, point }
    });
  };

  const transferHost = (toNickname: string) => {
    if (!room || !isHost) return;
    
    send({
      type: 'ROOM_TRANSFER_HOST',
      payload: { toNickname }
    });
  };

  const syncRoom = () => {
    if (!room) return;
    
    send({
      type: 'ROOM_SYNC',
      payload: {}
    });
  };

  const clearJoinError = () => {
    setJoinError(null);
    setNicknameSuggestions([]);
  };

  const value: RoomContextType = {
    room,
    currentPlayer,
    isHost,
    joinError,
    nicknameSuggestions,
    createRoom,
    joinRoom,
    leaveRoom,
    createStory,
    vote,
    revealVotes,
    restartVoting,
    setFinalPoint,
    transferHost,
    syncRoom,
    clearJoinError,
  };

  return (
    <RoomContext.Provider value={value}>
      {children}
    </RoomContext.Provider>
  );
};