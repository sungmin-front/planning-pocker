import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { cn } from '@/lib/utils';

// Default Fibonacci sequence vote options
const DEFAULT_VOTE_OPTIONS = ['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕'];

export interface VotingInterfaceProps {
  onVote: (vote: string | null) => void;
  currentStoryId?: string | null;
  selectedVote?: string | null;
  disabled?: boolean;
  voteOptions?: string[];
  statusMessage?: string;
  showConfirmation?: boolean;
  className?: string;
  isLoading?: boolean;
  voteCount?: Record<string, number>;
  showVoteCount?: boolean;
}

export const VotingInterface: React.FC<VotingInterfaceProps> = ({
  onVote,
  currentStoryId = null,
  selectedVote = null,
  disabled = false,
  voteOptions = DEFAULT_VOTE_OPTIONS,
  statusMessage,
  showConfirmation = false,
  className,
  isLoading = false,
  voteCount = {},
  showVoteCount = false
}) => {
  const { t } = useTranslation();
  const isVotingDisabled = disabled || !currentStoryId || isLoading;

  const handleVote = (vote: string) => {
    if (isVotingDisabled) return;
    onVote(vote);
  };

  const handleClearVote = () => {
    if (isVotingDisabled) return;
    onVote(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent, vote: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleVote(vote);
    }
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle>{t('voting.castYourVote')}</CardTitle>
      </CardHeader>
      <CardContent>
        {!currentStoryId ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground">{t('voting.noStoryToVoteOn')}</p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground">{t('voting.submittingVote')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status Message */}
            {statusMessage && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{statusMessage}</p>
              </div>
            )}

            {/* Vote Confirmation */}
            {showConfirmation && selectedVote && (
              <div className="text-center p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700">Your vote: {selectedVote}</p>
              </div>
            )}

            {/* Vote Options Grid */}
            <div className="grid grid-cols-5 gap-2">
              {voteOptions.map((option) => {
                const isSelected = selectedVote === option;
                const count = voteCount[option] || 0;
                const displayText = showVoteCount && count > 0 ? `${option} (${count})` : option;

                return (
                  <Button
                    key={option}
                    variant={isSelected ? 'default' : 'outline'}
                    className={cn(
                      'aspect-square text-sm font-medium',
                      isSelected && 'bg-primary text-primary-foreground'
                    )}
                    onClick={() => handleVote(option)}
                    onKeyDown={(e) => handleKeyDown(e, option)}
                    disabled={isVotingDisabled}
                  >
                    {displayText}
                  </Button>
                );
              })}
            </div>

            {/* Clear Vote Button */}
            {selectedVote && (
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearVote}
                  disabled={isVotingDisabled}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t('voting.clearVote')}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};