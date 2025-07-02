import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRoom } from '@/contexts/RoomContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { ResponsiveVotingInterface } from '@/components/ResponsiveVotingInterface';
import { ResponsivePlayerLayout } from '@/components/ResponsivePlayerLayout';
import { CurrentStory } from '@/components/CurrentStory';
import { StoryList } from '@/components/StoryList';
import { VotingResults } from '@/components/VotingResults';
import { VotingControls } from '@/components/HostControls/VotingControls';
import { SyncButton } from '@/components/SyncButton';
import { FinalizePoints } from '@/components/FinalizePoints';
import { HostActions } from '@/components/HostActions';
import { BacklogSidebar } from '@/components/BacklogSidebar';
// import { VOTE_OPTIONS } from '@planning-poker/shared';
const VOTE_OPTIONS = ['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕'];

export const RoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const nickname = searchParams.get('nickname');
  const [nicknameInput, setNicknameInput] = useState(nickname || '');
  const [isJoining, setIsJoining] = useState(false);
  // Modal states moved to HostActions component
  
  const { room, currentPlayer, isHost, joinRoom, leaveRoom, vote, syncRoom, joinError, nicknameSuggestions, clearJoinError } = useRoom();
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
    navigate('/');
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
      console.error('Failed to join room:', error);
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
                  className={joinError?.includes('already taken') ? 'border-red-500' : ''}
                  autoFocus
                />
              </div>

              {/* Nickname conflict error and suggestions */}
              {joinError?.includes('already taken') && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800 mb-2">{joinError}</p>
                  {nicknameSuggestions.length > 0 && (
                    <div>
                      <p className="text-sm text-yellow-700 mb-2">Try these suggestions:</p>
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
              {joinError && !joinError.includes('already taken') && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{joinError}</p>
                </div>
              )}

              {/* Connection Status */}
              {!isConnected && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-600">Connect to server first</p>
                </div>
              )}

              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
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
                  {isJoining ? 'Joining...' : 'Join Room'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStory = room.currentStoryId 
    ? room.stories.find(story => story.id === room.currentStoryId) 
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Desktop Layout: Sidebar + Main Content */}
      <div className="hidden lg:flex h-screen">
        {/* Left Sidebar - Backlog */}
        <div className="w-80 bg-white/50 backdrop-blur-sm border-r border-white/20 p-4 flex flex-col">
          <BacklogSidebar stories={room.stories} />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-white/50 backdrop-blur-sm border-b border-white/20 p-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-3xl font-bold">{room.name}</h1>
                <p className="text-muted-foreground">Room ID: {room.id}</p>
              </div>
              <div className="flex items-center gap-4">
                {isHost && <Badge variant="default">Host</Badge>}
                <SyncButton />
                <Button variant="outline" onClick={handleLeaveRoom}>
                  Leave Room
                </Button>
              </div>
            </div>
            
            {/* Host Actions */}
            <HostActions />
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col">
            {/* Current Story */}
            {currentStory && <CurrentStory />}

            {/* Main Content - Players with Compact Voting Controls */}
            <div className="flex-1 flex flex-col">
              <div className="relative">
                <ResponsivePlayerLayout 
                  players={room.players}
                  currentStory={currentStory}
                  currentPlayerId={currentPlayer?.id || ''}
                />
                
                {/* Compact Voting Controls in Poker Table */}
                {isHost && (
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                    <VotingControls compact={true} />
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Panel - Cards */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Voting Interface */}
              <ResponsiveVotingInterface />
              
              {/* Voting Results */}
              <VotingResults />
              
              {/* Finalize Points (Host Only) */}
              <FinalizePoints />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout: Traditional Stacked */}
      <div className="lg:hidden p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">{room.name}</h1>
              <p className="text-muted-foreground">Room ID: {room.id}</p>
            </div>
            <div className="flex items-center gap-4">
              {isHost && <Badge variant="default">Host</Badge>}
              <SyncButton />
              <Button variant="outline" onClick={handleLeaveRoom}>
                Leave Room
              </Button>
            </div>
          </div>

          {/* Current Story */}
          {currentStory && <CurrentStory />}

          {/* Players with Compact Voting Controls */}
          <div className="relative mb-6">
            <ResponsivePlayerLayout 
              players={room.players}
              currentStory={currentStory}
              currentPlayerId={currentPlayer?.id || ''}
            />
            
            {/* Compact Voting Controls in Poker Table */}
            {isHost && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                <VotingControls compact={true} />
              </div>
            )}
          </div>

          {/* Bottom Cards Grid */}
          <div className="grid grid-cols-1 gap-4 mb-6">
            {/* Voting Interface */}
            <ResponsiveVotingInterface />
            
            {/* Voting Results */}
            <VotingResults />
            
            {/* Finalize Points (Host Only) */}
            <FinalizePoints />
            
            {/* Host Actions (Mobile) */}
            <HostActions />
            
            {/* Stories (Mobile) */}
            <StoryList stories={room.stories} />
          </div>
        </div>
      </div>
    </div>
  );
};