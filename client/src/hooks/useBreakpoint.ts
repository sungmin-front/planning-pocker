import { useState, useEffect } from 'react';

type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'largeDesktop';

interface BreakpointState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  currentBreakpoint: Breakpoint;
  screenSize: {
    width: number;
    height: number;
  };
  isMobileOrTablet: () => boolean;
  isTabletOrLarger: () => boolean;
  isDesktopOrLarger: () => boolean;
}

// Tailwind CSS breakpoints
const breakpoints = {
  mobile: '(max-width: 639px)',
  tablet: '(min-width: 640px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px) and (max-width: 1279px)',
  largeDesktop: '(min-width: 1280px)',
} as const;

export const useBreakpoint = (): BreakpointState => {
  const [breakpointState, setBreakpointState] = useState<{
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isLargeDesktop: boolean;
    screenSize: { width: number; height: number };
  }>(() => {
    // Initialize with current values or defaults for SSR
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true, // Default to desktop for SSR
        isLargeDesktop: false,
        screenSize: { width: 1024, height: 768 },
      };
    }

    return {
      isMobile: window.matchMedia(breakpoints.mobile).matches,
      isTablet: window.matchMedia(breakpoints.tablet).matches,
      isDesktop: window.matchMedia(breakpoints.desktop).matches,
      isLargeDesktop: window.matchMedia(breakpoints.largeDesktop).matches,
      screenSize: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    };
  });

  useEffect(() => {
    // Skip if we're in SSR
    if (typeof window === 'undefined') return;

    const mediaQueries = Object.entries(breakpoints).map(([key, query]) => {
      const mq = window.matchMedia(query);
      return { key: key as Breakpoint, mq };
    });

    const updateBreakpoint = () => {
      const newState = {
        isMobile: mediaQueries.find(({ key }) => key === 'mobile')?.mq.matches || false,
        isTablet: mediaQueries.find(({ key }) => key === 'tablet')?.mq.matches || false,
        isDesktop: mediaQueries.find(({ key }) => key === 'desktop')?.mq.matches || false,
        isLargeDesktop: mediaQueries.find(({ key }) => key === 'largeDesktop')?.mq.matches || false,
        screenSize: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      };

      setBreakpointState(newState);
    };

    // Add listeners to all media queries
    mediaQueries.forEach(({ mq }) => {
      mq.addEventListener('change', updateBreakpoint);
    });

    // Also listen to window resize for screen size updates
    window.addEventListener('resize', updateBreakpoint);

    // Initial call to set correct state
    updateBreakpoint();

    // Cleanup
    return () => {
      mediaQueries.forEach(({ mq }) => {
        mq.removeEventListener('change', updateBreakpoint);
      });
      window.removeEventListener('resize', updateBreakpoint);
    };
  }, []);

  // Determine current breakpoint
  const getCurrentBreakpoint = (): Breakpoint => {
    if (breakpointState.isMobile) return 'mobile';
    if (breakpointState.isTablet) return 'tablet';
    if (breakpointState.isDesktop) return 'desktop';
    if (breakpointState.isLargeDesktop) return 'largeDesktop';
    return 'desktop'; // fallback
  };

  // Helper methods
  const isMobileOrTablet = (): boolean => 
    breakpointState.isMobile || breakpointState.isTablet;

  const isTabletOrLarger = (): boolean => 
    breakpointState.isTablet || breakpointState.isDesktop || breakpointState.isLargeDesktop;

  const isDesktopOrLarger = (): boolean => 
    breakpointState.isDesktop || breakpointState.isLargeDesktop;

  return {
    ...breakpointState,
    currentBreakpoint: getCurrentBreakpoint(),
    isMobileOrTablet,
    isTabletOrLarger,
    isDesktopOrLarger,
  };
};