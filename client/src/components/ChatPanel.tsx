import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRoom } from '@/contexts/RoomContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, X, Minus, ChevronUp, ChevronDown } from 'lucide-react';
import { ChatMessage, TypingIndicator } from '@planning-poker/shared';
import { FormattedMessage } from '@/components/FormattedMessage';
import { FormattingHelpTooltip } from '@/components/FormattingHelpTooltip';

interface ChatPanelProps {
  className?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ className = '' }) => {
  const { room, currentPlayer, sendChatMessage, requestChatHistory, startTyping, stopTyping } = useRoom();
  const [message, setMessage] = useState('');
  const [isOpen, setIsOpen] = useState(() => {
    // Load state from localStorage, default to true
    try {
      const saved = localStorage.getItem('planning-poker-chat-panel-open');
      return saved !== null && saved !== undefined ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSeenMessageId, setLastSeenMessageId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chatMessages = room?.chatMessages || [];
  const typingUsers = room?.typingUsers || [];

  // Request chat history when component mounts
  useEffect(() => {
    requestChatHistory();
  }, [requestChatHistory]);

  // Save panel state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('planning-poker-chat-panel-open', JSON.stringify(isOpen));
  }, [isOpen]);

  // Track unread messages when panel is closed
  useEffect(() => {
    if (chatMessages.length === 0) return;

    const latestMessage = chatMessages[chatMessages.length - 1];
    
    if (isOpen) {
      // Panel is open, mark all messages as read
      setUnreadCount(0);
      setLastSeenMessageId(latestMessage.id);
    } else {
      // Panel is closed, count unread messages
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
  }, [chatMessages, isOpen, lastSeenMessageId]);

  // Auto-scroll to bottom when new messages arrive and panel is open
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
    return currentPlayer?.nickname || 'Unknown';
  };

  const handleTogglePanel = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const TypingIndicators: React.FC = () => {
    if (typingUsers.length === 0) return null;

    const typingNames = typingUsers
      .filter(user => user.playerId !== currentPlayer?.id)
      .map(user => user.playerNickname);

    if (typingNames.length === 0) return null;

    let displayText = '';
    if (typingNames.length === 1) {
      displayText = `${typingNames[0]} is typing...`;
    } else if (typingNames.length === 2) {
      displayText = `${typingNames[0]} and ${typingNames[1]} are typing...`;
    } else {
      displayText = `${typingNames.slice(0, -1).join(', ')} and ${typingNames[typingNames.length - 1]} are typing...`;
    }

    return (
      <div className="text-xs text-gray-500 italic px-3 py-1 bg-gray-100 rounded-md mb-2 animate-pulse">
        {displayText}
      </div>
    );
  };

  if (!room) return null;

  return (
    <Card className={`flex flex-col transition-all duration-300 ease-in-out ${isOpen ? 'h-full' : 'h-auto'} ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Chat
            {isOpen && chatMessages.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {chatMessages.length}
              </Badge>
            )}
            {!isOpen && unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2 animate-pulse">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTogglePanel}
              aria-label={isOpen ? "Minimize chat" : "Expand chat"}
              className="transition-transform duration-200 hover:scale-110"
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}>
        <CardContent className="flex flex-col flex-1 p-4 pt-0">
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-3 min-h-[200px] max-h-[400px] border rounded-md p-3 bg-gray-50">
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              chatMessages.map((msg: ChatMessage) => (
                <div key={msg.id} className="flex flex-col space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {msg.sender}
                      {msg.sender === getCurrentPlayerName() && (
                        <span className="text-xs text-gray-500 ml-1">(You)</span>
                      )}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(msg.timestamp)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 bg-white p-2 rounded border">
                    <FormattedMessage content={msg.content} />
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing Indicators */}
          <TypingIndicators />

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              type="text"
              value={message}
              onChange={handleInputChange}
              placeholder="Type your message... (supports **bold**, *italic*, `code`)"
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
              <span className="sr-only">Send</span>
            </Button>
          </form>
          
          {/* Character count */}
          <div className="text-xs text-gray-500 mt-1 text-right">
            {message.length}/1000
          </div>
        </CardContent>
      </div>
    </Card>
  );
};