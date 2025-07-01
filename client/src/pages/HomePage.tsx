import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useRoom } from '@/contexts/RoomContext';

export const HomePage: React.FC = () => {
  const [roomId, setRoomId] = useState('');
  const [nickname, setNickname] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const navigate = useNavigate();
  const { isConnected, connect } = useWebSocket();
  const { createRoom, joinRoom } = useRoom();

  const handleConnect = () => {
    connect('ws://localhost:8080');
  };

  const handleCreateRoom = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nickname.trim()) return;
    setIsCreating(true);
    
    try {
      // Create room via WebSocket
      await createRoom(nickname.trim());
      // Navigation will happen when we receive room:created message
    } catch (error) {
      console.error('Failed to create room:', error);
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!roomId.trim() || !nickname.trim()) return;
    
    try {
      // Join room via WebSocket
      await joinRoom(roomId.trim(), nickname.trim());
      // Navigation will happen when we receive room:joined message
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (roomId.trim()) {
        handleJoinRoom();
      } else {
        handleCreateRoom();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Planning Poker</CardTitle>
          <p className="text-muted-foreground">
            Estimate story points with your team
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected && (
            <div className="text-center">
              <Button onClick={handleConnect} className="w-full">
                Connect to Server
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                Connect to start playing
              </p>
            </div>
          )}
          
          {isConnected && (
            <>
              <form onSubmit={handleCreateRoom}>
                <div className="space-y-2">
                  <Label htmlFor="nickname">Your Nickname</Label>
                  <Input
                    id="nickname"
                    type="text"
                    placeholder="Enter your nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </div>

                <Button 
                  type="submit"
                  className="w-full mt-4"
                  disabled={!nickname.trim() || isCreating}
                >
                  {isCreating ? 'Creating...' : 'Create New Room'}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or join existing room
                  </span>
                </div>
              </div>

              <form onSubmit={handleJoinRoom}>
                <div className="space-y-2">
                  <Label htmlFor="roomId">Room ID</Label>
                  <Input
                    id="roomId"
                    type="text"
                    placeholder="Enter room ID"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                    onKeyDown={handleKeyDown}
                  />
                </div>

                <Button 
                  type="submit"
                  variant="outline" 
                  className="w-full mt-4"
                  disabled={!roomId.trim() || !nickname.trim()}
                >
                  Join Room
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};