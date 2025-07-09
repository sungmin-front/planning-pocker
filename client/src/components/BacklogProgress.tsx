import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, Clock, X } from 'lucide-react';
import { BacklogTracker, BacklogProgress } from '@/utils/BacklogTracker';
import type { Story } from '@planning-poker/shared';

interface BacklogProgressProps {
  stories: Story[];
  showDetailed?: boolean;
  showProgressBar?: boolean;
  className?: string;
}

export const BacklogProgressDisplay: React.FC<BacklogProgressProps> = ({
  stories,
  showDetailed = false,
  showProgressBar = false,
  className = ''
}) => {
  const progress = useMemo(() => {
    const tracker = new BacklogTracker(stories);
    return tracker.getDetailedStats();
  }, [stories]);

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const getProgressBadgeVariant = (percentage: number) => {
    if (percentage >= 100) return 'default';
    if (percentage >= 75) return 'secondary';
    return 'outline';
  };

  if (showDetailed) {
    return (
      <div className={`space-y-2 ${className}`}>
        {/* Main progress display */}
        <div className="flex items-center gap-2">
          <Badge variant={getProgressBadgeVariant(progress.percentage)} className="text-xs">
            {progress.displayText}
          </Badge>
          <span className="text-xs text-muted-foreground">
            ({Math.round(progress.percentage)}%)
          </span>
        </div>

        {/* Progress bar */}
        {showProgressBar && (
          <Progress 
            value={progress.percentage} 
            className="h-2"
          />
        )}

        {/* Detailed breakdown */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span>{progress.breakdown.closed} closed</span>
          </div>
          <div className="flex items-center gap-1">
            <X className="h-3 w-3 text-gray-500" />
            <span>{progress.breakdown.skipped} skipped</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-blue-500" />
            <span>{progress.inProgress} in progress</span>
          </div>
          <div className="flex items-center gap-1">
            <Circle className="h-3 w-3 text-muted-foreground" />
            <span>{progress.pending} pending</span>
          </div>
        </div>
      </div>
    );
  }

  // Simple compact display
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge variant={getProgressBadgeVariant(progress.percentage)} className="text-xs">
        {progress.displayText}
      </Badge>
      {showProgressBar && (
        <div className="flex-1 max-w-[100px]">
          <Progress 
            value={progress.percentage} 
            className="h-2"
          />
        </div>
      )}
      <span className="text-xs text-muted-foreground">
        ({Math.round(progress.percentage)}%)
      </span>
    </div>
  );
};

// Hook for using BacklogTracker in components
export const useBacklogProgress = (stories: Story[]) => {
  return useMemo(() => {
    const tracker = new BacklogTracker(stories);
    return {
      progress: tracker.getProgress(),
      stats: tracker.getDetailedStats(),
      tracker
    };
  }, [stories]);
};