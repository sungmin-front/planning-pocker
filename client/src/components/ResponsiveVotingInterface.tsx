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

  // Determine layout configuration based on screen size
  const getLayoutConfig = () => {
    if (isMobile) {
      // Mobile: 3 columns in rows
      return 'flex flex-wrap justify-center';
    }
    if (isTablet) {
      // Tablet: flex layout with wrapping
      return 'flex flex-wrap justify-center';
    }
    // Desktop: single row flex layout
    return 'flex justify-center flex-wrap';
  };

  // Determine button size based on screen size - match PlayerCard exactly
  const getButtonSize = () => {
    if (isMobile) {
      return 'h-16 w-12 flex-shrink-0'; // Exact same as PlayerCard
    }
    if (isTablet) {
      return 'h-16 w-12 flex-shrink-0'; // Exact same as PlayerCard
    }
    return 'h-16 w-12 flex-shrink-0'; // Exact same as PlayerCard (w-12 h-16 = 48px x 64px)
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
            'w-full',
            getLayoutConfig(),
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
                  'font-bold text-lg rounded shadow transition-all duration-200',
                  'border border-gray-300 hover:scale-105 active:scale-95 flex items-center justify-center',
                  getButtonSize(),
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg'
                    : 'bg-white text-gray-800 border-gray-300 hover:border-primary hover:text-primary',
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