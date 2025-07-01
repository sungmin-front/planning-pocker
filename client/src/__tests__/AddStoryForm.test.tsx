import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddStoryForm } from '@/components/HostControls/AddStoryForm';

// Mock socket utility
const mockSocket = {
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({
    socket: mockSocket,
    isConnected: true,
    sendMessage: vi.fn(),
  }),
}));

describe('AddStoryForm', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render form with title and description fields', () => {
    render(<AddStoryForm onClose={mockOnClose} />);
    
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add story/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('should have title input as required field', () => {
    render(<AddStoryForm onClose={mockOnClose} />);
    
    const titleInput = screen.getByLabelText(/title/i);
    expect(titleInput).toHaveAttribute('required');
  });

  it('should disable submit button when title is empty', () => {
    render(<AddStoryForm onClose={mockOnClose} />);
    
    const submitButton = screen.getByRole('button', { name: /add story/i });
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button when title is filled', async () => {
    const user = userEvent.setup();
    render(<AddStoryForm onClose={mockOnClose} />);
    
    const titleInput = screen.getByLabelText(/title/i);
    const submitButton = screen.getByRole('button', { name: /add story/i });
    
    await user.type(titleInput, 'Test Story');
    
    expect(submitButton).toBeEnabled();
  });

  it('should handle title input changes', async () => {
    const user = userEvent.setup();
    render(<AddStoryForm onClose={mockOnClose} />);
    
    const titleInput = screen.getByLabelText(/title/i);
    
    await user.type(titleInput, 'User Story Title');
    
    expect(titleInput).toHaveValue('User Story Title');
  });

  it('should handle description input changes', async () => {
    const user = userEvent.setup();
    render(<AddStoryForm onClose={mockOnClose} />);
    
    const descriptionInput = screen.getByLabelText(/description/i);
    
    await user.type(descriptionInput, 'Story description here');
    
    expect(descriptionInput).toHaveValue('Story description here');
  });

  it('should call onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<AddStoryForm onClose={mockOnClose} />);
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    
    await user.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should emit socket event when form is submitted with valid data', async () => {
    const user = userEvent.setup();
    
    // Mock successful socket response
    mockSocket.emit.mockImplementation((event, data, callback) => {
      if (callback) {
        callback({ success: true });
      }
    });
    
    render(<AddStoryForm onClose={mockOnClose} />);
    
    const titleInput = screen.getByLabelText(/title/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const submitButton = screen.getByRole('button', { name: /add story/i });
    
    await user.type(titleInput, 'Test Story');
    await user.type(descriptionInput, 'Test Description');
    await user.click(submitButton);
    
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'story:add',
      {
        title: 'Test Story',
        description: 'Test Description'
      },
      expect.any(Function)
    );
  });

  it('should emit socket event with only title when description is empty', async () => {
    const user = userEvent.setup();
    
    // Mock successful socket response
    mockSocket.emit.mockImplementation((event, data, callback) => {
      if (callback) {
        callback({ success: true });
      }
    });
    
    render(<AddStoryForm onClose={mockOnClose} />);
    
    const titleInput = screen.getByLabelText(/title/i);
    const submitButton = screen.getByRole('button', { name: /add story/i });
    
    await user.type(titleInput, 'Test Story');
    await user.click(submitButton);
    
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'story:add',
      {
        title: 'Test Story',
        description: undefined
      },
      expect.any(Function)
    );
  });

  it('should trim whitespace from title and description', async () => {
    const user = userEvent.setup();
    
    // Mock successful socket response
    mockSocket.emit.mockImplementation((event, data, callback) => {
      if (callback) {
        callback({ success: true });
      }
    });
    
    render(<AddStoryForm onClose={mockOnClose} />);
    
    const titleInput = screen.getByLabelText(/title/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const submitButton = screen.getByRole('button', { name: /add story/i });
    
    await user.type(titleInput, '  Test Story  ');
    await user.type(descriptionInput, '  Test Description  ');
    await user.click(submitButton);
    
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'story:add',
      {
        title: 'Test Story',
        description: 'Test Description'
      },
      expect.any(Function)
    );
  });

  it('should close form on successful submission', async () => {
    const user = userEvent.setup();
    
    // Mock successful socket response
    mockSocket.emit.mockImplementation((event, data, callback) => {
      if (callback) {
        callback({ success: true });
      }
    });
    
    render(<AddStoryForm onClose={mockOnClose} />);
    
    const titleInput = screen.getByLabelText(/title/i);
    const submitButton = screen.getByRole('button', { name: /add story/i });
    
    await user.type(titleInput, 'Test Story');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('should show loading state while submitting', async () => {
    const user = userEvent.setup();
    
    // Mock delayed socket response
    mockSocket.emit.mockImplementation((event, data, callback) => {
      setTimeout(() => {
        if (callback) {
          callback({ success: true });
        }
      }, 100);
    });
    
    render(<AddStoryForm onClose={mockOnClose} />);
    
    const titleInput = screen.getByLabelText(/title/i);
    const submitButton = screen.getByRole('button', { name: /add story/i });
    
    await user.type(titleInput, 'Test Story');
    await user.click(submitButton);
    
    expect(screen.getByText(/adding.../i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
    
    await waitFor(() => {
      expect(screen.queryByText(/adding.../i)).not.toBeInTheDocument();
    });
  });

  it('should handle server error response', async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock error socket response
    mockSocket.emit.mockImplementation((event, data, callback) => {
      if (callback) {
        callback({ success: false, error: 'Server error' });
      }
    });
    
    render(<AddStoryForm onClose={mockOnClose} />);
    
    const titleInput = screen.getByLabelText(/title/i);
    const submitButton = screen.getByRole('button', { name: /add story/i });
    
    await user.type(titleInput, 'Test Story');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Server error');
    });
    
    // Should not close form on error
    expect(mockOnClose).not.toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  it('should prevent submission with only whitespace title', async () => {
    const user = userEvent.setup();
    render(<AddStoryForm onClose={mockOnClose} />);
    
    const titleInput = screen.getByLabelText(/title/i);
    const submitButton = screen.getByRole('button', { name: /add story/i });
    
    await user.type(titleInput, '   ');
    
    expect(submitButton).toBeDisabled();
  });

  it('should handle form submission via Enter key', async () => {
    const user = userEvent.setup();
    
    // Mock successful socket response
    mockSocket.emit.mockImplementation((event, data, callback) => {
      if (callback) {
        callback({ success: true });
      }
    });
    
    render(<AddStoryForm onClose={mockOnClose} />);
    
    const titleInput = screen.getByLabelText(/title/i);
    
    await user.type(titleInput, 'Test Story');
    await user.keyboard('{Enter}');
    
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'story:add',
      {
        title: 'Test Story',
        description: undefined
      },
      expect.any(Function)
    );
  });

  it('should have proper form accessibility', () => {
    render(<AddStoryForm onClose={mockOnClose} />);
    
    const titleInput = screen.getByLabelText(/title/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    
    expect(titleInput).toHaveAttribute('id');
    expect(descriptionInput).toHaveAttribute('id');
    
    // Check that labels are properly associated
    const titleLabel = screen.getByText(/title/i);
    const descriptionLabel = screen.getByText(/description/i);
    
    expect(titleLabel).toHaveAttribute('for', titleInput.getAttribute('id'));
    expect(descriptionLabel).toHaveAttribute('for', descriptionInput.getAttribute('id'));
  });
});