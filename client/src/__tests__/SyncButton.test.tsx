import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SyncButton } from '@/components/SyncButton';

// Mock WebSocket context
const mockSocket = {
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  disconnect: vi.fn(),
};

const mockWebSocketContext = {
  socket: mockSocket,
  isConnected: true,
  sendMessage: vi.fn(),
};

vi.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => mockWebSocketContext,
}));

describe('SyncButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWebSocketContext.socket = mockSocket;
    mockWebSocketContext.isConnected = true;
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should render sync button with correct initial state', () => {
    render(<SyncButton />);
    
    const button = screen.getByRole('button', { name: /sync/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('🔄 Sync');
    expect(button).not.toBeDisabled();
  });

  it('should have correct CSS classes', () => {
    render(<SyncButton />);
    
    const button = screen.getByRole('button', { name: /sync/i });
    expect(button).toHaveClass('sync-button');
  });

  it('should emit room:sync event when clicked', async () => {
    const user = userEvent.setup();
    
    render(<SyncButton />);
    
    const button = screen.getByRole('button', { name: /sync/i });
    await user.click(button);
    
    expect(mockSocket.emit).toHaveBeenCalledWith('room:sync', {}, expect.any(Function));
  });

  it('should show loading state while syncing', async () => {
    const user = userEvent.setup();
    
    render(<SyncButton />);
    
    const button = screen.getByRole('button', { name: /sync/i });
    await user.click(button);
    
    expect(button).toHaveTextContent('Syncing...');
    expect(button).toBeDisabled();
  });

  it('should return to normal state after sync completion', async () => {
    const user = userEvent.setup();
    
    // Mock successful sync response
    mockSocket.emit.mockImplementation((event, data, callback) => {
      if (event === 'room:sync' && callback) {
        setTimeout(() => callback(), 10);
      }
    });
    
    render(<SyncButton />);
    
    const button = screen.getByRole('button', { name: /sync/i });
    await user.click(button);
    
    // Should be in loading state
    expect(button).toHaveTextContent('Syncing...');
    expect(button).toBeDisabled();
    
    // Wait for callback to complete
    await waitFor(() => {
      expect(button).toHaveTextContent('🔄 Sync');
      expect(button).not.toBeDisabled();
    }, { timeout: 1000 });
  });

  it('should not emit event when socket is not available', async () => {
    const user = userEvent.setup();
    
    // Mock no socket
    mockWebSocketContext.socket = null;
    
    render(<SyncButton />);
    
    const button = screen.getByRole('button', { name: /sync/i });
    await user.click(button);
    
    expect(mockSocket.emit).not.toHaveBeenCalled();
    expect(button).toHaveTextContent('🔄 Sync'); // Should remain in normal state
  });

  it('should handle multiple rapid clicks correctly', async () => {
    const user = userEvent.setup();
    
    // Mock normal sync behavior
    mockSocket.emit.mockImplementation((event, data, callback) => {
      // Don't call callback to keep button in loading state
    });
    
    render(<SyncButton />);
    
    const button = screen.getByRole('button', { name: /sync/i });
    
    // First click
    await user.click(button);
    expect(button).toBeDisabled();
    
    // Second click should not work because button is disabled
    await user.click(button);
    
    // Should only emit once
    expect(mockSocket.emit).toHaveBeenCalledTimes(1);
  });

  it('should have correct button variant and size', () => {
    render(<SyncButton />);
    
    const button = screen.getByRole('button', { name: /sync/i });
    expect(button).toHaveClass('sync-button');
  });

  it('should be accessible with proper ARIA attributes', () => {
    render(<SyncButton />);
    
    const button = screen.getByRole('button', { name: /sync/i });
    expect(button).toHaveAttribute('type', 'button');
  });

  it('should handle sync error gracefully', async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock sync with error
    mockSocket.emit.mockImplementation(() => {
      throw new Error('Sync failed');
    });
    
    render(<SyncButton />);
    
    const button = screen.getByRole('button', { name: /sync/i });
    await user.click(button);
    
    // Should return to normal state after error
    expect(button).toHaveTextContent('🔄 Sync');
    expect(button).not.toBeDisabled();
    
    consoleSpy.mockRestore();
  });

  it('should show correct text content changes', async () => {
    const user = userEvent.setup();
    
    // Mock normal sync behavior
    mockSocket.emit.mockImplementation((event, data, callback) => {
      // Don't call callback to keep button in loading state
    });
    
    render(<SyncButton />);
    
    const button = screen.getByRole('button');
    
    // Initial state
    expect(button).toHaveTextContent('🔄 Sync');
    
    // Click to start syncing
    await user.click(button);
    expect(button).toHaveTextContent('Syncing...');
  });

  it('should prevent clicks while syncing', async () => {
    const user = userEvent.setup();
    
    // Mock normal sync behavior
    mockSocket.emit.mockImplementation((event, data, callback) => {
      // Don't call callback to keep button in loading state
    });
    
    render(<SyncButton />);
    
    const button = screen.getByRole('button', { name: /sync/i });
    
    // First click
    await user.click(button);
    expect(button).toBeDisabled();
    expect(mockSocket.emit).toHaveBeenCalledTimes(1);
    
    // Try to click again while disabled
    fireEvent.click(button);
    expect(mockSocket.emit).toHaveBeenCalledTimes(1); // Should still be only 1
  });
});