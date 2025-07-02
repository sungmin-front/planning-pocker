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

  // Determine grid configuration based on screen size - full width coverage
  const getGridConfig = () => {
    const totalOptions = VOTE_OPTIONS.length; // 9 options
    if (isMobile) {
      // Use 3 rows for mobile to cover full width
      return 'grid-cols-3';
    }
    if (isTablet) {
      // Use full width on tablet
      return 'grid-cols-5';
    }
    // Desktop - use all 9 columns for full width
    return 'grid-cols-9';
  };

  // Determine button size based on screen size - now flexible width
  const getButtonSize = () => {
    if (isMobile) {
      return 'h-14 w-full min-w-0'; // Full width on mobile
    }
    if (isTablet) {
      return 'h-13 w-full min-w-0'; // Full width on tablet
    }
    return 'h-12 w-full min-w-0'; // Full width on desktop
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
        'bg-white rounded-lg border shadow-sm w-full',
        getContainerPadding()
      )}
    >
      <div className="space-y-3">
        <div 
          data-testid={getLayoutTestId()}
          className={cn(
            'grid place-items-center w-full',
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