import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRoom } from '@/contexts/RoomContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { AddStoryModal } from '@/components/HostControls/AddStoryModal';
import { JiraIntegrationModal } from '@/components/HostControls/JiraIntegrationModal';
import { Plus, FileText, Play } from 'lucide-react';

export const HostActions: React.FC = () => {
  const { room, isHost, syncRoom } = useRoom();
  const { send } = useWebSocket();
  const [isAddStoryModalOpen, setIsAddStoryModalOpen] = useState(false);
  const [isJiraModalOpen, setIsJiraModalOpen] = useState(false);

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
      <div className="hidden lg:block mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => setIsAddStoryModalOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Story
              </Button>
              
              <Button 
                onClick={() => setIsJiraModalOpen(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Import from Jira
              </Button>
              
              {room.stories.length > 0 && (
                <Button 
                  onClick={handleStartVotingOnFirstStory}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  Start Voting on First Story
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Host Actions - Shown in sidebar for mobile */}
      <div className="lg:hidden">
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <Button 
                onClick={() => setIsAddStoryModalOpen(true)}
                className="w-full"
              >
                + Add Story
              </Button>
              <Button 
                onClick={() => setIsJiraModalOpen(true)}
                variant="outline"
                className="w-full"
              >
                📋 Import from Jira
              </Button>
              {room.stories.length > 0 && (
                <Button 
                  onClick={handleStartVotingOnFirstStory}
                  variant="outline"
                  className="w-full"
                >
                  Start Voting on First Story
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <AddStoryModal 
        isOpen={isAddStoryModalOpen} 
        onClose={() => setIsAddStoryModalOpen(false)} 
      />
      
      <JiraIntegrationModal
        isOpen={isJiraModalOpen}
        onClose={() => setIsJiraModalOpen(false)}
        roomId={room.id}
        onStoriesImported={() => {
          syncRoom();
        }}
      />
    </>
  );
};