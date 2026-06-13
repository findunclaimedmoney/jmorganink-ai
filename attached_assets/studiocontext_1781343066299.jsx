import { createContext, useContext, useRef } from 'react';
import { StudioEngine } from './StudioEngine';

const StudioContext = createContext(null);

export const StudioProvider = ({ children }) => {
  const engine = useRef(new StudioEngine());
  return (
    <StudioContext.Provider value={engine.current}>
      {children}
    </StudioContext.Provider>
  );
};

export const useStudio = () => useContext(StudioContext);