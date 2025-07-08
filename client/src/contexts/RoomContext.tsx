import React, { createContext, useContext, useEffect, useState, useCallback, useReducer, useRef } from 'react';
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

export const RoomProvider = ({ children }: RoomProviderProps): JSX.Element => {
  const [room, setRoom] = useState<Room | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [nicknameSuggestions, setNicknameSuggestions] = useState<string[]>([]);
  
  // useRef to maintain latest room state for event handlers
  const roomRef = useRef<Room | null>(null);
  
  const { send, on, off, isConnected } = useWebSocket();
  const { toast } = useToast();
  const navigate = useNavigate();

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
          }
          
          toast({
            title: "Room Joined",
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
              title: "Failed to Join Room",
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
              title: "Player Joined",
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
            title: "Host Changed",
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
              currentStoryId: message.payload.roomState.currentStoryId
            };
            console.log('Updated room:', updatedRoom);
            setRoom(updatedRoom);
            toast({
              title: "Story Created",
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
              currentStoryId: message.payload.roomState.currentStoryId
            };
            setRoom(updatedRoom);
            toast({
              title: "Story Selected",
              description: "Voting has started for the selected story",
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
              title: "Votes Revealed",
              description: "All votes are now visible to everyone",
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
              title: "Voting Restarted",
              description: "Votes have been cleared and voting has started again",
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
              title: "Story Finalized",
              description: `Story points set to ${story.final_point}. Story is now complete.`,
            });
          } else if (message.payload && !message.payload.success) {
            toast({
              title: "Failed to Finalize Story",
              description: message.payload.error || "Failed to set final story points",
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
              title: "Story Skipped",
              description: `Story "${story.title}" has been skipped.`,
            });
          } else if (message.payload && !message.payload.success) {
            toast({
              title: "Failed to Skip Story",
              description: message.payload.error || "Failed to skip story",
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
              title: "Story Skipped",
              description: `Story "${story.title}" has been skipped by the host.`,
            });
          }
          break;

        case 'player:kicked':
          console.log('Received player:kicked message:', message.payload);
          toast({
            title: "Kicked from Room",
            description: "You have been removed from the room by the host",
            variant: "destructive",
          });
          // Navigate back to home page
          navigate('/');
          break;

        case 'host:delegated':
          console.log('Received host:delegated message:', message.payload);
          if (message.payload && message.payload.success) {
            toast({
              title: "Host Delegation Successful",
              description: "Host privileges have been transferred",
            });
          } else {
            toast({
              title: "Host Delegation Failed", 
              description: message.payload?.error || "Failed to transfer host privileges",
              variant: "destructive",
            });
          }
          break;

        case 'player:kicked:response':
          console.log('Received player:kicked:response message:', message.payload);
          if (message.payload && message.payload.success) {
            toast({
              title: "Player Kicked",
              description: "Player has been removed from the room",
            });
          } else {
            toast({
              title: "Kick Failed",
              description: message.payload?.error || "Failed to kick player",
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
              title: "Failed to Send Message",
              description: message.payload.error || "Failed to send chat message",
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
              title: "Failed to Load Chat History",
              description: message.payload.error || "Failed to load chat history",
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
  }, [on, off, toast, navigate]);

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
        title: "Cannot Send Message",
        description: "You must be in a room to send messages",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Cannot Send Empty Message",
        description: "Please enter a message to send",
        variant: "destructive",
      });
      return;
    }

    if (message.length > 1000) {
      toast({
        title: "Message Too Long",
        description: "Messages must be 1000 characters or less",
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
        title: "Cannot Load Chat History",
        description: "You must be in a room to load chat history",
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
    createRoom,
    joinRoom,
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