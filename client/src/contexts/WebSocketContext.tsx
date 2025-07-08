import React, { createContext, useContext, useEffect, useState } from 'react';
import { WebSocketContextType } from '@/types';
import { getWebSocketInstance } from '@/socket';

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketInstance = getWebSocketInstance();

  useEffect(() => {
    // Configure WebSocket with environment variable
    let wsUrl = import.meta.env.VITE_WEBSOCKET_URL;
    
    // If no URL provided (production with proxy), use relative WebSocket path
    if (!wsUrl || wsUrl.trim() === '' || wsUrl === 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      wsUrl = `${protocol}//${host}/ws`;
    }
    socketInstance.configure({ url: wsUrl });

    // Set up event listeners
    const handleConnected = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

<<<<<<< HEAD
    const handleMessage = (data: any) => {
      // Listen for socket ID from server
      if (data.type === 'SOCKET_ID') {
        socketInstance.setSocketId(data.payload.socketId);
        console.log('Socket ID received:', data.payload.socketId);
      }
    };

=======
>>>>>>> origin/main
    const handleDisconnected = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    const handleError = (error: any) => {
      console.error('WebSocket error:', error);
    };

    socketInstance.on('connected', handleConnected);
    socketInstance.on('disconnected', handleDisconnected);
    socketInstance.on('error', handleError);
<<<<<<< HEAD
    socketInstance.on('message', handleMessage);
=======
>>>>>>> origin/main

    // Auto-connect on component mount
    socketInstance.connect().catch((error) => {
      console.error('Failed to auto-connect:', error);
    });

    return () => {
      socketInstance.off('connected', handleConnected);
      socketInstance.off('disconnected', handleDisconnected);
      socketInstance.off('error', handleError);
<<<<<<< HEAD
      socketInstance.off('message', handleMessage);
=======
>>>>>>> origin/main
    };
  }, []);

  const connect = async (url?: string) => {
    try {
      if (url) {
        socketInstance.configure({ url });
      }
      await socketInstance.connect();
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
    }
  };

  const disconnect = () => {
    socketInstance.disconnect();
  };

  const sendMessage = (message: any) => {
    try {
      socketInstance.send(message);
    } catch (error) {
      console.warn('Cannot send message:', error);
    }
  };

  const value: WebSocketContextType = {
    socket: null, // We don't expose the raw socket anymore
    isConnected,
    connect,
    disconnect,
    sendMessage,
    // Add methods expected by tests
    send: sendMessage,
    on: (event: string, handler: Function) => socketInstance.on(event, handler),
    off: (event: string, handler: Function) => socketInstance.off(event, handler),
<<<<<<< HEAD
    getSocketId: () => socketInstance.getSocketId(),
=======
>>>>>>> origin/main
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};