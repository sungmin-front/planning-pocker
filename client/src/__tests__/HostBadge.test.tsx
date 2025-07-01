import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HostBadge } from '@/components/PlayerTable/HostBadge';

describe('HostBadge', () => {
  it('should render the crown emoji', () => {
    render(<HostBadge />);
    
    expect(screen.getByText('👑')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(<HostBadge />);
    
    const badge = screen.getByLabelText('Host crown');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('role', 'img');
    expect(badge).toHaveAttribute('title', 'Host');
  });

  it('should have the correct styling classes', () => {
    render(<HostBadge />);
    
    const container = screen.getByLabelText('Host crown');
    expect(container).toHaveClass('inline-flex', 'items-center', 'justify-center');
    
    const crown = screen.getByText('👑');
    expect(crown).toHaveClass('text-yellow-500', 'text-lg', 'select-none');
  });

  it('should be rendered with framer-motion animation properties', () => {
    render(<HostBadge />);
    
    const badge = screen.getByLabelText('Host crown');
    expect(badge).toBeInTheDocument();
    
    // Component starts with initial animation state (scale: 0, opacity: 0)
    expect(badge).toHaveStyle({ opacity: '0', transform: 'scale(0)' });
  });

  it('should have proper font size styling', () => {
    render(<HostBadge />);
    
    const crown = screen.getByText('👑');
    expect(crown).toHaveStyle({ fontSize: '1.2em' });
  });

  it('should prevent text selection', () => {
    render(<HostBadge />);
    
    const crown = screen.getByText('👑');
    expect(crown).toHaveClass('select-none');
  });

  it('should use yellow color for the crown', () => {
    render(<HostBadge />);
    
    const crown = screen.getByText('👑');
    expect(crown).toHaveClass('text-yellow-500');
  });
});