// src/context/HeatMapContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface HeatMapContextProps {
  heatMapMax: number;
  setHeatMapMax: (value: number) => void;
}

const HeatMapContext = createContext<HeatMapContextProps | undefined>(undefined);

export const HeatMapProvider = ({ children }: { children: ReactNode }) => {
  const [heatMapMax, setHeatMapMax] = useState<number>(20); // Default value of 30

  return (
    <HeatMapContext.Provider value={{ heatMapMax, setHeatMapMax }}>
      {children}
    </HeatMapContext.Provider>
  );
};

export const useHeatMapContext = (): HeatMapContextProps => {
  const context = useContext(HeatMapContext);
  if (!context) {
    throw new Error('useHeatMapContext must be used within a HeatMapProvider');
  }
  return context;
};
