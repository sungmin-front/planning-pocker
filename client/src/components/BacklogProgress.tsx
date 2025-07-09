import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/shadcn/badge';
import { Progress } from '@/components/ui/shadcn/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, TooltipPortal, TooltipArrow } from '@/components/ui/shadcn/tooltip';
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


  const getProgressBadgeVariant = (percentage: number) => {
    if (percentage >= 100) return 'default';
    if (percentage >= 75) return 'secondary';
    return 'outline';
  };

  const getTooltipContent = () => {
    const breakdown = progress.breakdown;
    const inProgress = breakdown.voting + breakdown.revealed;
    
    return (
      <div className="space-y-2 max-w-[180px] p-1.5">
        <div className="text-center">
          <div className="text-xs font-medium text-white mb-1">상태별 이슈 개수</div>
          <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent"></div>
        </div>
        
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between gap-2 p-1.5 rounded bg-gray-800/50 hover:bg-gray-800/70 transition-colors">
            <div className="flex items-center gap-1.5">
              <span className="text-green-400 text-xs">✅</span>
              <span className="text-white">완료됨</span>
            </div>
            <span className="font-mono text-green-400 font-medium text-xs">
              {breakdown.closed}개
            </span>
          </div>
          
          <div className="flex items-center justify-between gap-2 p-1.5 rounded bg-gray-800/50 hover:bg-gray-800/70 transition-colors">
            <div className="flex items-center gap-1.5">
              <span className="text-red-400 text-xs">❌</span>
              <span className="text-white">건너뜀</span>
            </div>
            <span className="font-mono text-red-400 font-medium text-xs">
              {breakdown.skipped}개
            </span>
          </div>
          
          <div className="flex items-center justify-between gap-2 p-1.5 rounded bg-gray-800/50 hover:bg-gray-800/70 transition-colors">
            <div className="flex items-center gap-1.5">
              <span className="text-yellow-400 text-xs">⏰</span>
              <span className="text-white">진행 중</span>
            </div>
            <span className="font-mono text-yellow-400 font-medium text-xs">
              {inProgress}개
            </span>
          </div>
          
          <div className="mt-2 pt-1.5 border-t border-gray-600">
            <div className="flex items-center justify-between gap-2 p-1.5 rounded bg-gray-700/50">
              <div className="flex items-center gap-1.5">
                <span className="text-blue-400 text-xs">📊</span>
                <span className="text-white font-medium">전체</span>
              </div>
              <span className="font-mono text-blue-400 font-semibold text-xs">
                {progress.totalItems}개
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (showDetailed) {
    return (
      <TooltipProvider delayDuration={300}>
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
                <TooltipContent 
                  side="right" 
                  align="center" 
                  sideOffset={4}
                >
                  <TooltipArrow />
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
    <TooltipProvider delayDuration={300}>
      <div className={`flex items-center gap-2 ${className}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant={getProgressBadgeVariant(progress.percentage)} className="text-xs cursor-help">
              {progress.displayText}
            </Badge>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent 
              side="right" 
              align="center" 
              sideOffset={4}
            >
              <TooltipArrow />
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