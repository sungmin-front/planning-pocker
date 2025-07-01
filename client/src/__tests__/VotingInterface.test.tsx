import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VotingInterface } from '@/components/VotingInterface';

describe('VotingInterface', () => {
  const mockOnVote = vi.fn();
  const defaultProps = {
    onVote: mockOnVote,
    currentStoryId: 'story1',
    selectedVote: null,
    disabled: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render voting interface with vote options', () => {
    render(<VotingInterface {...defaultProps} />);
    
    expect(screen.getByText('Cast your vote')).toBeInTheDocument();
    
    // Check for all vote options
    const voteOptions = ['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕'];
    voteOptions.forEach(option => {
      expect(screen.getByRole('button', { name: option })).toBeInTheDocument();
    });
  });

  it('should call onVote when voting button is clicked', () => {
    render(<VotingInterface {...defaultProps} />);
    
    const voteButton = screen.getByRole('button', { name: '5' });
    fireEvent.click(voteButton);
    
    expect(mockOnVote).toHaveBeenCalledWith('5');
  });

  it('should highlight selected vote', () => {
    render(<VotingInterface {...defaultProps} selectedVote="8" />);
    
    const selectedButton = screen.getByRole('button', { name: '8' });
    expect(selectedButton).toHaveClass('bg-primary', 'text-primary-foreground');
  });

  it('should not highlight any option when no vote selected', () => {
    render(<VotingInterface {...defaultProps} selectedVote={null} />);
    
    const voteButton = screen.getByRole('button', { name: '5' });
    expect(voteButton).not.toHaveClass('bg-primary', 'text-primary-foreground');
  });

  it('should disable all buttons when disabled prop is true', () => {
    render(<VotingInterface {...defaultProps} disabled={true} />);
    
    const voteOptions = ['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕'];
    voteOptions.forEach(option => {
      const button = screen.getByRole('button', { name: option });
      expect(button).toBeDisabled();
    });
  });

  it('should not call onVote when button is disabled', () => {
    render(<VotingInterface {...defaultProps} disabled={true} />);
    
    const voteButton = screen.getByRole('button', { name: '5' });
    fireEvent.click(voteButton);
    
    expect(mockOnVote).not.toHaveBeenCalled();
  });

  it('should display message when no current story', () => {
    render(<VotingInterface {...defaultProps} currentStoryId={null} />);
    
    expect(screen.getByText('No story to vote on')).toBeInTheDocument();
    
    // Voting buttons should not be rendered when no current story
    expect(screen.queryByRole('button', { name: '5' })).not.toBeInTheDocument();
  });

  it('should show custom vote options when provided', () => {
    const customOptions = ['XS', 'S', 'M', 'L', 'XL'];
    render(
      <VotingInterface 
        {...defaultProps} 
        voteOptions={customOptions}
      />
    );
    
    customOptions.forEach(option => {
      expect(screen.getByRole('button', { name: option })).toBeInTheDocument();
    });
  });

  it('should display voting status message when provided', () => {
    render(
      <VotingInterface 
        {...defaultProps} 
        statusMessage="Waiting for other players..."
      />
    );
    
    expect(screen.getByText('Waiting for other players...')).toBeInTheDocument();
  });

  it('should show clear vote button when vote is selected', () => {
    render(<VotingInterface {...defaultProps} selectedVote="5" />);
    
    expect(screen.getByRole('button', { name: 'Clear Vote' })).toBeInTheDocument();
  });

  it('should not show clear vote button when no vote selected', () => {
    render(<VotingInterface {...defaultProps} selectedVote={null} />);
    
    expect(screen.queryByRole('button', { name: 'Clear Vote' })).not.toBeInTheDocument();
  });

  it('should call onVote with null when clear vote is clicked', () => {
    render(<VotingInterface {...defaultProps} selectedVote="5" />);
    
    const clearButton = screen.getByRole('button', { name: 'Clear Vote' });
    fireEvent.click(clearButton);
    
    expect(mockOnVote).toHaveBeenCalledWith(null);
  });

  it('should show vote confirmation when showConfirmation is true', () => {
    render(
      <VotingInterface 
        {...defaultProps} 
        selectedVote="8"
        showConfirmation={true}
      />
    );
    
    expect(screen.getByText('Your vote: 8')).toBeInTheDocument();
  });

  it('should handle keyboard navigation', () => {
    render(<VotingInterface {...defaultProps} />);
    
    const voteButton = screen.getByRole('button', { name: '5' });
    voteButton.focus();
    
    fireEvent.keyDown(voteButton, { key: 'Enter' });
    expect(mockOnVote).toHaveBeenCalledWith('5');
    
    vi.clearAllMocks();
    
    fireEvent.keyDown(voteButton, { key: ' ' });
    expect(mockOnVote).toHaveBeenCalledWith('5');
  });

  it('should apply custom className when provided', () => {
    const { container } = render(
      <VotingInterface 
        {...defaultProps} 
        className="custom-voting-class"
      />
    );
    
    expect(container.firstChild).toHaveClass('custom-voting-class');
  });

  it('should show loading state when isLoading is true', () => {
    render(
      <VotingInterface 
        {...defaultProps} 
        isLoading={true}
      />
    );
    
    expect(screen.getByText('Submitting vote...')).toBeInTheDocument();
    
    // Voting buttons should not be rendered during loading
    expect(screen.queryByRole('button', { name: '5' })).not.toBeInTheDocument();
  });

  it('should display vote count when provided', () => {
    const voteCount = { '5': 2, '8': 1, '13': 1 };
    render(
      <VotingInterface 
        {...defaultProps} 
        voteCount={voteCount}
        showVoteCount={true}
      />
    );
    
    expect(screen.getByText('5 (2)')).toBeInTheDocument();
    expect(screen.getByText('8 (1)')).toBeInTheDocument();
    expect(screen.getByText('13 (1)')).toBeInTheDocument();
  });
});