import React, { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRoom } from '@/contexts/RoomContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
// import { VOTE_OPTIONS } from '@planning-poker/shared';
const VOTE_OPTIONS = ['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕'];

export const RoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const nickname = searchParams.get('nickname');
  
  const { room, currentPlayer, isHost, joinRoom, leaveRoom, vote, syncRoom } = useRoom();
  const { isConnected } = useWebSocket();

  useEffect(() => {
    if (!isConnected) {
      navigate('/');
      return;
    }

    // If user is already in a room (e.g., host who created room), don't redirect
    if (room && currentPlayer) {
      return;
    }

    if (roomId && nickname) {
      joinRoom(roomId, nickname);
    } else if (roomId && !nickname) {
      // Redirect to join page if no nickname provided
      navigate(`/join/${roomId}`);
    }
  }, [roomId, nickname, isConnected, room, currentPlayer, joinRoom, navigate]);

  const handleLeaveRoom = () => {
    leaveRoom();
    navigate('/');
  };

  const handleVote = (value: string) => {
    if (room?.currentStoryId) {
      vote(room.currentStoryId, value as any);
    }
  };

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p>Connecting to room...</p>
              <Button onClick={syncRoom} className="mt-4">
                Retry Connection
              </Button>
            </div>
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