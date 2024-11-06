'use client'
import React, { createContext, useState, ReactNode, useContext, useEffect } from 'react';

interface AppContextProps {
  isStateTrue: boolean;
  setStateTrue: () => void;
  setStateFalse: () => void;
  isInitialized: boolean;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [isStateTrue, setIsStateTrue] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedValue = localStorage.getItem('isStateTrue');
      setIsStateTrue(storedValue ? JSON.parse(storedValue) : false);
      setIsInitialized(true); // Set initialized to true once the state is set from localStorage
    }
  }, []);

  const setStateTrue = () => {
    setIsStateTrue(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('isStateTrue', 'true');
    }
  };

  const setStateFalse = () => {
    setIsStateTrue(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('isStateTrue', 'false');
    }
  };

  return (
    <AppContext.Provider value={{ isStateTrue, setStateTrue, setStateFalse, isInitialized }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextProps => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
