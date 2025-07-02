import React from 'react';
import { useRoom } from '@/contexts/RoomContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, RotateCcw, Users, SkipForward } from 'lucide-react';

export const VotingControls: React.FC = () => {
  const { room, isHost, revealVotes, restartVoting, skipStory } = useRoom();

  // Only render for hosts
  if (!isHost || !room || !room.currentStoryId) {
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

  const getStatusDisplay = () => {
    switch (currentStory.status) {
      case 'voting':
        return {
          badge: <Badge variant="default" className="bg-blue-100 text-blue-800">Voting in Progress</Badge>,
          description: `${totalVotes} of ${totalPlayers} players have voted (${votingProgress}%)`
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

  return (
    <Card data-testid="voting-controls" className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Voting Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Display */}
        <div className="space-y-2">
          {status.badge}
          <p className="text-sm text-muted-foreground">{status.description}</p>
        </div>

        {/* Progress Bar for Voting Phase */}
        {currentStory.status === 'voting' && totalPlayers > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Voting Progress</span>
              <span>{votingProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${votingProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="space-y-2">
          {/* Reveal Votes Button */}
          {currentStory.status === 'voting' && (
            <Button
              onClick={handleRevealVotes}
              className="w-full"
              disabled={totalVotes === 0}
              data-testid="reveal-votes-button"
            >
              <Eye className="h-4 w-4 mr-2" />
              Reveal Votes
              {totalVotes > 0 && ` (${totalVotes})`}
            </Button>
          )}

          {/* Restart Voting Button */}
          {(currentStory.status === 'revealed' || currentStory.status === 'voting') && (
            <Button
              onClick={handleRestartVoting}
              variant="outline"
              className="w-full"
              data-testid="restart-voting-button"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restart Voting
            </Button>
          )}

          {/* Skip Story Button */}
          {(currentStory.status === 'voting' || currentStory.status === 'revealed') && (
            <Button
              onClick={handleSkipStory}
              variant="destructive"
              className="w-full"
              data-testid="skip-story-button"
            >
              <SkipForward className="h-4 w-4 mr-2" />
              Skip Story
            </Button>
          )}
        </div>

        {/* Help Text */}
        {currentStory.status === 'voting' && totalVotes === 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Wait for players to vote before revealing results
          </p>
        )}
      </CardContent>
    </Card>
  );
};