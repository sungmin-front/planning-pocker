import { BacklogSidebar } from "@/components/BacklogSidebar";
<<<<<<< HEAD
=======
import { ChatFAB } from "@/components/ChatFAB";
import { ChatSidebar } from "@/components/ChatSidebar";
>>>>>>> origin/main
import { CurrentStory } from "@/components/CurrentStory";
import { ExportButton } from "@/components/ExportButton";
import { HostActions } from "@/components/HostActions";
import { ResponsivePlayerLayout } from "@/components/ResponsivePlayerLayout";
import { ResponsiveVotingInterface } from "@/components/ResponsiveVotingInterface";
import { SyncButton } from "@/components/SyncButton";
import { VotingResultsModal } from "@/components/VotingResultsModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { useRoom } from "@/contexts/RoomContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { PanelLeftOpen } from "lucide-react";
<<<<<<< HEAD
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import LanguageToggle from "@/components/LanguageToggle";
import { useSessionPersistence } from "@/hooks/useSessionPersistence";

export const RoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Session persistence hook
  const { session, saveSession, clearSession, hasValidSession } = useSessionPersistence();
=======
import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import LanguageToggle from "@/components/LanguageToggle";

export const RoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
>>>>>>> origin/main

  const nickname = searchParams.get("nickname");
  const [nicknameInput, setNicknameInput] = useState(nickname || "");
  const [isJoining, setIsJoining] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
<<<<<<< HEAD
  const [isAutoRejoining, setIsAutoRejoining] = useState(false);
  const hasAttemptedRejoin = useRef(false);

  // Get hooks first before using them in useEffect
=======
  // Modal states moved to HostActions component
  
  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSeenMessageId, setLastSeenMessageId] = useState<string | null>(null);

>>>>>>> origin/main
  const {
    room,
    currentPlayer,
    isHost,
    joinRoom,
<<<<<<< HEAD
    rejoinRoom,
=======
>>>>>>> origin/main
    leaveRoom,
    vote,
    syncRoom,
    joinError,
    nicknameSuggestions,
    clearJoinError,
<<<<<<< HEAD
    isRejoining,
  } = useRoom();
  const { isConnected, send, getSocketId } = useWebSocket();

  // Auto-restore session on page load
  useEffect(() => {
    if (!roomId) return;

    // Reset rejoin attempt flag when roomId changes OR when we get a fresh connection
    hasAttemptedRejoin.current = false;

    // Check if we have a valid session for this room
    if (session && hasValidSession(roomId)) {
      // Auto-populate nickname from session
      if (session.nickname !== nicknameInput) {
        setNicknameInput(session.nickname);
      }
    }
  }, [roomId, session, hasValidSession, nicknameInput]);

  // Reset rejoin attempt flag when connection is established
  useEffect(() => {
    if (isConnected) {
      hasAttemptedRejoin.current = false;
    }
  }, [isConnected]);
  // Modal states moved to HostActions component
=======
  } = useRoom();
  const { isConnected, send } = useWebSocket();
>>>>>>> origin/main

  // Calculate current story - moved before conditional return
  const currentStory = room?.currentStoryId
    ? room.stories.find((story) => story.id === room.currentStoryId)
    : null;

  useEffect(() => {
<<<<<<< HEAD

    // Reset auto-rejoining if not connected
    if (!isConnected && isAutoRejoining) {
      setIsAutoRejoining(false);
    }

=======
>>>>>>> origin/main
    // If user is already in a room (e.g., host who created room), don't attempt to join again
    if (room && currentPlayer) {
      return;
    }

<<<<<<< HEAD
    // Auto-rejoin if we have a valid session for this room (and not already rejoining)
    if (isConnected && roomId && session && hasValidSession(roomId) && !isAutoRejoining && !hasAttemptedRejoin.current && !isRejoining) {
      setIsAutoRejoining(true);
      hasAttemptedRejoin.current = true;
      
      // Add a small delay to ensure WebSocket connection is fully ready
      setTimeout(() => {
        rejoinRoom(roomId, session.nickname)
          .then(() => {
            // Success handled by room state updates
          })
          .catch((error) => {
            setIsAutoRejoining(false);
            
            // Only clear the attempt flag if it's a permanent failure (room not found)
            if (error.message.includes('Room not found') || error.message.includes('not found')) {
              clearSession();
              navigate('/');
            } else {
              // For temporary failures, allow retry on next page refresh
              hasAttemptedRejoin.current = false;
            }
          });
      }, 100); // 100ms delay to ensure connection stability
      return;
    }

    // Only attempt to join if connected and nickname provided
=======
    // Only attempt to join if connected
>>>>>>> origin/main
    if (isConnected && roomId && nickname) {
      joinRoom(roomId, nickname);
    }
    // If no nickname or not connected yet, the component will show the appropriate UI
  }, [roomId, nickname, isConnected, room, currentPlayer, joinRoom]);

  // Handle modal opening when votes are revealed - moved before conditional return
  useEffect(() => {
    if (currentStory?.status === 'revealed' && Object.keys(currentStory.votes || {}).length > 0) {
      const timeoutId = setTimeout(() => {
        setIsStatsModalOpen(true);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentStory?.status, currentStory?.id]);

<<<<<<< HEAD
  // Reset auto-rejoining state when successfully joined room
  useEffect(() => {
    if (room && currentPlayer && isAutoRejoining) {
      setIsAutoRejoining(false);
      // Don't reset hasAttemptedRejoin here to prevent re-attempts
    }
  }, [room, currentPlayer, isAutoRejoining]);

  const handleLeaveRoom = () => {
    // Clear session when explicitly leaving room
    clearSession();
=======
  // Track unread messages
  useEffect(() => {
    if (!room?.chatMessages) return;

    const chatMessages = room.chatMessages;
    if (chatMessages.length === 0) return;

    const latestMessage = chatMessages[chatMessages.length - 1];
    
    if (isChatOpen) {
      // Chat is open, mark all messages as read
      setUnreadCount(0);
      setLastSeenMessageId(latestMessage.id);
    } else {
      // Chat is closed, count unread messages
      if (lastSeenMessageId) {
        const lastSeenIndex = chatMessages.findIndex(msg => msg.id === lastSeenMessageId);
        if (lastSeenIndex >= 0) {
          const newUnreadCount = chatMessages.length - lastSeenIndex - 1;
          setUnreadCount(Math.max(0, newUnreadCount));
        } else {
          // If we can't find the last seen message, all messages are unread
          setUnreadCount(chatMessages.length);
        }
      } else {
        // No last seen message, all messages are unread
        setUnreadCount(chatMessages.length);
      }
    }
  }, [room?.chatMessages, isChatOpen, lastSeenMessageId]);

  const handleChatToggle = () => {
    setIsChatOpen(!isChatOpen);
  };

  const handleLeaveRoom = () => {
>>>>>>> origin/main
    leaveRoom();
    navigate("/");
  };

  const handleVote = (value: string) => {
    if (room?.currentStoryId) {
      vote(room.currentStoryId, value as any);
    }
  };

  const handleJoinWithNickname = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!roomId || !nicknameInput.trim()) return;

    setIsJoining(true);
    try {
      await joinRoom(roomId, nicknameInput.trim());
<<<<<<< HEAD
      // Save session after successful join
      const currentSocketId = getSocketId();
      saveSession(roomId, nicknameInput.trim(), currentSocketId || undefined);
=======
>>>>>>> origin/main
    } catch (error) {
      console.error("Failed to join room:", error);
    } finally {
      setIsJoining(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setNicknameInput(suggestion);
    clearJoinError();
  };

  // Handle finalizing story points
  const handleFinalize = (storyId: string, finalPoint: string) => {
    send({
      type: 'STORY_SET_FINAL_POINT',
      payload: { storyId, point: finalPoint }
    });
  };

<<<<<<< HEAD
  // Show loading screen during auto-rejoin
  if (isAutoRejoining) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Reconnecting to room...</p>
        </div>
      </div>
    );
  }

=======
>>>>>>> origin/main
  // Show nickname input form if not connected to room yet
  if (!room || !currentPlayer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="absolute top-4 right-4">
          <LanguageToggle />
        </div>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold leading-none tracking-tight">
              Join Room {roomId}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinWithNickname} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nickname">Your Nickname</Label>
                <Input
                  id="nickname"
                  type="text"
                  value={nicknameInput}
                  onChange={(e) => {
                    setNicknameInput(e.target.value);
                    if (joinError) clearJoinError();
                  }}
                  placeholder="Enter your nickname"
                  disabled={!isConnected || isJoining}
                  className={
                    joinError?.includes("already taken") ? "border-red-500" : ""
                  }
                  autoFocus
                />
              </div>

              {/* Nickname conflict error and suggestions */}
              {joinError?.includes("already taken") && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800 mb-2">{joinError}</p>
                  {nicknameSuggestions.length > 0 && (
                    <div>
                      <p className="text-sm text-yellow-700 mb-2">
                        Try these suggestions:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {nicknameSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="px-2 py-1 text-xs bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 rounded transition-colors"
                            disabled={!isConnected || isJoining}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Other join errors */}
              {joinError && !joinError.includes("already taken") && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{joinError}</p>
                </div>
              )}

              {/* Connection Status */}
              {!isConnected && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-600">
                    Connect to server first
                  </p>
                </div>
              )}

              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/")}
                  disabled={isJoining}
                  className="flex-1"
                >
                  Back to Home
                </Button>
                <Button
                  type="submit"
                  disabled={!isConnected || !nicknameInput.trim() || isJoining}
                  className="flex-1"
                >
                  {isJoining ? "Joining..." : "Join Room"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <SidebarProvider>
        {/* Desktop Layout: Sidebar + Main Content */}
        <div className="hidden lg:flex h-screen w-full">
          <div className="flex h-full flex-1">
            {/* Collapsible Backlog Sidebar */}
            <Sidebar className="border-r border-white/20">
              <SidebarContent className="bg-white/50 backdrop-blur-sm">
                <BacklogSidebar stories={room.stories} />
              </SidebarContent>
            </Sidebar>

            {/* Main Content Area */}
            <SidebarInset className="w-full flex-1 flex flex-col gap-4 overflow-hidden p-4">
              {/* Header - Fixed */}
              <div className="bg-white/50 backdrop-blur-sm border-b border-white/20">
                <div className="flex justify-between items-center">
                  <div className="flex items-start gap-4">
                    {/* Sidebar Toggle Button */}
                      <SidebarTrigger>
                        <Button size="icon" variant="outline" className="h-10 w-10">
                          <PanelLeftOpen className="h-6 w-6" />
                        </Button>
                      </SidebarTrigger>
                    <div className="flex gap-2 items-end">
                      <h1 className="text-3xl font-bold">{room.name}</h1>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                  <Badge variant="outline">{room.id}</Badge>
                    {isHost && <Badge variant="default">Host</Badge>}
                    <LanguageToggle />
                    <ExportButton roomId={room.id} />
                    <SyncButton />
                    <Button variant="outline" onClick={handleLeaveRoom}>
                      Leave Room
                    </Button>
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-4">
                {/* Host Actions */}
                <HostActions />

                {/* Current Story */}
                {currentStory && <CurrentStory />}

                {/* Main Content - Players */}
                <div className="flex-1 flex flex-col">
                  <ResponsivePlayerLayout
                    players={room.players}
                    currentStory={currentStory ?? null}
                    currentPlayerId={currentPlayer?.id || ""}
                    isStatsModalOpen={isStatsModalOpen}
                    onOpenStatsModal={() => setIsStatsModalOpen(true)}
                  />
                </div>

<<<<<<< HEAD
                {/* Bottom Panel - Cards */}
=======
                {/* Bottom Panel - Cards and Chat */}
>>>>>>> origin/main
                <div className="mt-6 space-y-4">
                  {/* Voting Interface - Full Width */}
                  <ResponsiveVotingInterface />

<<<<<<< HEAD
=======

>>>>>>> origin/main
                  {/* Other Components - Grid Layout removed as finalize is now in modal */}
                </div>
              </div>
            </SidebarInset>
          </div>
        </div>

        {/* Mobile Layout: Sidebar + Main Content */}
        <div className="lg:hidden h-screen w-full">
          <div className="flex h-full">
            {/* Mobile Collapsible Backlog Sidebar */}
            <Sidebar className="border-r border-white/20" variant="inset">
              <SidebarContent className="bg-white/50 backdrop-blur-sm">
                <BacklogSidebar stories={room.stories} />
              </SidebarContent>
            </Sidebar>

            {/* Mobile Main Content Area */}
            <SidebarInset className="w-full flex-1 flex flex-col gap-4 overflow-hidden p-4">
              {/* Mobile Header - Fixed */}
              <div className="bg-white/50 backdrop-blur-sm border-b border-white/20">
                <div className="flex justify-between items-center">
                  <div className="flex items-start gap-2">
                    <SidebarTrigger>
                      <Button size="icon" variant="outline" className="h-8 w-8">
                        <PanelLeftOpen className="h-4 w-4" />
                      </Button>
                    </SidebarTrigger>
                    <div className="flex gap-2 items-end">
                      <h1 className="text-xl font-bold">{room.name}</h1>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{room.id}</Badge>
                    {isHost && (
                      <Badge variant="default" className="text-xs">
                        Host
                      </Badge>
                    )}
                    <ExportButton roomId={room.id} size="sm" />
                    <SyncButton />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLeaveRoom}
                    >
                      Leave
                    </Button>
                  </div>
                </div>
              </div>

              {/* Mobile Scrollable Content */}
              <div className="flex-1 overflow-y-auto flex flex-col gap-4">
                {/* Host Actions */}
                <HostActions />

                {/* Current Story */}
                {currentStory && <CurrentStory />}

                {/* Players */}
                <ResponsivePlayerLayout
                  players={room.players}
                  currentStory={currentStory ?? null}
                  currentPlayerId={currentPlayer?.id || ""}
                  isStatsModalOpen={isStatsModalOpen}
                  onOpenStatsModal={() => setIsStatsModalOpen(true)}
                />

                {/* Voting Interface - Full Width */}
                <ResponsiveVotingInterface />

<<<<<<< HEAD
=======

>>>>>>> origin/main
                {/* Other Components removed as finalize is now in modal */}
              </div>
            </SidebarInset>
          </div>
        </div>
      </SidebarProvider>
      
<<<<<<< HEAD
=======
      {/* Chat FAB */}
      <ChatFAB onClick={handleChatToggle} unreadCount={unreadCount} />
      
      {/* Chat Sidebar */}
      <ChatSidebar isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      
>>>>>>> origin/main
      {/* Shared Voting Results Modal */}
      {currentStory && (
        <VotingResultsModal
          isOpen={isStatsModalOpen}
          onClose={() => setIsStatsModalOpen(false)}
          votes={currentStory.votes || {}}
          totalVotes={Object.keys(currentStory.votes || {}).length}
          isHost={isHost}
          storyId={currentStory.id}
          onFinalize={handleFinalize}
        />
      )}
    </div>
  );
};
