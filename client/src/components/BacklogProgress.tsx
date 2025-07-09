import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, TooltipPortal } from '@/components/ui/tooltip';
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

  const getTooltipContent = () => {
    const breakdown = progress.breakdown;
    const inProgress = breakdown.voting + breakdown.revealed;
    
    return (
      <div className="space-y-1">
        <div className="font-medium">상태별 이슈 개수</div>
        <div className="space-y-0.5 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span>✅ 완료됨 (closed)</span>
            <span>{breakdown.closed}개</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>❌ 건너뜀 (skipped)</span>
            <span>{breakdown.skipped}개</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>⏰ 진행 중 (voting/revealed)</span>
            <span>{inProgress}개</span>
          </div>
          <div className="border-t pt-1 mt-1">
            <div className="flex items-center justify-between gap-4 font-medium">
              <span>📊 전체</span>
              <span>{progress.totalItems}개</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (showDetailed) {
    return (
      <TooltipProvider>
        <div className={`space-y-2 ${className}`}>
          {/* Main progress display */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant={getProgressBadgeVariant(progress.percentage)} className="text-xs cursor-help">
                  {progress.displayText}
                </Badge>
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent>
                  {getTooltipContent()}
                </TooltipContent>
              </TooltipPortal>
            </Tooltip>
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
        </div>
      </TooltipProvider>
    );
  }

  // Simple compact display
  return (
    <TooltipProvider>
      <div className={`flex items-center gap-2 ${className}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant={getProgressBadgeVariant(progress.percentage)} className="text-xs cursor-help">
              {progress.displayText}
            </Badge>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent>
              {getTooltipContent()}
            </TooltipContent>
          </TooltipPortal>
        </Tooltip>
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
    </TooltipProvider>
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