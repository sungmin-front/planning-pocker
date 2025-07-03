import { BacklogSidebar } from "@/components/BacklogSidebar";
import { CurrentStory } from "@/components/CurrentStory";
import { ExportButton } from "@/components/ExportButton";
import { HostActions } from "@/components/HostActions";
import { ResponsivePlayerLayout } from "@/components/ResponsivePlayerLayout";
import { ResponsiveVotingInterface } from "@/components/ResponsiveVotingInterface";
import { SyncButton } from "@/components/SyncButton";
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
import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import LanguageToggle from "@/components/LanguageToggle";

export const RoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const nickname = searchParams.get("nickname");
  const [nicknameInput, setNicknameInput] = useState(nickname || "");
  const [isJoining, setIsJoining] = useState(false);
  // Modal states moved to HostActions component

  const {
    room,
    currentPlayer,
    isHost,
    joinRoom,
    leaveRoom,
    vote,
    syncRoom,
    joinError,
    nicknameSuggestions,
    clearJoinError,
  } = useRoom();
  const { isConnected, send } = useWebSocket();

  useEffect(() => {
    // If user is already in a room (e.g., host who created room), don't attempt to join again
    if (room && currentPlayer) {
      return;
    }

    // Only attempt to join if connected
    if (isConnected && roomId && nickname) {
      joinRoom(roomId, nickname);
    }
    // If no nickname or not connected yet, the component will show the appropriate UI
  }, [roomId, nickname, isConnected, room, currentPlayer, joinRoom]);

  const handleLeaveRoom = () => {
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

  const currentStory = room.currentStoryId
    ? room.stories.find((story) => story.id === room.currentStoryId)
    : null;

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
                  />
                </div>

                {/* Bottom Panel - Cards */}
                <div className="mt-6 space-y-4">
                  {/* Voting Interface - Full Width */}
                  <ResponsiveVotingInterface />

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
                />

                {/* Voting Interface - Full Width */}
                <ResponsiveVotingInterface />

                {/* Other Components removed as finalize is now in modal */}
              </div>
            </SidebarInset>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
};
