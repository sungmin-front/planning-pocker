import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Input } from '@/components/ui/shadcn/input';
import { Label } from '@/components/ui/shadcn/label';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useRoom } from '@/contexts/RoomContext';
import LanguageToggle from '@/components/LanguageToggle';

export const HomePage: React.FC = () => {
  const [roomId, setRoomId] = useState('');
  const [nickname, setNickname] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { isConnected, connect } = useWebSocket();
  const { createRoom, joinRoom, joinError, nicknameSuggestions, clearJoinError } = useRoom();

  // Reset creating state when navigating away from home page
  useEffect(() => {
    if (location.pathname !== '/') {
      setIsCreating(false);
    }
  }, [location.pathname]);

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
    <>
      {/* 기존 홈페이지 */}
      <div id="main-app" className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="absolute top-4 right-4">
          <LanguageToggle />
        </div>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">{t('app.title')}</CardTitle>
            <p className="text-muted-foreground">
              {t('app.description')}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isConnected && (
              <div className="text-center">
                <Button onClick={handleConnect} className="w-full">
                  {t('connection.connectToServer')}
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  {t('connection.connectToStart')}
                </p>
              </div>
            )}
            
            {isConnected && (
              <>
                <form onSubmit={handleCreateRoom}>
                  <div className="space-y-2">
                    <Label htmlFor="nickname">{t('user.yourNickname')}</Label>
                    <Input
                      id="nickname"
                      type="text"
                      placeholder={t('user.enterNickname')}
                      value={nickname}
                      onChange={(e) => {
                        setNickname(e.target.value);
                        if (joinError) clearJoinError();
                      }}
                      onKeyDown={handleKeyDown}
                    />
                  </div>

                  <Button 
                    type="submit"
                    className="w-full mt-4"
                    disabled={!nickname.trim() || isCreating}
                  >
                    {isCreating ? t('room.creating') : t('room.createNewRoom')}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      {t('room.orJoinExistingRoom')}
                    </span>
                  </div>
                </div>

                <form onSubmit={handleJoinRoom}>
                  <div className="space-y-2">
                    <Label htmlFor="roomId">{t('room.roomId')}</Label>
                    <Input
                      id="roomId"
                      type="text"
                      placeholder={t('room.enterRoomId')}
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
                    {t('room.joinRoom')}
                  </Button>
                </form>

                {/* Nickname conflict error and suggestions */}
                {joinError?.includes('already taken') && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md mt-4">
                    <p className="text-sm text-yellow-800 mb-2">{joinError}</p>
                    {nicknameSuggestions.length > 0 && (
                      <div>
                        <p className="text-sm text-yellow-700 mb-2">{t('user.tryTheseSuggestions')}</p>
                        <div className="flex flex-wrap gap-2">
                          {nicknameSuggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => {
                                setNickname(suggestion);
                                clearJoinError();
                              }}
                              className="px-2 py-1 text-xs bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 rounded transition-colors"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};