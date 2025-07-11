import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RoomContextType, Room, Player, VoteValue } from '@/types';
import { useWebSocket } from './WebSocketContext';
import { useToast } from '@/hooks/use-toast';
import { useSessionPersistence } from '@/hooks/useSessionPersistence';

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
  const [isRejoining, setIsRejoining] = useState(false);
  
  // useRef to maintain latest room state for event handlers
  const roomRef = useRef<Room | null>(null);
  
  const { send, on, off, isConnected, getSocketId } = useWebSocket();
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session, hasValidSession, clearSession, saveSession } = useSessionPersistence();

  // Keep roomRef in sync with room state
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  // Handle WebSocket reconnection - rejoin room if we were in one
  useEffect(() => {
    if (isConnected && room && currentPlayer) {
      // WebSocket reconnected and we have room info - rejoin automatically
      console.log('WebSocket reconnected, attempting to rejoin room:', room.id);
      send({
        type: 'JOIN_ROOM',
        payload: { 
          roomId: room.id, 
          nickname: currentPlayer.nickname,
          isSpectator: currentPlayer.isSpectator || false
        }
      });
    }
  }, [isConnected, room?.id, currentPlayer?.nickname, send]);

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
            // Save session after successful room creation
            const currentSocketId = getSocketId();
            saveSession(message.payload.room.id, message.payload.player.nickname, currentSocketId || undefined);
          }
          // Navigate to the created room
          navigate(`/${message.payload.room.id}`);
          
          // Automatically request chat history when creating a room
          setTimeout(() => {
            send({
              type: 'CHAT_HISTORY_REQUEST',
              payload: { roomId: message.payload.room.id }
            });
          }, 100);
          break;
          
        case 'room:joined':
          // Preserve existing chat messages when joining room
          const existingChatMessages = room?.chatMessages || [];
          const newRoom = {
            ...message.payload.room,
            chatMessages: message.payload.room.chatMessages || existingChatMessages
          };
          setRoom(newRoom);
          setJoinError(null);
          setNicknameSuggestions([]);
          // The server should tell us which player we are
          if (message.payload.player) {
            setCurrentPlayer(message.payload.player);
            setIsHost(message.payload.player.isHost);
            // Save session after successful room join
            const currentSocketId = getSocketId();
            saveSession(message.payload.room.id, message.payload.player.nickname, currentSocketId || undefined);
          }
          
          toast({
            title: t('toast.roomJoined'),
            description: `Successfully joined ${message.payload.room.name}`,
          });
          
          // Navigate to the joined room
          navigate(`/${message.payload.room.id}`);
          
          // Automatically request chat history when joining a room
          setTimeout(() => {
            send({
              type: 'CHAT_HISTORY_REQUEST',
              payload: { roomId: message.payload.room.id }
            });
          }, 100);
          break;

        case 'room:joinError':
          const { error, suggestions = [] } = message.payload;
          setJoinError(error);
          setNicknameSuggestions(suggestions);
          
          // Don't show toast for nickname conflicts - let the component handle it
          if (!error.includes('already taken')) {
            toast({
              title: t('toast.joinRoomFailed'),
              description: error,
              variant: "destructive",
            });
          }
          break;
          
        case 'room:playerJoined':
          // Update room state when a new player joins
          if (message.payload.room && room) {
            // Preserve existing chat messages when updating room
            const updatedRoom = {
              ...message.payload.room,
              chatMessages: message.payload.room.chatMessages || room.chatMessages || []
            };
            setRoom(updatedRoom);
          }
          
          // Show notification that someone joined
          if (message.payload.player) {
            toast({
              title: t('toast.playerJoined'),
              description: `${message.payload.player.nickname} joined the room`,
            });
          }
          break;
          
        case 'ROOM_SYNC':
          // Preserve existing chat messages when syncing room
          if (message.payload.room && room) {
            const syncedRoom = {
              ...message.payload.room,
              chatMessages: message.payload.room.chatMessages || room.chatMessages || []
            };
            setRoom(syncedRoom);
          }
          break;
          
        case 'LEAVE_ROOM':
          setRoom(null);
          setCurrentPlayer(null);
          setIsHost(false);
          break;
          
        case 'room:hostChanged':
          const { newHostId, newHostNickname, oldHostId, reason } = message.payload;
          
          // Update room state to reflect host changes
          if (room) {
            const updatedPlayers = room.players.map(player => {
              if (player.id === newHostId) {
                return { ...player, isHost: true };
              } else if (player.id === oldHostId) {
                return { ...player, isHost: false };
              }
              return player;
            });
            
            const updatedRoom = {
              ...room,
              players: updatedPlayers
            };
            setRoom(updatedRoom);
          }
          
          // Update isHost state if current player is involved
          setCurrentPlayer(currentPlayerState => {
            if (!currentPlayerState) return currentPlayerState;
            
            if (currentPlayerState.id === newHostId) {
              setIsHost(true);
              return { ...currentPlayerState, isHost: true };
            } else if (currentPlayerState.id === oldHostId) {
              setIsHost(false);
              return { ...currentPlayerState, isHost: false };
            }
            return currentPlayerState;
          });
          
          // Show notification
          const reasonText = reason === 'host_disconnected' ? ' (previous host disconnected)' : '';
          toast({
            title: t('toast.hostChanged'),
            description: `${newHostNickname} is now the host${reasonText}`,
          });
          break;
          
        case 'story:created':
          console.log('Received story:created message:', message.payload);
          if (message.payload.story && message.payload.roomState) {
            console.log('Processing story:created with roomState:', message.payload.roomState);
            // Map roomState to Room format - handle case when room is null
            const updatedRoom = {
              id: message.payload.roomState.roomId || (room ? room.id : ''),
              name: message.payload.roomState.name || (room ? room.name : ''),
              stories: message.payload.roomState.stories || [],
              players: message.payload.roomState.players || [],
              createdAt: room ? room.createdAt : new Date(),
              currentStoryId: message.payload.roomState.currentStoryId,
              chatMessages: room?.chatMessages || []
            };
            console.log('Updated room:', updatedRoom);
            setRoom(updatedRoom);
            toast({
              title: t('toast.storyCreated'),
              description: `Story "${message.payload.story.title}" has been added`,
            });
          } else {
            console.log('story:created message missing required fields:', {
              story: !!message.payload.story,
              roomState: !!message.payload.roomState,
              room: !!room
            });
          }
          break;
          
        case 'story:selected':
          if (message.payload.success && message.payload.roomState && room) {
            // Map roomState format to Room format
            const updatedRoom = {
              ...room,
              id: message.payload.roomState.roomId || room.id,
              name: message.payload.roomState.name || room.name,
              stories: message.payload.roomState.stories || room.stories,
              players: message.payload.roomState.players || room.players,
              currentStoryId: message.payload.roomState.currentStoryId,
              chatMessages: room.chatMessages || []
            };
            setRoom(updatedRoom);
            toast({
              title: t('toast.storySelected'),
              description: t('toast.votingStartedForStory'),
            });
          }
          break;
          
        case 'room:updated':
          console.log('Received room:updated message:', message.payload);
          console.log('Current room ID:', room?.id);
          console.log('Payload room ID:', message.payload?.roomId);
          if (message.payload && message.payload.roomId && room && room.id === message.payload.roomId) {
            console.log('Processing room:updated with matching room ID');
            // Update room state with the new data from server
            const updatedRoom = {
              ...room,
              id: message.payload.roomId || room.id,
              name: message.payload.name || room.name,
              players: message.payload.players || room.players,
              stories: message.payload.stories || room.stories,
              currentStoryId: message.payload.currentStoryId,
              backlogSettings: message.payload.backlogSettings || room.backlogSettings,
              chatMessages: message.payload.chatMessages || room.chatMessages || []
            };
            console.log(`[CHAT] room:updated preserving chatMessages: ${room.chatMessages?.length || 0} -> ${updatedRoom.chatMessages.length}`);
            setRoom(updatedRoom);
          } else {
            console.log('room:updated message not processed - room ID mismatch or missing data');
          }
          break;

        case 'backlog:settingsUpdated':
          console.log('Received backlog:settingsUpdated message:', message.payload);
          if (message.payload && room) {
            const { sortOption, filterOption } = message.payload;
            const updatedRoom = {
              ...room,
              backlogSettings: {
                sortOption,
                filterOption
              }
            };
            console.log('Updated room with backlog settings:', updatedRoom);
            setRoom(updatedRoom);
          }
          break;

        case 'story:votesRevealed':
          console.log('Received story:votesRevealed message:', message.payload);
          if (message.payload && message.payload.storyId && room) {
            const { storyId, votes } = message.payload;
            // Update the specific story's status and votes
            const updatedStories = room.stories.map(story => {
              if (story.id === storyId) {
                return {
                  ...story,
                  status: 'revealed' as const,
                  votes: votes || story.votes
                };
              }
              return story;
            });
            
            const updatedRoom = {
              ...room,
              stories: updatedStories
            };
            console.log('Updated room with revealed votes:', updatedRoom);
            setRoom(updatedRoom);
            
            toast({
              title: t('toast.votesRevealed'),
              description: t('status.allVotesVisible'),
            });
          }
          break;

        case 'story:votingRestarted':
          console.log('Received story:votingRestarted message:', message.payload);
          if (message.payload && message.payload.storyId && room) {
            const { storyId } = message.payload;
            // Update the specific story's status and clear votes
            const updatedStories = room.stories.map(story => {
              if (story.id === storyId) {
                return {
                  ...story,
                  status: 'voting' as const,
                  votes: {}
                };
              }
              return story;
            });
            
            const updatedRoom = {
              ...room,
              stories: updatedStories
            };
            console.log('Updated room with restarted voting:', updatedRoom);
            setRoom(updatedRoom);
            
            toast({
              title: t('toast.votingRestarted'),
              description: t('toast.votesClearedAndRestarted'),
            });
          }
          break;

        case 'story:setFinalPoint:response':
          console.log('Received story:setFinalPoint:response message:', message.payload);
          if (message.payload && message.payload.success && message.payload.story && room) {
            const { story } = message.payload;
            // Update the specific story with final point and status
            const updatedStories = room.stories.map(roomStory => {
              if (roomStory.id === story.id) {
                return {
                  ...roomStory,
                  final_point: story.final_point,
                  status: story.status as 'closed'
                };
              }
              return roomStory;
            });
            
            const updatedRoom = {
              ...room,
              stories: updatedStories
            };
            console.log('Updated room with finalized story:', updatedRoom);
            setRoom(updatedRoom);
            
            toast({
              title: t('toast.storyFinalized'),
              description: `Story points set to ${story.final_point}. Story is now complete.`,
            });
          } else if (message.payload && !message.payload.success) {
            toast({
              title: t('toast.failedToFinalizeStory'),
              description: message.payload.error || t('toast.failedToSetFinalPoints'),
              variant: "destructive",
            });
          }
          break;

        case 'story:updated':
          console.log('Received story:updated message:', message.payload);
          if (message.payload && message.payload.story && room) {
            const { story } = message.payload;
            // Update the specific story in the room
            const updatedStories = room.stories.map(roomStory => {
              if (roomStory.id === story.id) {
                return story;
              }
              return roomStory;
            });
            
            const updatedRoom = {
              ...room,
              stories: updatedStories
            };
            console.log('Updated room with story update:', updatedRoom);
            setRoom(updatedRoom);
          }
          break;

        case 'story:skip:response':
          console.log('Received story:skip:response message:', message.payload);
          if (message.payload && message.payload.success && message.payload.story && room) {
            const { story } = message.payload;
            // Update the specific story with skipped status
            const updatedStories = room.stories.map(roomStory => {
              if (roomStory.id === story.id) {
                return {
                  ...roomStory,
                  status: story.status as 'skipped'
                };
              }
              return roomStory;
            });
            
            const updatedRoom = {
              ...room,
              stories: updatedStories
            };
            console.log('Updated room with skipped story:', updatedRoom);
            setRoom(updatedRoom);
            
            toast({
              title: t('toast.storySkipped'),
              description: `Story "${story.title}" has been skipped.`,
            });
          } else if (message.payload && !message.payload.success) {
            toast({
              title: t('toast.failedToSkipStory'),
              description: message.payload.error || t('toast.failedToSkipStoryGeneric'),
              variant: "destructive",
            });
          }
          break;

        case 'story:skipped':
          console.log('Received story:skipped message:', message.payload);
          if (message.payload && message.payload.story && room) {
            const { story } = message.payload;
            // Update the specific story with skipped status
            const updatedStories = room.stories.map(roomStory => {
              if (roomStory.id === story.id) {
                return {
                  ...roomStory,
                  status: story.status as 'skipped'
                };
              }
              return roomStory;
            });
            
            const updatedRoom = {
              ...room,
              stories: updatedStories
            };
            console.log('Updated room with skipped story notification:', updatedRoom);
            setRoom(updatedRoom);
            
            // Show notification for all players
            toast({
              title: t('toast.storySkipped'),
              description: `Story "${story.title}" has been skipped by the host.`
            });
          }
          break;

        case 'player:kicked':
          console.log('Received player:kicked message:', message.payload);
          toast({
            title: t('toast.kickedFromRoom'),
            description: t('toast.removedByHost'),
            variant: "destructive",
          });
          // Navigate back to home page
          navigate('/');
          break;

        case 'host:delegated':
          console.log('Received host:delegated message:', message.payload);
          if (message.payload && message.payload.success) {
            toast({
              title: t('toast.hostDelegationSuccessful'),
              description: t('toast.hostPrivilegesTransferred'),
            });
          } else {
            toast({
              title: t('toast.hostDelegationFailed'),
              description: message.payload?.error || t('toast.failedToTransferHost'),
              variant: "destructive",
            });
          }
          break;

        case 'player:kicked:response':
          console.log('Received player:kicked:response message:', message.payload);
          if (message.payload && message.payload.success) {
            toast({
              title: t('toast.playerKicked'),
              description: t('toast.playerRemovedFromRoom'),
            });
          } else {
            toast({
              title: t('toast.kickFailed'),
              description: message.payload?.error || t('toast.failedToKickPlayer'),
              variant: "destructive",
            });
          }
          break;

        case 'chat:messageReceived':
          console.log('Received chat message:', message.payload);
          if (message.payload) {
            const chatMessage = message.payload;
            
            setRoom(prevRoom => {
              if (!prevRoom) return prevRoom;
              
              const existingMessages = prevRoom.chatMessages || [];
              
              // Check if message already exists to prevent duplicates
              const messageExists = existingMessages.some(msg => msg.id === chatMessage.id);
              
              if (!messageExists) {
                // Simply push the new message to existing messages
                const updatedRoom = {
                  ...prevRoom,
                  chatMessages: [...existingMessages, chatMessage]
                };
                console.log(`[CHAT] Adding message, count: ${existingMessages.length} -> ${updatedRoom.chatMessages.length}`);
                return updatedRoom;
              }
              
              return prevRoom;
            });
          }
          break;

        case 'chat:message:response':
          console.log('Received chat message response:', message.payload);
          if (message.payload && !message.payload.success) {
            toast({
              title: t('toast.failedToSendMessage'),
              description: message.payload.error || t('toast.failedToSendChatMessage'),
              variant: "destructive",
            });
          }
          break;

        case 'chat:history:response':
          console.log('Received chat history response:', message.payload);
          if (message.payload && message.payload.success && room) {
            const historyMessages = message.payload.chatMessages || [];
            const existingMessages = room.chatMessages || [];
            
            // Always update with history messages, but merge intelligently
            // If we have no messages or fewer messages than history, use history
            if (existingMessages.length === 0 || historyMessages.length > existingMessages.length) {
              const updatedRoom = {
                ...room,
                chatMessages: historyMessages
              };
              setRoom(updatedRoom);
              console.log(`[CHAT] Updated room with ${historyMessages.length} history messages`);
            }
          } else if (message.payload && !message.payload.success) {
            toast({
              title: t('toast.failedToLoadChatHistory'),
              description: message.payload.error || t('toast.failedToLoadHistory'),
              variant: "destructive",
            });
          }
          break;

        case 'chat:typing:start':
          console.log('Received typing start:', message.payload);
          if (message.payload) {
            const { playerId, playerNickname } = message.payload;
            
            setRoom(prevRoom => {
              if (!prevRoom) return prevRoom;
              
              const typingIndicator = {
                playerId,
                playerNickname,
                roomId: prevRoom.id,
                timestamp: new Date()
              };
              
              // Add or update typing indicator
              const updatedTypingUsers = [...(prevRoom.typingUsers || [])];
              const existingIndex = updatedTypingUsers.findIndex(t => t.playerId === playerId);
              
              if (existingIndex >= 0) {
                updatedTypingUsers[existingIndex] = typingIndicator;
              } else {
                updatedTypingUsers.push(typingIndicator);
              }
              
              const updatedRoom = {
                ...prevRoom,
                typingUsers: updatedTypingUsers,
                chatMessages: prevRoom.chatMessages || []
              };
              console.log(`[CHAT] typing:start preserving chatMessages: ${prevRoom.chatMessages?.length || 0} messages`);
              return updatedRoom;
            });
          }
          break;

        case 'chat:typing:stop':
          console.log('Received typing stop:', message.payload);
          if (message.payload) {
            const { playerId } = message.payload;
            
            setRoom(prevRoom => {
              if (!prevRoom) return prevRoom;
              
              // Remove typing indicator
              const updatedTypingUsers = (prevRoom.typingUsers || []).filter(t => t.playerId !== playerId);
              
              const updatedRoom = {
                ...prevRoom,
                typingUsers: updatedTypingUsers,
                chatMessages: prevRoom.chatMessages || []
              };
              console.log(`[CHAT] typing:stop preserving chatMessages: ${prevRoom.chatMessages?.length || 0} messages`);
              return updatedRoom;
            });
          }
          break;

        case 'room:state':
          console.log('Received room:state message:', message.payload);
          if (message.payload && message.payload.room) {
            // Preserve existing chat messages and merge with incoming data
            const incomingRoom = message.payload.room;
            const existingChatMessages = room?.chatMessages || [];
            const incomingChatMessages = incomingRoom.chatMessages || [];
            
            // Use incoming chat messages if they exist, otherwise preserve existing
            const mergedChatMessages = incomingChatMessages.length > 0 ? incomingChatMessages : existingChatMessages;
            
            const updatedRoom = {
              ...incomingRoom,
              chatMessages: mergedChatMessages
            };
            setRoom(updatedRoom);
          }
          break;
          
        default:
          // Handle unknown message types gracefully
          break;
      }
    };

    on('message', handleMessage);
    return () => off('message', handleMessage);
  }, [on, off, toast, room, navigate, saveSession, getSocketId]);

  // Define joinRoom function first
  const joinRoom = useCallback(async (roomId: string, nickname: string) => {
    if (!isConnected) {
      toast({
        title: t('toast.connectionError'),
        description: t('toast.connectToServerFirst'),
        variant: "destructive",
      });
      return Promise.reject(new Error("Not connected"));
    }

    try {
      setJoinError(null);
      setNicknameSuggestions([]);
      
      const promise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Join room timeout'));
        }, 10000); // 10 second timeout

        const handleJoinResponse = (message: any) => {
          clearTimeout(timeout);
          off('message', handleJoinResponse);
          
          if (message.type === 'JOIN_ROOM') {
            if (message.payload.success) {
              resolve();
            } else {
              reject(new Error(message.payload.error || 'Failed to join room'));
            }
          } else if (message.type === 'room:joined') {
            resolve();
          } else if (message.type === 'error' && message.payload?.context === 'joinRoom') {
            reject(new Error(message.payload.message || 'Failed to join room'));
          } else if (message.type === 'nickname:conflict') {
            setJoinError(message.payload.message);
            if (message.payload.suggestions) {
              setNicknameSuggestions(message.payload.suggestions);
            }
            reject(new Error(message.payload.message));
          }
        };

        on('message', handleJoinResponse);
      });

      send({
        type: 'JOIN_ROOM',
        payload: { roomId, nickname }
      });

      await promise;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setJoinError(errorMessage);
      throw error;
    }
  }, [isConnected, toast, send, on, off, setJoinError, setNicknameSuggestions]);

  // Rejoin room for session restoration (bypasses nickname conflicts)
  const rejoinRoom = useCallback(async (roomId: string, nickname: string) => {
    // CRITICAL: Check if already rejoining to prevent double calls
    if (isRejoining) {
      return Promise.reject(new Error("Already rejoining"));
    }
    
    setIsRejoining(true);
    
    // Wait a bit if connection is still establishing
    for (let i = 0; i < 50; i++) { // Wait up to 5 seconds
      if (isConnected) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!isConnected) {
      setIsRejoining(false);
      toast({
        title: t('toast.connectionError'),
        description: t('toast.connectToServerFirst'),
        variant: "destructive",
      });
      return Promise.reject(new Error("Not connected"));
    }

    try {
      setJoinError(null);
      setNicknameSuggestions([]);
      
      // Add a small delay before sending to ensure WebSocket is ready
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const promise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          setIsRejoining(false);
          reject(new Error('Rejoin room timeout'));
        }, 15000); // Increased timeout to 15 seconds

        const handleRejoinResponse = (message: any) => {
          clearTimeout(timeout);
          off('message', handleRejoinResponse);
          
          if (message.type === 'room:joined' || message.type === 'room:created') {
            setIsRejoining(false);
            resolve();
          } else if (message.type === 'room:joinError') {
            setIsRejoining(false);
            reject(new Error(message.payload.error || 'Failed to rejoin room'));
          } else if (message.type === 'error' && message.payload?.context === 'rejoinRoom') {
            setIsRejoining(false);
            reject(new Error(message.payload.message || 'Failed to rejoin room'));
          }
        };

        on('message', handleRejoinResponse);
      });
      
      send({
        type: 'REJOIN_ROOM',
        payload: { 
          roomId, 
          nickname,
          previousSocketId: session?.socketId // Include previous socket ID for cleanup
        }
      });

      await promise;
    } catch (error) {
      setIsRejoining(false); // Ensure state is reset on any error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setJoinError(errorMessage);
      throw error;
    }
  }, [isConnected, toast, send, setJoinError, setNicknameSuggestions, on, off, getSocketId, session?.socketId, isRejoining]);

  const createRoom = async (nickname: string): Promise<string | null> => {
    if (!isConnected) {
      toast({
        title: t('toast.connectionError'),
        description: t('toast.connectToServerFirst'),
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

  // Handle WebSocket reconnection with session recovery
  useEffect(() => {
    if (isConnected && session && !room && !currentPlayer) {
      // Only auto-rejoin if we have a valid session but no current room state
      const currentPath = window.location.pathname;
      const roomIdFromPath = currentPath.split('/')[1]; // Extract room ID from path
      
      if (roomIdFromPath && hasValidSession(roomIdFromPath)) {
        console.log('Auto-rejoining room after reconnection:', { 
          roomId: roomIdFromPath, 
          nickname: session.nickname 
        });
        
        // Attempt to rejoin the room using rejoin to avoid nickname conflicts
        rejoinRoom(roomIdFromPath, session.nickname).catch((error) => {
          console.error('Failed to auto-rejoin room after reconnection:', error);
          // Clear invalid session if rejoin fails
          clearSession();
        });
      }
    }
  }, [isConnected, session, room, currentPlayer, hasValidSession, clearSession, rejoinRoom]);

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
      type: 'STORY_CREATE',
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

  const skipStory = (storyId: string) => {
    if (!room || !isHost) return;
    
    send({
      type: 'STORY_SKIP',
      payload: { storyId }
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

  const sendChatMessage = useCallback((message: string) => {
    if (!room || !currentPlayer) {
      toast({
        title: t('toast.cannotSendMessage'),
        description: t('toast.mustBeInRoom'),
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: t('toast.cannotSendEmptyMessage'),
        description: t('toast.pleaseEnterMessage'),
        variant: "destructive",
      });
      return;
    }

    if (message.length > 1000) {
      toast({
        title: t('toast.messageTooLong'),
        description: t('toast.messageCharacterLimit'),
        variant: "destructive",
      });
      return;
    }

    send({
      type: 'CHAT_MESSAGE',
      payload: { 
        message: message.trim(),
        playerId: currentPlayer.id,
        playerNickname: currentPlayer.nickname,
        roomId: room.id
      }
    });
  }, [room, currentPlayer, send, toast]);

  const requestChatHistory = useCallback(() => {
    if (!room) {
      toast({
        title: t('toast.cannotLoadChatHistory'),
        description: t('toast.mustBeInRoomForHistory'),
        variant: "destructive",
      });
      return;
    }

    send({
      type: 'CHAT_HISTORY_REQUEST',
      payload: { roomId: room.id }
    });
  }, [room, send]);

  const startTyping = useCallback(() => {
    if (!room || !currentPlayer) {
      return;
    }

    send({
      type: 'CHAT_TYPING_START',
      payload: { 
        playerId: currentPlayer.id,
        playerNickname: currentPlayer.nickname,
        roomId: room.id
      }
    });
  }, [room, currentPlayer, send]);

  const stopTyping = useCallback(() => {
    if (!room || !currentPlayer) {
      return;
    }

    send({
      type: 'CHAT_TYPING_STOP',
      payload: { 
        playerId: currentPlayer.id,
        playerNickname: currentPlayer.nickname,
        roomId: room.id
      }
    });
  }, [room, currentPlayer, send]);

  const value: RoomContextType = {
    room,
    currentPlayer,
    isHost,
    joinError,
    nicknameSuggestions,
    isRejoining,
    createRoom,
    joinRoom,
    rejoinRoom,
    leaveRoom,
    createStory,
    vote,
    revealVotes,
    restartVoting,
    setFinalPoint,
    skipStory,
    transferHost,
    syncRoom,
    clearJoinError,
    sendChatMessage,
    requestChatHistory,
    startTyping,
    stopTyping,
  };

  return (
    <RoomContext.Provider value={value}>
      {children}
    </RoomContext.Provider>
  );
};