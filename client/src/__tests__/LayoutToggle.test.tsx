import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LayoutToggle } from '@/components/LayoutToggle';

// Mock the layout context
const mockLayoutContext = {
  layout: 'circular' as const,
  setLayout: vi.fn(),
  availableLayouts: ['circular', 'rectangular'] as const,
};

vi.mock('@/contexts/LayoutContext', () => ({
  useLayout: () => mockLayoutContext
}));

// Mock the breakpoint hook
const mockBreakpoint = {
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  isLargeDesktop: false,
  currentBreakpoint: 'desktop' as const,
  screenSize: { width: 1024, height: 768 },
  isMobileOrTablet: () => false,
  isTabletOrLarger: () => true,
  isDesktopOrLarger: () => true,
};

vi.mock('@/hooks/useBreakpoint', () => ({
  useBreakpoint: () => mockBreakpoint
}));

describe('LayoutToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset layout context
    mockLayoutContext.layout = 'circular';
    mockLayoutContext.availableLayouts = ['circular', 'rectangular'];
    
    // Reset breakpoint to desktop
    Object.assign(mockBreakpoint, {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isLargeDesktop: false,
      currentBreakpoint: 'desktop' as const,
      isMobileOrTablet: () => false,
      isTabletOrLarger: () => true,
      isDesktopOrLarger: () => true,
    });
  });

  it('should render layout toggle component', () => {
    render(<LayoutToggle />);
    
    expect(screen.getByTestId('layout-toggle')).toBeInTheDocument();
    expect(screen.getByText(/layout/i)).toBeInTheDocument();
  });

  it('should display current layout option as selected', () => {
    render(<LayoutToggle />);
    
    const circularOption = screen.getByLabelText(/circular layout/i);
    expect(circularOption).toBeChecked();
    
    const rectangularOption = screen.getByLabelText(/rectangular layout/i);
    expect(rectangularOption).not.toBeChecked();
  });

  it('should call setLayout when option is changed', async () => {
    const user = userEvent.setup();
    
    render(<LayoutToggle />);
    
    const rectangularOption = screen.getByLabelText(/rectangular layout/i);
    await user.click(rectangularOption);
    
    expect(mockLayoutContext.setLayout).toHaveBeenCalledWith('rectangular');
  });

  it('should show both layout options by default', () => {
    render(<LayoutToggle />);
    
    expect(screen.getByLabelText(/circular layout/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/rectangular layout/i)).toBeInTheDocument();
  });

  it('should display layout icons', () => {
    render(<LayoutToggle />);
    
    expect(screen.getByTestId('circular-icon')).toBeInTheDocument();
    expect(screen.getByTestId('rectangular-icon')).toBeInTheDocument();
  });

  it('should handle rectangular layout selection', () => {
    mockLayoutContext.layout = 'rectangular';
    
    render(<LayoutToggle />);
    
    const rectangularOption = screen.getByLabelText(/rectangular layout/i);
    expect(rectangularOption).toBeChecked();
    
    const circularOption = screen.getByLabelText(/circular layout/i);
    expect(circularOption).not.toBeChecked();
  });

  it('should be accessible with proper ARIA labels', () => {
    render(<LayoutToggle />);
    
    const radioGroup = screen.getByRole('radiogroup');
    expect(radioGroup).toHaveAttribute('aria-labelledby');
    
    const circularOption = screen.getByRole('radio', { name: /circular layout/i });
    const rectangularOption = screen.getByRole('radio', { name: /rectangular layout/i });
    
    expect(circularOption).toBeInTheDocument();
    expect(rectangularOption).toBeInTheDocument();
  });

  it('should show tooltips for layout options', async () => {
    const user = userEvent.setup();
    
    render(<LayoutToggle />);
    
    const circularIcon = screen.getByTestId('circular-icon');
    await user.hover(circularIcon);
    
    expect(screen.getByText(/players arranged in a circle/i)).toBeInTheDocument();
  });

  it('should adapt to mobile layout on small screens', () => {
    // Set to mobile
    Object.assign(mockBreakpoint, {
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      currentBreakpoint: 'mobile' as const,
      isMobileOrTablet: () => true,
      isTabletOrLarger: () => false,
      isDesktopOrLarger: () => false,
    });

    render(<LayoutToggle />);
    
    const radioGroup = screen.getByRole('radiogroup');
    expect(radioGroup).toHaveClass('flex-col'); // Vertical layout on mobile
  });

  it('should use horizontal layout on desktop', () => {
    render(<LayoutToggle />);
    
    const radioGroup = screen.getByRole('radiogroup');
    expect(radioGroup).toHaveClass('flex-row'); // Horizontal layout on desktop
  });

  it('should handle keyboard navigation', async () => {
    const user = userEvent.setup();
    
    render(<LayoutToggle />);
    
    const circularOption = screen.getByLabelText(/circular layout/i);
    const rectangularOption = screen.getByLabelText(/rectangular layout/i);
    
    // Tab to first option
    await user.tab();
    expect(circularOption).toHaveFocus();
    
    // Arrow key to next option
    await user.keyboard('{ArrowDown}');
    expect(rectangularOption).toHaveFocus();
    
    // Enter to select
    await user.keyboard('{Enter}');
    expect(mockLayoutContext.setLayout).toHaveBeenCalledWith('rectangular');
  });

  it('should show visual feedback for selected option', () => {
    render(<LayoutToggle />);
    
    const circularContainer = screen.getByTestId('layout-option-circular');
    expect(circularContainer).toHaveClass('ring-2 ring-primary'); // Selected state
    
    const rectangularContainer = screen.getByTestId('layout-option-rectangular');
    expect(rectangularContainer).not.toHaveClass('ring-2 ring-primary'); // Not selected
  });

  it('should handle hover states properly', async () => {
    const user = userEvent.setup();
    
    render(<LayoutToggle />);
    
    const rectangularContainer = screen.getByTestId('layout-option-rectangular');
    
    await user.hover(rectangularContainer);
    expect(rectangularContainer).toHaveClass('hover:bg-gray-50');
  });

  it('should provide descriptive labels for each layout', () => {
    render(<LayoutToggle />);
    
    expect(screen.getByText('Circular')).toBeInTheDocument();
    expect(screen.getByText('Rectangular')).toBeInTheDocument();
  });

  it('should handle layout change with proper state update', async () => {
    const user = userEvent.setup();
    
    render(<LayoutToggle />);
    
    // Initially circular is selected
    expect(screen.getByLabelText(/circular layout/i)).toBeChecked();
    
    // Click rectangular
    const rectangularOption = screen.getByLabelText(/rectangular layout/i);
    await user.click(rectangularOption);
    
    // Should call setLayout
    expect(mockLayoutContext.setLayout).toHaveBeenCalledWith('rectangular');
    expect(mockLayoutContext.setLayout).toHaveBeenCalledTimes(1);
  });

  it('should handle focus states for accessibility', async () => {
    const user = userEvent.setup();
    
    render(<LayoutToggle />);
    
    const circularOption = screen.getByLabelText(/circular layout/i);
    
    await user.tab();
    expect(circularOption).toHaveFocus();
    expect(circularOption).toHaveClass('focus:ring-2');
  });

  it('should work with reduced available layouts', () => {
    mockLayoutContext.availableLayouts = ['circular'] as const;
    
    render(<LayoutToggle />);
    
    expect(screen.getByLabelText(/circular layout/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/rectangular layout/i)).not.toBeInTheDocument();
  });

  it('should handle edge case with no available layouts', () => {
    mockLayoutContext.availableLayouts = [] as any;
    
    const { container } = render(<LayoutToggle />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should show compact design on tablet', () => {
    // Set to tablet
    Object.assign(mockBreakpoint, {
      isMobile: false,
      isTablet: true,
      isDesktop: false,
      currentBreakpoint: 'tablet' as const,
      isMobileOrTablet: () => true,
      isTabletOrLarger: () => true,
      isDesktopOrLarger: () => false,
    });

    render(<LayoutToggle />);
    
    const radioGroup = screen.getByRole('radiogroup');
    expect(radioGroup).toHaveClass('gap-2'); // Compact spacing on tablet
  });
});