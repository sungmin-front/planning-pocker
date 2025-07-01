import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useWebSocket } from '@/contexts/WebSocketContext';

export const SyncButton: React.FC = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const { send } = useWebSocket();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleSync = () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    
    try {
      send({
        type: 'ROOM_SYNC',
        payload: {}
      });
      
      // Fallback to reset syncing state
      timeoutRef.current = setTimeout(() => {
        setIsSyncing(false);
        timeoutRef.current = null;
      }, 3000);
    } catch (error) {
      console.error('Sync failed:', error);
      setIsSyncing(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  };
  
  return (
    <Button 
      onClick={handleSync} 
      disabled={isSyncing}
      size="sm"
      variant="outline"
      className="sync-button"
      type="button"
    >
      {isSyncing ? 'Syncing...' : '🔄 Sync'}
    </Button>
  );
};