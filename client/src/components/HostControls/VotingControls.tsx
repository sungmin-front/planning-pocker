import React, { useState } from 'react';
import { useRoom } from '@/contexts/RoomContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Eye, RotateCcw, SkipForward, Play, ChevronRight } from 'lucide-react';

interface VotingControlsProps {
  compact?: boolean;
}

export const VotingControls: React.FC<VotingControlsProps> = ({ compact = false }) => {
  const { room, isHost, revealVotes, restartVoting, skipStory } = useRoom();
  const { send } = useWebSocket();

  // Only render for hosts
  if (!isHost || !room) {
    return null;
  }

  // Handle starting voting on first story
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

  // If no current story but there are stories, show start voting option
  if (!room.currentStoryId && room.stories.length > 0) {
    return (
      <div className="w-full bg-white rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium">Voting Controls</h3>
          <Button
            onClick={handleStartVotingOnFirstStory}
            size="sm"
            className="h-8 text-sm"
          >
            <Play className="h-3 w-3 mr-2" />
            Start Voting
          </Button>
        </div>
      </div>
    );
  }

  // If no stories at all, show nothing
  if (!room.currentStoryId) {
    return null;
  }

  const currentStory = room.stories.find(story => story.id === room.currentStoryId);
  
  // Only show when there's an active story
  if (!currentStory) {
    return null;
  }

  const votes = currentStory.votes || {};
  const totalVotes = Object.keys(votes).length;
  const totalPlayers = room.players.filter(p => !p.isSpectator).length;
  const votingProgress = totalPlayers > 0 ? Math.round((totalVotes / totalPlayers) * 100) : 0;

  const handleRevealVotes = () => {
    if (room.currentStoryId) {
      revealVotes(room.currentStoryId);
    }
  };

  const handleRestartVoting = () => {
    if (room.currentStoryId) {
      restartVoting(room.currentStoryId);
    }
  };

  const handleSkipStory = () => {
    if (room.currentStoryId) {
      skipStory(room.currentStoryId);
    }
  };

  // Find next pending story (excluding finalized ones unless manually re-selected)
  const getNextPendingStory = () => {
    room.stories.forEach((s, index) => {
      console.log(`Story ${index + 1}:`, {
        title: s.title,
        status: s.status,
        final_point: s.final_point,
        id: s.id
      });
    });
    
    const pendingStories = room.stories.filter(story => 
      (story.status === 'pending' || story.status === 'voting') && 
      (story.final_point === undefined || story.final_point === null)
    );
    
    console.log('getNextPendingStory Debug - filtered pending stories:', pendingStories.map(s => ({
      id: s.id,
      title: s.title,
      status: s.status,
      final_point: s.final_point
    })));
    
    return pendingStories.length > 0 ? pendingStories[0] : null;
  };

  const handleNextStory = () => {
    const nextStory = getNextPendingStory();
    if (nextStory) {
      send({
        type: 'STORY_SELECT',
        payload: { storyId: nextStory.id }
      });
    }
  };

  const getStatusBadge = () => {
    switch (currentStory.status) {
      case 'voting':
        return <Badge variant="default" className="bg-blue-100 text-blue-800 text-xs">투표중</Badge>;
      case 'revealed':
        return <Badge variant="default" className="bg-green-100 text-green-800 text-xs">공개됨</Badge>;
      case 'closed':
        return <Badge variant="default" className="bg-gray-100 text-gray-800 text-xs">완료</Badge>;
      case 'skipped':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800 text-xs">건너뜀</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">준비</Badge>;
    }
  };

  // Compact version for poker table
  if (compact) {
    const nextStory = getNextPendingStory();
    
    return (
      <div data-testid="voting-controls-compact" className="flex items-center gap-1 p-2 bg-white/90 backdrop-blur-sm rounded-lg border border-white/20 shadow-sm">
        {/* Control Buttons - Compact */}
        <div className="flex gap-1">
          {currentStory.status === 'voting' && (
            <Button
              onClick={handleRevealVotes}
              size="sm"
              disabled={totalVotes === 0}
              data-testid="reveal-votes-button"
              className="h-7 px-2 text-xs"
            >
              <Eye className="h-3 w-3" />
            </Button>
          )}

          {(currentStory.status === 'revealed' || currentStory.status === 'voting') && (
            <Button
              onClick={handleRestartVoting}
              variant="outline"
              size="sm"
              data-testid="restart-voting-button"
              className="h-7 px-2 text-xs"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}

          {(currentStory.status === 'voting' || currentStory.status === 'revealed') && (
            <Button
              onClick={handleSkipStory}
              variant="destructive"
              size="sm"
              data-testid="skip-story-button"
              className="h-7 px-2 text-xs"
            >
              <SkipForward className="h-3 w-3" />
            </Button>
          )}

          {/* Next Issue Button - Show when current story is completed and there's a next story */}
          {(currentStory.status === 'closed' || currentStory.status === 'skipped') && nextStory && (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleNextStory}
                    variant="default"
                    size="sm"
                    data-testid="next-story-button"
                    className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-black text-white text-xs p-2 rounded">
                  <p>다음 이슈: {nextStory.title}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    );
  }

  // Original full version for sidebar
  const getStatusDisplay = () => {
    switch (currentStory.status) {
      case 'voting':
        return {
          badge: <Badge variant="default" className="bg-blue-100 text-blue-800">Voting in Progress</Badge>,
          description: 'Players are currently voting'
        };
      case 'revealed':
        return {
          badge: <Badge variant="default" className="bg-green-100 text-green-800">Votes Revealed</Badge>,
          description: 'All votes are now visible to everyone'
        };
      case 'closed':
        return {
          badge: <Badge variant="default" className="bg-gray-100 text-gray-800">Story Completed</Badge>,
          description: `Final points: ${currentStory.final_point || 'Not set'}`
        };
      case 'skipped':
        return {
          badge: <Badge variant="default" className="bg-yellow-100 text-yellow-800">Story Skipped</Badge>,
          description: 'This story has been skipped'
        };
      default:
        return {
          badge: <Badge variant="outline">Ready</Badge>,
          description: 'Ready to start voting'
        };
    }
  };

  const status = getStatusDisplay();
  const nextStory = getNextPendingStory();

  // Debug logs
  console.log('VotingControls Debug:', {
    currentStoryStatus: currentStory.status,
    currentStoryId: currentStory.id,
    nextStory: nextStory ? { id: nextStory.id, title: nextStory.title, status: nextStory.status } : null,
    shouldShowNextButton: (currentStory.status === 'closed' || currentStory.status === 'skipped') && nextStory
  });

  return (
    <div data-testid="voting-controls" className="w-full bg-white rounded-lg border p-3">
      {/* Horizontal Layout */}
      <div className="flex items-center justify-between gap-4">
        {/* Left Side: Status and Progress */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h3 className="text-base font-medium whitespace-nowrap">Voting Controls</h3>
        </div>

        {/* Right Side: Control Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Reveal Votes Button */}
          {currentStory.status === 'voting' && (
            <Button
              onClick={handleRevealVotes}
              size="sm"
              className="h-8 text-xs whitespace-nowrap"
              disabled={totalVotes === 0}
              data-testid="reveal-votes-button"
            >
              <Eye className="h-3 w-3 mr-1" />
              Reveal
            </Button>
          )}

          {/* Restart and Skip Buttons */}
          {(currentStory.status === 'revealed' || currentStory.status === 'voting') && (
            <>
              <Button
                onClick={handleRestartVoting}
                variant="outline"
                size="sm"
                className="h-8 text-xs whitespace-nowrap"
                data-testid="restart-voting-button"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Restart
              </Button>
              <Button
                onClick={handleSkipStory}
                variant="destructive"
                size="sm"
                className="h-8 text-xs whitespace-nowrap"
                data-testid="skip-story-button"
              >
                <SkipForward className="h-3 w-3 mr-1" />
                Skip
              </Button>
            </>
          )}

          {/* Next Issue Button - Show when current story is completed and there's a next story */}
          {(currentStory.status === 'closed' || currentStory.status === 'skipped') && nextStory && (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleNextStory}
                    variant="default"
                    size="sm"
                    className="h-8 text-xs whitespace-nowrap bg-green-600 hover:bg-green-700"
                    data-testid="next-story-button"
                  >
                    <ChevronRight className="h-3 w-3 mr-1" />
                    Next Issue
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-black text-white text-xs p-2 rounded">
                  <p>다음 이슈: {nextStory.title}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Help Text - Only show when needed and compact */}
      {currentStory.status === 'voting' && totalVotes === 0 && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Wait for votes before revealing
        </p>
      )}
    </div>
  );
};