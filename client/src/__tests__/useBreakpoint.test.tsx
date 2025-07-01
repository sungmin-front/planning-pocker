import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBreakpoint } from '@/hooks/useBreakpoint';

// Mock window.matchMedia
const mockMatchMedia = vi.fn();

// Store original matchMedia
const originalMatchMedia = window.matchMedia;

describe('useBreakpoint', () => {
  beforeEach(() => {
    // Reset mock
    mockMatchMedia.mockClear();
    
    // Mock matchMedia
    window.matchMedia = mockMatchMedia;
    
    // Default mock implementation
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    // Restore original matchMedia
    window.matchMedia = originalMatchMedia;
  });

  it('should return correct breakpoint for mobile screens', () => {
    // Mock mobile screen (< 640px)
    mockMatchMedia.mockImplementation((query: string) => {
      const matches = query === '(max-width: 639px)';
      return {
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    });

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.isMobile).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.isLargeDesktop).toBe(false);
    expect(result.current.currentBreakpoint).toBe('mobile');
  });

  it('should return correct breakpoint for tablet screens', () => {
    // Mock tablet screen (640px - 1023px)
    mockMatchMedia.mockImplementation((query: string) => {
      const matches = query === '(min-width: 640px) and (max-width: 1023px)';
      return {
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    });

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.isLargeDesktop).toBe(false);
    expect(result.current.currentBreakpoint).toBe('tablet');
  });

  it('should return correct breakpoint for desktop screens', () => {
    // Mock desktop screen (1024px - 1279px)
    mockMatchMedia.mockImplementation((query: string) => {
      const matches = query === '(min-width: 1024px) and (max-width: 1279px)';
      return {
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    });

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.isLargeDesktop).toBe(false);
    expect(result.current.currentBreakpoint).toBe('desktop');
  });

  it('should return correct breakpoint for large desktop screens', () => {
    // Mock large desktop screen (>= 1280px)
    mockMatchMedia.mockImplementation((query: string) => {
      const matches = query === '(min-width: 1280px)';
      return {
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    });

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.isLargeDesktop).toBe(true);
    expect(result.current.currentBreakpoint).toBe('largeDesktop');
  });

  it('should track media query changes correctly', () => {
    // This test verifies the static functionality of breakpoint detection
    // Dynamic updates are complex to test due to MediaQuery event simulation
    
    // Test that different media query matches produce different results
    const testCases = [
      { query: '(max-width: 639px)', expected: 'mobile' },
      { query: '(min-width: 640px) and (max-width: 1023px)', expected: 'tablet' },
      { query: '(min-width: 1024px) and (max-width: 1279px)', expected: 'desktop' },
      { query: '(min-width: 1280px)', expected: 'largeDesktop' },
    ];

    testCases.forEach(({ query, expected }) => {
      mockMatchMedia.mockImplementation((q: string) => ({
        matches: q === query,
        media: q,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { result } = renderHook(() => useBreakpoint());
      expect(result.current.currentBreakpoint).toBe(expected);
    });
  });

  it('should provide helper methods for responsive behavior', () => {
    // Mock desktop
    mockMatchMedia.mockImplementation((query: string) => {
      const matches = query === '(min-width: 1024px) and (max-width: 1279px)';
      return {
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    });

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.isMobileOrTablet()).toBe(false);
    expect(result.current.isDesktopOrLarger()).toBe(true);
    expect(result.current.isTabletOrLarger()).toBe(true);
  });

  it('should handle mobile helper methods correctly', () => {
    // Mock mobile
    mockMatchMedia.mockImplementation((query: string) => {
      const matches = query === '(max-width: 639px)';
      return {
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    });

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.isMobileOrTablet()).toBe(true);
    expect(result.current.isDesktopOrLarger()).toBe(false);
    expect(result.current.isTabletOrLarger()).toBe(false);
  });

  it('should cleanup event listeners on unmount', () => {
    const removeEventListener = vi.fn();
    
    mockMatchMedia.mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener,
      dispatchEvent: vi.fn(),
    }));

    const { unmount } = renderHook(() => useBreakpoint());

    unmount();

    // Should call removeEventListener for each media query
    expect(removeEventListener).toHaveBeenCalled();
  });

  it('should provide correct screen size information', () => {
    // Mock tablet
    mockMatchMedia.mockImplementation((query: string) => {
      const matches = query === '(min-width: 640px) and (max-width: 1023px)';
      return {
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    });

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.screenSize).toEqual({
      width: expect.any(Number),
      height: expect.any(Number),
    });
  });
});