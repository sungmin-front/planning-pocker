import { useEffect, useRef } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';

export function useAutoSync(enabled = true, interval = 10000) {
  const syncTimerRef = useRef<number | null>(null);
  const { socket } = useWebSocket();
  
  useEffect(() => {
    if (!enabled || !socket) return;
    
    // Function to check if tab is visible
    const isTabVisible = () => document.visibilityState === 'visible';
    
    // Sync function that only runs when tab is visible
    const syncIfVisible = () => {
      if (isTabVisible()) {
        socket.emit('room:sync');
      }
    };
    
    // Set up interval
    syncTimerRef.current = window.setInterval(syncIfVisible, interval);
    
    // Also sync when tab becomes visible again
    const handleVisibilityChange = () => {
      if (isTabVisible()) {
        socket.emit('room:sync');
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Initial sync
    syncIfVisible();
    
    return () => {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, interval, socket]);
  
  return null;
}