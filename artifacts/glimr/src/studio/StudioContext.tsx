import { createContext, useContext, useRef } from 'react';
import { StudioEngine } from './StudioEngine';

const StudioContext = createContext<StudioEngine | null>(null);

export const StudioProvider = ({ children }: { children: React.ReactNode }) => {
  const engine = useRef(new StudioEngine());
  return (
    <StudioContext.Provider value={engine.current}>
      {children}
    </StudioContext.Provider>
  );
};

export const useStudio = (): StudioEngine => {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error('useStudio must be used within a StudioProvider');
  return ctx;
};
