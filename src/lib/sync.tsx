import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface SyncContextType {
  lastSync: Date | null;
  updateLastSync: () => void;
}

const SyncContext = createContext<SyncContextType | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [lastSync, setLastSync] = useState<Date | null>(new Date());

  const updateLastSync = useCallback(() => {
    setLastSync(new Date());
  }, []);

  return (
    <SyncContext.Provider value={{ lastSync, updateLastSync }}>
      {children}
    </SyncContext.Provider>
  );
}

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used within a SyncProvider');
  return context;
};
