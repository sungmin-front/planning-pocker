import { describe, it, expect, vi } from 'vitest';
import { BacklogTracker } from '../BacklogTracker';
import type { Story } from '@planning-poker/shared';

// Mock stories for testing
const createMockStory = (id: string, status: Story['status'], hasVotes = false): Story => ({
  id,
  title: `Story ${id}`,
  description: `Description for story ${id}`,
  status,
  votes: hasVotes ? { 'user1': '5' } : {},
  final_point: status === 'closed' ? '5' : undefined,
  jiraMetadata: {
    key: `TEST-${id}`,
    issueType: 'Story',
    status: 'In Progress',
    assignee: 'test-user',
    priority: 'Medium',
    storyPoints: null,
    jiraUrl: `https://test.atlassian.net/browse/TEST-${id}`
  }
});

describe('BacklogTracker', () => {
  describe('constructor', () => {
    it('should initialize with empty stories array', () => {
      const tracker = new BacklogTracker();
      const progress = tracker.getProgress();
      
      expect(progress.totalItems).toBe(0);
      expect(progress.completedItems).toBe(0);
      expect(progress.percentage).toBe(0);
      expect(progress.displayText).toBe('0 of 0 completed');
    });

    it('should initialize with provided stories', () => {
      const stories = [
        createMockStory('1', 'closed'),
        createMockStory('2', 'voting'),
        createMockStory('3', 'skipped')
      ];
      
      const tracker = new BacklogTracker(stories);
      const progress = tracker.getProgress();
      
      expect(progress.totalItems).toBe(3);
      expect(progress.completedItems).toBe(2); // closed + skipped
      expect(progress.percentage).toBe(66.66666666666666);
      expect(progress.displayText).toBe('2 of 3 completed');
    });
  });

  describe('updateStories', () => {
    it('should update stories and notify listeners', () => {
      const tracker = new BacklogTracker();
      const listener = vi.fn();
      tracker.addListener(listener);
      
      const stories = [
        createMockStory('1', 'closed'),
        createMockStory('2', 'voting')
      ];
      
      tracker.updateStories(stories);
      
      expect(listener).toHaveBeenCalledWith({
        totalItems: 2,
        completedItems: 1,
        percentage: 50,
        displayText: '1 of 2 completed'
      });
    });

    it('should handle empty stories array', () => {
      const tracker = new BacklogTracker([createMockStory('1', 'closed')]);
      const listener = vi.fn();
      tracker.addListener(listener);
      
      tracker.updateStories([]);
      
      expect(listener).toHaveBeenCalledWith({
        totalItems: 0,
        completedItems: 0,
        percentage: 0,
        displayText: '0 of 0 completed'
      });
    });
  });

  describe('getProgress', () => {
    it('should calculate progress correctly for various story states', () => {
      const stories = [
        createMockStory('1', 'closed'),    // completed
        createMockStory('2', 'skipped'),   // completed
        createMockStory('3', 'voting'),    // not completed
        createMockStory('4', 'revealed'),  // not completed
      ];
      
      const tracker = new BacklogTracker(stories);
      const progress = tracker.getProgress();
      
      expect(progress.totalItems).toBe(4);
      expect(progress.completedItems).toBe(2);
      expect(progress.percentage).toBe(50);
      expect(progress.displayText).toBe('2 of 4 completed');
    });

    it('should handle 100% completion', () => {
      const stories = [
        createMockStory('1', 'closed'),
        createMockStory('2', 'skipped'),
      ];
      
      const tracker = new BacklogTracker(stories);
      const progress = tracker.getProgress();
      
      expect(progress.percentage).toBe(100);
      expect(progress.displayText).toBe('2 of 2 completed');
    });

    it('should handle 0% completion', () => {
      const stories = [
        createMockStory('1', 'voting'),
        createMockStory('2', 'revealed'),
      ];
      
      const tracker = new BacklogTracker(stories);
      const progress = tracker.getProgress();
      
      expect(progress.percentage).toBe(0);
      expect(progress.displayText).toBe('0 of 2 completed');
    });
  });

  describe('getStatusBreakdown', () => {
    it('should return correct breakdown by status', () => {
      const stories = [
        createMockStory('1', 'closed'),
        createMockStory('2', 'closed'),
        createMockStory('3', 'skipped'),
        createMockStory('4', 'voting'),
        createMockStory('5', 'revealed'),
      ];
      
      const tracker = new BacklogTracker(stories);
      const breakdown = tracker.getStatusBreakdown();
      
      expect(breakdown).toEqual({
        closed: 2,
        skipped: 1,
        voting: 1,
        revealed: 1
      });
    });

    it('should handle empty stories', () => {
      const tracker = new BacklogTracker([]);
      const breakdown = tracker.getStatusBreakdown();
      
      expect(breakdown).toEqual({
        closed: 0,
        skipped: 0,
        voting: 0,
        revealed: 0
      });
    });
  });

  describe('getDetailedStats', () => {
    it('should return comprehensive statistics', () => {
      const stories = [
        createMockStory('1', 'closed'),
        createMockStory('2', 'skipped'),
        createMockStory('3', 'voting'),
        createMockStory('4', 'revealed'),
      ];
      
      const tracker = new BacklogTracker(stories);
      const stats = tracker.getDetailedStats();
      
      expect(stats).toEqual({
        totalItems: 4,
        completedItems: 2,
        percentage: 50,
        displayText: '2 of 4 completed',
        breakdown: {
          closed: 1,
          skipped: 1,
          voting: 1,
          revealed: 1
        },
        inProgress: 2, // voting + revealed
        pending: 0
      });
    });
  });

  describe('listener management', () => {
    it('should add and remove listeners correctly', () => {
      const tracker = new BacklogTracker();
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      
      tracker.addListener(listener1);
      tracker.addListener(listener2);
      
      tracker.updateStories([createMockStory('1', 'closed')]);
      
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      
      tracker.removeListener(listener1);
      tracker.updateStories([createMockStory('2', 'voting')]);
      
      expect(listener1).toHaveBeenCalledTimes(1); // not called again
      expect(listener2).toHaveBeenCalledTimes(2); // called again
    });

    it('should handle removing non-existent listener', () => {
      const tracker = new BacklogTracker();
      const listener = vi.fn();
      
      // Should not throw error
      tracker.removeListener(listener);
      
      tracker.addListener(listener);
      tracker.removeListener(listener);
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('utility methods', () => {
    it('should correctly identify completed stories', () => {
      const tracker = new BacklogTracker();
      
      expect(tracker.isStoryCompleted(createMockStory('1', 'closed'))).toBe(true);
      expect(tracker.isStoryCompleted(createMockStory('2', 'skipped'))).toBe(true);
      expect(tracker.isStoryCompleted(createMockStory('3', 'voting'))).toBe(false);
      expect(tracker.isStoryCompleted(createMockStory('4', 'revealed'))).toBe(false);
    });

    it('should correctly identify stories in progress', () => {
      const tracker = new BacklogTracker();
      
      expect(tracker.isStoryInProgress(createMockStory('1', 'voting'))).toBe(true);
      expect(tracker.isStoryInProgress(createMockStory('2', 'revealed'))).toBe(true);
      expect(tracker.isStoryInProgress(createMockStory('3', 'closed'))).toBe(false);
      expect(tracker.isStoryInProgress(createMockStory('4', 'skipped'))).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle division by zero in percentage calculation', () => {
      const tracker = new BacklogTracker([]);
      const progress = tracker.getProgress();
      
      expect(progress.percentage).toBe(0);
      expect(progress.displayText).toBe('0 of 0 completed');
    });

    it('should handle stories with missing properties', () => {
      const incompleteStory = {
        id: '1',
        title: 'Test',
        status: 'closed' as const,
        votes: {}
      };
      
      const tracker = new BacklogTracker([incompleteStory]);
      const progress = tracker.getProgress();
      
      expect(progress.totalItems).toBe(1);
      expect(progress.completedItems).toBe(1);
      expect(progress.percentage).toBe(100);
    });
  });
});