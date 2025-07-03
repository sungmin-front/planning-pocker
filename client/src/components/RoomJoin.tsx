import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRoom } from '@/contexts/RoomContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import LanguageToggle from '@/components/LanguageToggle';

interface FormData {
  roomId: string;
  nickname: string;
}

interface FormErrors {
  roomId?: string;
  nickname?: string;
  general?: string;
}

export const RoomJoin: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { roomId: urlRoomId } = useParams<{ roomId: string }>();
  const { t } = useTranslation();
  const { joinRoom, joinError, nicknameSuggestions, clearJoinError } = useRoom();
  const { isConnected } = useWebSocket();
  
  const [formData, setFormData] = useState<FormData>({
    roomId: urlRoomId || searchParams.get('roomId') || '',
    nickname: ''
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  // Update roomId from URL params
  useEffect(() => {
    if (urlRoomId && urlRoomId !== formData.roomId) {
      setFormData(prev => ({
        ...prev,
        roomId: urlRoomId
      }));
    }
  }, [urlRoomId]);

  // Focus on nickname input if room ID is preset
  useEffect(() => {
    if (formData.roomId && !formData.nickname) {
      const nicknameInput = document.getElementById('nickname') as HTMLInputElement;
      if (nicknameInput) {
        nicknameInput.focus();
      }
    }
  }, [formData.roomId, formData.nickname]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate room ID
    const trimmedRoomId = formData.roomId.trim();
    if (!trimmedRoomId) {
      newErrors.roomId = 'Room ID is required';
    }

    // Validate nickname
    const trimmedNickname = formData.nickname.trim();
    if (!trimmedNickname) {
      newErrors.nickname = 'Nickname is required';
    } else if (trimmedNickname.length < 2) {
      newErrors.nickname = 'Nickname must be at least 2 characters';
    } else if (trimmedNickname.length > 30) {
      newErrors.nickname = 'Nickname must be less than 30 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const trimmedRoomId = formData.roomId.trim().toUpperCase();
      const trimmedNickname = formData.nickname.trim();

      const success = await joinRoom(trimmedRoomId, trimmedNickname);
      
      if (success) {
        navigate(`/room/${trimmedRoomId}?nickname=${encodeURIComponent(trimmedNickname)}`);
      } else {
        setErrors({
          general: 'Failed to join room. Please check the room ID and try again.'
        });
      }
    } catch (error) {
      setErrors({
        general: 'An unexpected error occurred. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    
    // Clear field-specific errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }

    // Clear join error when user starts typing in nickname field
    if (field === 'nickname' && joinError) {
      clearJoinError();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setFormData(prev => ({
      ...prev,
      nickname: suggestion
    }));
    clearJoinError();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e as any);
    }
  };

  const isFormDisabled = !isConnected || isLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <h1 className="text-2xl font-semibold leading-none tracking-tight">{t('room.joinRoom')}</h1>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Room ID Input */}
            <div className="space-y-2">
              <Label htmlFor="roomId">{t('room.roomId')}</Label>
              <Input
                id="roomId"
                type="text"
                value={formData.roomId}
                onChange={handleInputChange('roomId')}
                onKeyDown={handleKeyDown}
                placeholder={t('room.enterRoomId')}
                disabled={isFormDisabled || !!urlRoomId}
                readOnly={!!urlRoomId}
                className={errors.roomId ? 'border-red-500' : ''}
              />
              {errors.roomId && (
                <p className="text-sm text-red-500">{errors.roomId}</p>
              )}
            </div>

            {/* Nickname Input */}
            <div className="space-y-2">
              <Label htmlFor="nickname">{t('user.yourNickname')}</Label>
              <Input
                id="nickname"
                type="text"
                value={formData.nickname}
                onChange={handleInputChange('nickname')}
                onKeyDown={handleKeyDown}
                placeholder={t('user.enterNickname')}
                disabled={isFormDisabled}
                className={errors.nickname || joinError?.includes('already taken') ? 'border-red-500' : ''}
              />
              {errors.nickname && (
                <p className="text-sm text-red-500">{errors.nickname}</p>
              )}
              
              {/* Nickname conflict error and suggestions */}
              {joinError?.includes('already taken') && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800 mb-2">{joinError}</p>
                  {nicknameSuggestions.length > 0 && (
                    <div>
                      <p className="text-sm text-yellow-700 mb-2">{t('user.tryTheseSuggestions')}</p>
                      <div className="flex flex-wrap gap-2">
                        {nicknameSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="px-2 py-1 text-xs bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 rounded transition-colors"
                            disabled={isFormDisabled}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* General Error */}
            {errors.general && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.general}</p>
              </div>
            )}

            {/* Other join errors (non-nickname conflicts) */}
            {joinError && !joinError.includes('already taken') && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{joinError}</p>
              </div>
            )}

            {/* Connection Status */}
            {!isConnected && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-600">{t('connection.connectToServerFirst')}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
                className="flex-1"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isFormDisabled}
                className="flex-1"
              >
                {isLoading ? t('room.joining') : t('room.joinRoom')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};