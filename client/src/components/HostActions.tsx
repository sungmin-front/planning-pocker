import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRoom } from '@/contexts/RoomContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { VotingControls } from '@/components/HostControls/VotingControls';
import { Play } from 'lucide-react';

export const HostActions: React.FC = () => {
  const { room, isHost } = useRoom();
  const { send } = useWebSocket();

  // Only render for hosts
  if (!isHost || !room) {
    return null;
  }

  const handleStartVotingOnFirstStory = () => {
    if (room.stories.length > 0) {
      const firstStory = room.stories[0];
      send({
        type: 'STORY_SELECT',
        payload: {
          storyId: firstStory.id
        }
      });
    }
  };

  return (
    <>
      {/* Host Actions Bar - Only visible on larger screens */}
      <div className="hidden lg:block mb-6 space-y-4">
        {room.stories.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <Button 
                onClick={handleStartVotingOnFirstStory}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Start Voting on First Story
              </Button>
            </CardContent>
          </Card>
        )}
        
        {/* Voting Controls */}
        <VotingControls />
      </div>

      {/* Mobile Host Actions - Shown in sidebar for mobile */}
      <div className="lg:hidden space-y-4">
        {room.stories.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <Button 
                onClick={handleStartVotingOnFirstStory}
                className="w-full"
              >
                Start Voting on First Story
              </Button>
            </CardContent>
          </Card>
        )}
        
        {/* Voting Controls */}
        <VotingControls />
      </div>

    </>
  );
};