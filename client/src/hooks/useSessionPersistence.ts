import { useEffect, useState, useCallback } from 'react';

export interface RoomSession {
  roomId: string;
  nickname: string;
  timestamp: number;
  socketId?: string; // Previous socket connection ID for session cleanup
}

const SESSION_KEY = 'planning-poker-session';
const SESSION_EXPIRY_TIME = 2 * 60 * 60 * 1000; // 2 hours

export const useSessionPersistence = () => {
  const [session, setSession] = useState<RoomSession | null>(null);

  // Load session from localStorage on mount
  useEffect(() => {
    try {
      const storedSession = localStorage.getItem(SESSION_KEY);
      if (storedSession) {
        const parsedSession: RoomSession = JSON.parse(storedSession);
        
        // Check if session is expired
        if (Date.now() - parsedSession.timestamp > SESSION_EXPIRY_TIME) {
          localStorage.removeItem(SESSION_KEY);
          setSession(null);
        } else {
          setSession(parsedSession);
        }
      }
    } catch (error) {
      console.error('Failed to load session from localStorage:', error);
      localStorage.removeItem(SESSION_KEY);
      setSession(null);
    }
  }, []);

  // Listen for localStorage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === SESSION_KEY) {
        if (event.newValue === null) {
          setSession(null);
        } else {
          try {
            const parsedSession: RoomSession = JSON.parse(event.newValue);
            setSession(parsedSession);
          } catch (error) {
            console.error('Failed to parse session from storage event:', error);
            setSession(null);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Save session to localStorage
  const saveSession = useCallback((roomId: string, nickname: string, socketId?: string) => {
    try {
      const newSession: RoomSession = {
        roomId,
        nickname,
        timestamp: Date.now(),
        socketId,
      };
      
      localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
      setSession(newSession);
    } catch (error) {
      console.error('Failed to save session to localStorage:', error);
    }
  }, []);

  // Clear session from localStorage
  const clearSession = useCallback(() => {
    try {
      localStorage.removeItem(SESSION_KEY);
      setSession(null);
    } catch (error) {
      console.error('Failed to clear session from localStorage:', error);
    }
  }, []);

  // Check if current room/nickname matches session
  const hasValidSession = useCallback((roomId: string, nickname?: string) => {
    if (!session) return false;
    if (session.roomId !== roomId) return false;
    if (nickname && session.nickname !== nickname) return false;
    
    // Check if session is still valid (not expired)
    return Date.now() - session.timestamp <= SESSION_EXPIRY_TIME;
  }, [session]);

  // Update session timestamp to extend expiry
  const refreshSession = useCallback(() => {
    if (session) {
      saveSession(session.roomId, session.nickname);
    }
  }, [session, saveSession]);

  return {
    session,
    saveSession,
    clearSession,
    hasValidSession,
    refreshSession,
  };
};