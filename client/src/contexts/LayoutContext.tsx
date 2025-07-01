import React, { createContext, useContext, useState, ReactNode } from 'react';

export type LayoutType = 'circular' | 'rectangular';

interface LayoutContextType {
  layout: LayoutType;
  setLayout: (layout: LayoutType) => void;
  availableLayouts: readonly LayoutType[];
}

const LayoutContext = createContext<LayoutContextType | null>(null);

export const useLayout = (): LayoutContextType => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};

interface LayoutProviderProps {
  children: ReactNode;
  defaultLayout?: LayoutType;
  availableLayouts?: readonly LayoutType[];
}

export const LayoutProvider: React.FC<LayoutProviderProps> = ({
  children,
  defaultLayout = 'circular',
  availableLayouts = ['circular', 'rectangular'],
}) => {
  const [layout, setLayout] = useState<LayoutType>(defaultLayout);

  const value: LayoutContextType = {
    layout,
    setLayout,
    availableLayouts,
  };

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
};