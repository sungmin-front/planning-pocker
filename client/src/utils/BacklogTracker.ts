import type { Story, StoryStatus } from '@planning-poker/shared';

export interface BacklogProgress {
  totalItems: number;
  completedItems: number;
  percentage: number;
  displayText: string;
}

export class BacklogTracker {
  private listeners: Array<(progress: BacklogProgress) => void> = [];

  constructor(private stories: Story[] = []) {}

  /**
   * Update the stories and notify listeners
   */
  updateStories(stories: Story[]): void {
    this.stories = stories;
    this.notifyListeners();
  }

  /**
   * Get current progress information
   */
  getProgress(): BacklogProgress {
    const totalItems = this.stories.length;
    const completedItems = this.stories.filter(story => 
      story.status === 'closed' || story.status === 'skipped'
    ).length;

    return {
      totalItems,
      completedItems,
      percentage: totalItems === 0 ? 0 : (completedItems / totalItems) * 100,
      displayText: `${completedItems} of ${totalItems} completed`
    };
  }

  /**
   * Get breakdown by status
   */
  getStatusBreakdown(): Record<StoryStatus, number> {
    const breakdown: Record<StoryStatus, number> = {
      voting: 0,
      revealed: 0,
      closed: 0,
      skipped: 0
    };

    this.stories.forEach(story => {
      breakdown[story.status]++;
    });

    return breakdown;
  }

  /**
   * Get detailed statistics
   */
  getDetailedStats() {
    const breakdown = this.getStatusBreakdown();
    const progress = this.getProgress();
    
    return {
      ...progress,
      breakdown,
      inProgress: breakdown.voting + breakdown.revealed,
      pending: this.stories.filter(story => 
        story.status !== 'closed' && story.status !== 'skipped' && 
        story.status !== 'voting' && story.status !== 'revealed'
      ).length
    };
  }

  /**
   * Add a listener for progress updates
   */
  addListener(listener: (progress: BacklogProgress) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove a listener
   */
  removeListener(listener: (progress: BacklogProgress) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * Notify all listeners of progress changes
   */
  private notifyListeners(): void {
    const progress = this.getProgress();
    this.listeners.forEach(listener => listener(progress));
  }

  /**
   * Check if a story is considered completed
   */
  isStoryCompleted(story: Story): boolean {
    return story.status === 'closed' || story.status === 'skipped';
  }

  /**
   * Check if a story is in active voting/work
   */
  isStoryInProgress(story: Story): boolean {
    return story.status === 'voting' || story.status === 'revealed';
  }
}