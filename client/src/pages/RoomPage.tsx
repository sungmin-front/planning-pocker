import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRoom } from '@/contexts/RoomContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
// import { VOTE_OPTIONS } from '@planning-poker/shared';
const VOTE_OPTIONS = ['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕'];

export const RoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const nickname = searchParams.get('nickname');
  const [nicknameInput, setNicknameInput] = useState(nickname || '');
  const [isJoining, setIsJoining] = useState(false);
  
  const { room, currentPlayer, isHost, joinRoom, leaveRoom, vote, syncRoom, joinError, nicknameSuggestions, clearJoinError } = useRoom();
  const { isConnected } = useWebSocket();

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">{room.name}</h1>
            <p className="text-muted-foreground">Room ID: {room.id}</p>
          </div>
          <div className="flex items-center gap-4">
            {isHost && <Badge variant="default">Host</Badge>}
            <Button variant="outline" onClick={handleLeaveRoom}>
              Leave Room
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Players */}
          <Card>
            <CardHeader>
              <CardTitle>Players ({room.players.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {room.players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <span className="font-medium">{player.nickname}</span>
                    <div className="flex items-center gap-2">
                      {player.isHost && <Badge variant="secondary">Host</Badge>}
                      <Badge variant="outline">
                        Ready
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Voting */}
          <Card>
            <CardHeader>
              <CardTitle>Vote</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {VOTE_OPTIONS.map((option) => (
                  <Button
                    key={option}
                    variant="outline"
                    className="aspect-square"
                    onClick={() => handleVote(option)}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Stories */}
          <Card>
            <CardHeader>
              <CardTitle>Stories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {room.stories.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No stories yet
                  </p>
                ) : (
                  room.stories.map((story) => (
                    <div
                      key={story.id}
                      className={`p-3 rounded-lg border ${
                        story.id === room.currentStoryId
                          ? 'border-primary bg-primary/5'
                          : 'border-border'
                      }`}
                    >
                      <h4 className="font-medium">{story.title}</h4>
                      {story.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {story.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant="outline">
                          {story.status}
                        </Badge>
                        {story.final_point && (
                          <Badge variant="default">
                            {story.final_point} pts
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};