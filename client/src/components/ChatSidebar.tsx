import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRoom } from '@/contexts/RoomContext';
import { Button } from '@/components/ui/shadcn/button';
import { Input } from '@/components/ui/shadcn/input';
import { Badge } from '@/components/ui/shadcn/badge';
import { MessageCircle, Send, X, ChevronRight } from 'lucide-react';
import { ChatMessage, TypingIndicator } from '@planning-poker/shared';
import { FormattedMessage } from '@/components/FormattedMessage';
import { FormattingHelpTooltip } from '@/components/FormattingHelpTooltip';
import { useTranslation } from 'react-i18next';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { room, currentPlayer, sendChatMessage, requestChatHistory, startTyping, stopTyping } = useRoom();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chatMessages = room?.chatMessages || [];
  const typingUsers = room?.typingUsers || [];

  // Chat history is now automatically loaded in RoomContext when joining a room
  // No need to request it again here

  // Auto-scroll to bottom when new messages arrive and sidebar is open
  useEffect(() => {
    if (isOpen && messagesEndRef.current && messagesEndRef.current.scrollIntoView) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isOpen]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTyping) {
        stopTyping();
      }
    };
  }, [isTyping, stopTyping]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = message.trim();
    
    if (trimmedMessage) {
      // Stop typing when sending message
      if (isTyping) {
        setIsTyping(false);
        stopTyping();
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      }
      
      sendChatMessage(trimmedMessage);
      setMessage('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Limit message length to 1000 characters
    if (value.length <= 1000) {
      setMessage(value);
      
      // Handle typing indicators
      if (value.length > 0 && !isTyping) {
        setIsTyping(true);
        startTyping();
      }
      
      // Clear existing timeout and set new one
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        if (isTyping) {
          setIsTyping(false);
          stopTyping();
        }
      }, 3000);
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getCurrentPlayerName = () => {
    return currentPlayer?.nickname || t('user.unknown');
  };

  const TypingIndicators: React.FC = () => {
    if (typingUsers.length === 0) return null;

    const typingNames = typingUsers
      .filter(user => user.playerId !== currentPlayer?.id)
      .map(user => user.playerNickname);

    if (typingNames.length === 0) return null;

    let displayText = '';
    if (typingNames.length === 1) {
      displayText = t('chat.isTyping', { name: typingNames[0] });
    } else if (typingNames.length === 2) {
      displayText = t('chat.areTyping', { name1: typingNames[0], name2: typingNames[1] });
    } else {
      displayText = t('chat.multipleTyping', { names: typingNames.slice(0, -1).join(', ') + ' and ' + typingNames[typingNames.length - 1] });
    }

    return (
      <div className="text-xs text-gray-500 italic px-3 py-2 bg-gray-50 rounded-md mb-2 animate-pulse">
        {displayText}
      </div>
    );
  };

  if (!room) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            <h2 className="text-lg font-semibold">{t('chat.chat')}</h2>
            {chatMessages.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {chatMessages.length}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 h-[calc(100vh-140px)]">
          {chatMessages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{t('chat.noMessages')}</p>
            </div>
          ) : (
            chatMessages.map((msg: ChatMessage, index: number) => {
              const isOwnMessage = msg.playerNickname === getCurrentPlayerName();
              const prevMsg = index > 0 ? chatMessages[index - 1] : null;
              
              // Check if this message should be grouped with the previous one
              const shouldGroup = prevMsg && 
                prevMsg.playerNickname === msg.playerNickname &&
                formatTimestamp(prevMsg.timestamp) === formatTimestamp(msg.timestamp);
              
              return (
                <div key={msg.id} className={`flex flex-col ${shouldGroup ? 'mt-1' : 'mt-4'} ${isOwnMessage ? 'items-start' : 'items-end'}`}>
                  {!shouldGroup && (
                    <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? 'flex-row' : 'flex-row-reverse'}`}>
                      <span className="text-sm font-medium text-gray-900">
                        {msg.playerNickname}
                        {isOwnMessage && (
                          <span className="text-xs text-gray-500 ml-1">({t('user.you')})</span>
                        )}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(msg.timestamp)}
                      </span>
                    </div>
                  )}
                  <div className={`text-sm max-w-[85%] p-3 rounded-lg ${shouldGroup ? 'mt-1' : ''} ${
                    isOwnMessage 
                      ? 'bg-blue-100 text-blue-900 border border-blue-200' 
                      : 'bg-gray-100 text-gray-900 border border-gray-200'
                  }`}>
                    <FormattedMessage 
                      content={msg.message} 
                      className="leading-relaxed" 
                    />
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing Indicators */}
        {isOpen && (
          <div className="px-4">
            <TypingIndicators />
          </div>
        )}

        {/* Message Input */}
        <div className="p-4 border-t bg-gray-50">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              type="text"
              value={message}
              onChange={handleInputChange}
              placeholder={t('chat.typeMessage')}
              className="flex-1"
              maxLength={1000}
            />
            <FormattingHelpTooltip />
            <Button 
              type="submit" 
              disabled={!message.trim()}
              size="sm"
              className="px-3"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          
          {/* Character count */}
          <div className="text-xs text-gray-500 mt-1 text-right">
            {message.length}/1000
          </div>
        </div>
      </div>
    </>
  );
};