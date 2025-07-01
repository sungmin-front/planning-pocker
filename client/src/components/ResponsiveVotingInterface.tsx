import React from 'react';
import { useRoom } from '@/contexts/RoomContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const VOTE_OPTIONS = ['1', '2', '3', '5', '8', '13', '21', '?', '☕'];

export const ResponsiveVotingInterface: React.FC = () => {
  const { room, currentPlayer, vote } = useRoom();
  const { isMobile, isTablet, currentBreakpoint, screenSize } = useBreakpoint();

  if (!room || !room.currentStoryId) {
    return null;
  }

  const currentStory = room.stories.find(story => story.id === room.currentStoryId);
  
  if (!currentStory || currentStory.status !== 'voting') {
    return null;
  }

  const currentVote = currentPlayer ? currentStory.votes[currentPlayer.id] : null;

  const handleVote = (voteValue: string) => {
    if (currentStory) {
      vote(currentStory.id, voteValue);
    }
  };

  // Determine grid configuration based on screen size
  const getGridConfig = () => {
    if (isMobile) {
      // Use 4 columns on very small screens, 5 on larger mobile
      return screenSize.width < 400 ? 'grid-cols-4' : 'grid-cols-5';
    }
    if (isTablet) {
      return 'grid-cols-5';
    }
    // Desktop and larger
    return 'grid-cols-5';
  };

  // Determine button size based on screen size
  const getButtonSize = () => {
    if (isMobile) {
      return 'h-14 w-14'; // Larger touch targets on mobile
    }
    if (isTablet) {
      return 'h-13 w-13'; // Slightly smaller on tablet
    }
    return 'h-12 w-12'; // Standard size on desktop
  };

  // Determine container padding based on screen size
  const getContainerPadding = () => {
    if (isMobile) {
      return 'p-4';
    }
    if (isTablet) {
      return 'p-5';
    }
    return 'p-6';
  };

  // Determine gap size based on screen size
  const getGapSize = () => {
    if (isMobile) {
      return 'gap-2';
    }
    if (isTablet) {
      return 'gap-3';
    }
    return 'gap-4';
  };

  // Get test ID for current layout
  const getLayoutTestId = () => {
    if (isMobile) return 'mobile-vote-grid';
    if (isTablet) return 'tablet-vote-grid';
    return 'desktop-vote-grid';
  };

  return (
    <div 
      data-testid="voting-interface"
      className={cn(
        'bg-white rounded-lg border shadow-sm',
        getContainerPadding()
      )}
    >
      <div className="space-y-4">
        <div className="text-center">
          <h3 className={cn(
            'font-semibold text-gray-900',
            isMobile ? 'text-lg' : 'text-xl'
          )}>
            Select your vote
          </h3>
          <p className={cn(
            'text-gray-600 mt-1',
            isMobile ? 'text-sm' : 'text-base'
          )}>
            Choose a story point value
          </p>
        </div>

        <div 
          data-testid={getLayoutTestId()}
          className={cn(
            'grid place-items-center',
            getGridConfig(),
            getGapSize()
          )}
        >
          {VOTE_OPTIONS.map((option) => {
            const isSelected = currentVote === option;
            
            return (
              <Button
                key={option}
                type="button"
                onClick={() => handleVote(option)}
                aria-label={`Vote for ${option} points`}
                className={cn(
                  'font-bold text-lg rounded-lg transition-all duration-200',
                  'border-2 hover:scale-105 active:scale-95',
                  getButtonSize(),
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary',
                  // Enhanced touch targets for mobile
                  isMobile && 'touch-manipulation',
                  // Special styling for special votes
                  (option === '?' || option === '☕') && 'text-xl'
                )}
              >
                {option}
              </Button>
            );
          })}
        </div>

        {/* Current vote indicator */}
        {currentVote && (
          <div className="text-center">
            <div className={cn(
              'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary',
              isMobile ? 'text-xs' : 'text-sm'
            )}>
              Your vote: <span className="ml-1 font-bold">{currentVote}</span>
            </div>
          </div>
        )}

        {/* Mobile-specific quick actions */}
        {isMobile && currentVote && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleVote(currentVote)}
              className="text-xs"
            >
              Change Vote
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};