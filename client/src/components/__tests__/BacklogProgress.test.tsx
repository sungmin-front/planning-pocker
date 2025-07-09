import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BacklogProgressDisplay } from '../BacklogProgress';
import type { Story } from '@planning-poker/shared';

// Mock stories for testing
const createMockStory = (id: string, status: Story['status']): Story => ({
  id,
  title: `Story ${id}`,
  description: `Description for story ${id}`,
  status,
  votes: {},
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

describe('BacklogProgressDisplay', () => {
  describe('simple display mode', () => {
    it('should display basic progress information', () => {
      const stories = [
        createMockStory('1', 'closed'),
        createMockStory('2', 'voting'),
        createMockStory('3', 'skipped'),
        createMockStory('4', 'revealed')
      ];

      render(<BacklogProgressDisplay stories={stories} />);
      
      // Should show completed count
      expect(screen.getByText('2 of 4 completed')).toBeInTheDocument();
      
      // Should show percentage
      expect(screen.getByText('(50%)')).toBeInTheDocument();
    });

    it('should display 100% completion correctly', () => {
      const stories = [
        createMockStory('1', 'closed'),
        createMockStory('2', 'skipped')
      ];

      render(<BacklogProgressDisplay stories={stories} />);
      
      expect(screen.getByText('2 of 2 completed')).toBeInTheDocument();
      expect(screen.getByText('(100%)')).toBeInTheDocument();
    });

    it('should display 0% completion correctly', () => {
      const stories = [
        createMockStory('1', 'voting'),
        createMockStory('2', 'revealed')
      ];

      render(<BacklogProgressDisplay stories={stories} />);
      
      expect(screen.getByText('0 of 2 completed')).toBeInTheDocument();
      expect(screen.getByText('(0%)')).toBeInTheDocument();
    });

    it('should handle empty stories array', () => {
      render(<BacklogProgressDisplay stories={[]} />);
      
      expect(screen.getByText('0 of 0 completed')).toBeInTheDocument();
      expect(screen.getByText('(0%)')).toBeInTheDocument();
    });

    it('should show progress bar when enabled', () => {
      const stories = [
        createMockStory('1', 'closed'),
        createMockStory('2', 'voting')
      ];

      render(<BacklogProgressDisplay stories={stories} showProgressBar={true} />);
      
      // Progress component should be rendered
      const progressBars = document.querySelectorAll('[role="progressbar"]');
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });

  describe('detailed display mode', () => {
    it('should display detailed breakdown information', () => {
      const stories = [
        createMockStory('1', 'closed'),
        createMockStory('2', 'skipped'),
        createMockStory('3', 'voting'),
        createMockStory('4', 'revealed')
      ];

      render(<BacklogProgressDisplay stories={stories} showDetailed={true} />);
      
      // Main progress should still be shown
      expect(screen.getByText('2 of 4 completed')).toBeInTheDocument();
      expect(screen.getByText('(50%)')).toBeInTheDocument();
      
      // Detailed breakdown should be shown
      expect(screen.getByText('1 closed')).toBeInTheDocument();
      expect(screen.getByText('1 skipped')).toBeInTheDocument();
      expect(screen.getByText('2 in progress')).toBeInTheDocument();
      expect(screen.getByText('0 pending')).toBeInTheDocument();
    });

    it('should show progress bar in detailed mode', () => {
      const stories = [
        createMockStory('1', 'closed'),
        createMockStory('2', 'voting')
      ];

      render(<BacklogProgressDisplay stories={stories} showDetailed={true} showProgressBar={true} />);
      
      // Progress component should be rendered
      const progressBars = document.querySelectorAll('[role="progressbar"]');
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('should display correct breakdown with all story types', () => {
      const stories = [
        createMockStory('1', 'closed'),
        createMockStory('2', 'closed'),
        createMockStory('3', 'skipped'),
        createMockStory('4', 'voting'),
        createMockStory('5', 'revealed'),
        createMockStory('6', 'revealed')
      ];

      render(<BacklogProgressDisplay stories={stories} showDetailed={true} />);
      
      expect(screen.getByText('2 closed')).toBeInTheDocument();
      expect(screen.getByText('1 skipped')).toBeInTheDocument();
      expect(screen.getByText('3 in progress')).toBeInTheDocument(); // voting + revealed
      expect(screen.getByText('0 pending')).toBeInTheDocument();
    });
  });

  describe('custom styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <BacklogProgressDisplay stories={[]} className="custom-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should apply different className for detailed mode', () => {
      const { container } = render(
        <BacklogProgressDisplay 
          stories={[]} 
          showDetailed={true} 
          className="detailed-class" 
        />
      );
      
      expect(container.firstChild).toHaveClass('detailed-class');
    });
  });

  describe('edge cases', () => {
    it('should handle stories with undefined status', () => {
      // This shouldn't happen in practice, but testing robustness
      const invalidStory = {
        id: '1',
        title: 'Invalid Story',
        status: undefined as any,
        votes: {}
      };

      // Should not crash
      render(<BacklogProgressDisplay stories={[invalidStory]} />);
      
      expect(screen.getByText('0 of 1 completed')).toBeInTheDocument();
    });

    it('should handle very large numbers', () => {
      const manyStories = Array.from({ length: 1000 }, (_, i) => 
        createMockStory(i.toString(), i < 500 ? 'closed' : 'voting')
      );

      render(<BacklogProgressDisplay stories={manyStories} />);
      
      expect(screen.getByText('500 of 1000 completed')).toBeInTheDocument();
      expect(screen.getByText('(50%)')).toBeInTheDocument();
    });
  });
});