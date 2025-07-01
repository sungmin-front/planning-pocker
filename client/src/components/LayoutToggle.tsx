import React from 'react';
import { useLayout, LayoutType } from '@/contexts/LayoutContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { cn } from '@/lib/utils';

// Layout option icons (using simple SVG)
const CircularIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    data-testid="circular-icon"
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="8" r="1" />
    <circle cx="8" cy="12" r="1" />
    <circle cx="16" cy="12" r="1" />
    <circle cx="12" cy="16" r="1" />
  </svg>
);

const RectangularIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    data-testid="rectangular-icon"
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="12" cy="8" r="1" />
    <circle cx="8" cy="12" r="1" />
    <circle cx="16" cy="12" r="1" />
    <circle cx="12" cy="16" r="1" />
  </svg>
);

interface LayoutOptionConfig {
  type: LayoutType;
  label: string;
  description: string;
  icon: React.FC<{ className?: string }>;
}

const layoutOptions: Record<LayoutType, LayoutOptionConfig> = {
  circular: {
    type: 'circular',
    label: 'Circular Layout',
    description: 'Players arranged in a circle around the center',
    icon: CircularIcon,
  },
  rectangular: {
    type: 'rectangular',
    label: 'Rectangular Layout', 
    description: 'Players arranged in a rectangular grid',
    icon: RectangularIcon,
  },
};

export const LayoutToggle: React.FC = () => {
  const { layout, setLayout, availableLayouts } = useLayout();
  const { isMobile, isTablet } = useBreakpoint();

  // Don't render if no layouts available
  if (availableLayouts.length === 0) {
    return null;
  }

  const handleLayoutChange = (newLayout: LayoutType) => {
    setLayout(newLayout);
  };

  const getContainerClasses = () => {
    if (isMobile) {
      return 'flex-col gap-3';
    }
    if (isTablet) {
      return 'flex-row gap-2';
    }
    return 'flex-row gap-4';
  };

  const getMainContainerClasses = () => {
    if (isMobile) {
      return 'space-y-3';
    }
    if (isTablet) {
      return 'space-y-3 gap-2';
    }
    return 'space-y-3';
  };

  const getOptionClasses = (optionType: LayoutType) => {
    const isSelected = layout === optionType;
    const baseClasses = [
      'flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200',
      'hover:bg-gray-50 hover:shadow-sm',
      'focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2',
    ];

    if (isSelected) {
      baseClasses.push('ring-2 ring-primary bg-primary/5 border-primary');
    } else {
      baseClasses.push('border-gray-200 bg-white');
    }

    if (isMobile) {
      baseClasses.push('w-full');
    }

    return baseClasses.join(' ');
  };

  const getLabelClasses = () => {
    if (isMobile) {
      return 'text-sm font-medium';
    }
    return 'text-base font-medium';
  };

  return (
    <div data-testid="layout-toggle" className={cn(getMainContainerClasses())}>
      <div id="layout-toggle-label" className={cn('text-gray-900', isMobile ? 'text-base' : 'text-lg', 'font-semibold')}>
        Layout
      </div>
      
      <div
        role="radiogroup"
        aria-labelledby="layout-toggle-label"
        className={cn('flex', getContainerClasses())}
      >
        {availableLayouts.map((optionType) => {
          const option = layoutOptions[optionType];
          const isSelected = layout === optionType;
          const Icon = option.icon;

          return (
            <div
              key={optionType}
              data-testid={`layout-option-${optionType}`}
              className={getOptionClasses(optionType)}
              title={option.description}
            >
              <label className="flex items-center cursor-pointer w-full">
                <input
                  type="radio"
                  name="layout"
                  value={optionType}
                  checked={isSelected}
                  onChange={() => handleLayoutChange(optionType)}
                  aria-label={option.label}
                  className="sr-only focus:ring-2 focus:ring-primary"
                />
                
                <div className="flex items-center space-x-3 w-full">
                  <Icon
                    className={cn(
                      'flex-shrink-0',
                      isMobile ? 'w-5 h-5' : 'w-6 h-6',
                      isSelected ? 'text-primary' : 'text-gray-600'
                    )}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className={cn(getLabelClasses(), isSelected ? 'text-primary' : 'text-gray-900')}>
                      {option.type === 'circular' ? 'Circular' : 'Rectangular'}
                    </div>
                    {!isMobile && (
                      <div className="text-xs text-gray-500 mt-1">
                        {option.description}
                      </div>
                    )}
                  </div>
                  
                  {/* Selection indicator */}
                  <div
                    className={cn(
                      'w-4 h-4 rounded-full border-2 flex-shrink-0',
                      isSelected
                        ? 'bg-primary border-primary'
                        : 'border-gray-300'
                    )}
                  >
                    {isSelected && (
                      <div className="w-full h-full rounded-full bg-white scale-50" />
                    )}
                  </div>
                </div>
              </label>
            </div>
          );
        })}
      </div>
      
      {/* Mobile description */}
      {isMobile && (
        <div className="text-xs text-gray-500">
          {layoutOptions[layout].description}
        </div>
      )}
    </div>
  );
};