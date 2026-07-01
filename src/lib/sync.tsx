import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { db } from './firebase';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Cloud, CloudOff, RefreshCw, CheckCircle } from 'lucide-react';

export interface SyncItem {
  id: string;
  collectionName: string;
  action: 'create' | 'update' | 'delete';
  docId: string;
  data: any;
  timestamp: number;
  attempts: number;
  error?: string;
}

interface SyncContextType {
  lastSync: Date | null;
  updateLastSync: () => void;
  isOnline: boolean;
  isSyncing: boolean;
  syncQueue: SyncItem[];
  forceSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | null>(null);

export function getSyncQueue(): SyncItem[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('loruk_sync_queue');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
}

export function addToSyncQueue(
  collectionName: string,
  action: 'create' | 'update' | 'delete',
  docId: string,
  data: any
) {
  if (typeof window === 'undefined') return;
  const queue = getSyncQueue();
  
  // Collapse and optimize operations on the same document to avoid redundant/overlapping updates
  let shouldAdd = true;
  
  if (action === 'update') {
    const existingIdx = queue.findIndex(item => item.collectionName === collectionName && item.docId === docId && item.action === 'create');
    if (existingIdx !== -1) {
      queue[existingIdx].data = { ...queue[existingIdx].data, ...data };
      shouldAdd = false;
    } else {
      const existingUpdateIdx = queue.findIndex(item => item.collectionName === collectionName && item.docId === docId && item.action === 'update');
      if (existingUpdateIdx !== -1) {
        queue[existingUpdateIdx].data = { ...queue[existingUpdateIdx].data, ...data };
        shouldAdd = false;
      }
    }
  } else if (action === 'delete') {
    const existingCreateIdx = queue.findIndex(item => item.collectionName === collectionName && item.docId === docId && item.action === 'create');
    if (existingCreateIdx !== -1) {
      queue.splice(existingCreateIdx, 1);
      shouldAdd = false;
    }
  }

  if (shouldAdd) {
    const newItem: SyncItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      collectionName,
      action,
      docId,
      data,
      timestamp: Date.now(),
      attempts: 0
    };
    queue.push(newItem);
  }

  localStorage.setItem('loruk_sync_queue', JSON.stringify(queue));
  window.dispatchEvent(new Event('sync-queue-changed'));
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const [lastSync, setLastSync] = useState<Date | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('loruk_last_sync');
      return stored ? new Date(stored) : new Date();
    }
    return new Date();
  });
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncQueue, setSyncQueue] = useState<SyncItem[]>(getSyncQueue);
  const [showNotification, setShowNotification] = useState<'offline' | 'syncing' | 'synced' | null>(null);

  const updateLastSync = useCallback(() => {
    const now = new Date();
    setLastSync(now);
    if (typeof window !== 'undefined') {
      localStorage.setItem('loruk_last_sync', now.toISOString());
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      setShowNotification('synced');
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowNotification('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (showNotification === 'synced') {
      const timer = setTimeout(() => {
        setShowNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showNotification]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleQueueChange = () => {
      setSyncQueue(getSyncQueue());
    };
    window.addEventListener('sync-queue-changed', handleQueueChange);
    return () => {
      window.removeEventListener('sync-queue-changed', handleQueueChange);
    };
  }, []);

  const forceSync = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const queue = getSyncQueue();
    if (queue.length === 0) return;
    if (isSyncing || !navigator.onLine) return;

    setIsSyncing(true);
    setShowNotification('syncing');

    const remainingItems: SyncItem[] = [];

    for (const item of queue) {
      try {
        if (item.action === 'create') {
          await setDoc(doc(db, item.collectionName, item.docId), item.data);
        } else if (item.action === 'update') {
          await updateDoc(doc(db, item.collectionName, item.docId), item.data);
        } else if (item.action === 'delete') {
          await deleteDoc(doc(db, item.collectionName, item.docId));
        }
      } catch (err: any) {
        console.error(`Sync failure on ${item.id} (${item.collectionName}):`, err);
        
        const isNetworkErr = err?.code === 'unavailable' || 
                             err?.code === 'deadline-exceeded' ||
                             err?.message?.toLowerCase().includes('network') ||
                             err?.message?.toLowerCase().includes('offline');

        if (isNetworkErr) {
          remainingItems.push(...queue.slice(queue.indexOf(item)));
          break;
        } else {
          item.attempts += 1;
          item.error = err?.message || String(err);
          if (item.attempts < 5) {
            remainingItems.push(item);
          } else {
            console.error(`Sync max retries exceeded. Discarding operation:`, item);
          }
        }
      }
    }

    localStorage.setItem('loruk_sync_queue', JSON.stringify(remainingItems));
    setSyncQueue(remainingItems);
    setIsSyncing(false);
    updateLastSync();

    if (remainingItems.length === 0) {
      setShowNotification('synced');
      window.dispatchEvent(new Event('db-changed'));
    } else {
      setShowNotification(null);
    }
  }, [isSyncing, updateLastSync]);

  useEffect(() => {
    if (isOnline && syncQueue.length > 0) {
      forceSync();
    }
  }, [isOnline, syncQueue.length, forceSync]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isOnline && syncQueue.length > 0) {
        forceSync();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [isOnline, syncQueue.length, forceSync]);

  return (
    <SyncContext.Provider value={{ lastSync, updateLastSync, isOnline, isSyncing, syncQueue, forceSync }}>
      {children}
      
      {showNotification && (
        <div className="fixed bottom-5 right-5 z-50 animate-fade-in-up">
          {showNotification === 'offline' && (
            <div className="flex items-center gap-4 bg-slate-900/95 dark:bg-white/5 text-slate-100 px-5 py-4 rounded-xl border border-amber-500/30 shadow-xl max-w-sm backdrop-blur-md">
              <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-lg">
                <CloudOff className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-xs text-amber-400 uppercase tracking-widest leading-none mb-1">Offline Mode</p>
                <p className="text-sm font-medium text-theme-text-muted leading-tight">Changes saved locally; will sync when network is back.</p>
              </div>
            </div>
          )}

          {showNotification === 'syncing' && (
            <div className="flex items-center gap-4 bg-slate-900/95 dark:bg-white/5 text-slate-100 px-5 py-4 rounded-xl border border-theme-border shadow-xl max-w-sm backdrop-blur-md">
              <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg animate-spin animate-infinite">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-xs text-blue-400 uppercase tracking-widest leading-none mb-1">Syncing Cloud</p>
                <p className="text-sm font-medium text-theme-text-muted leading-tight">Synchronizing {syncQueue.length} pending updates...</p>
              </div>
            </div>
          )}

          {showNotification === 'synced' && (
            <div className="flex items-center gap-4 bg-slate-900/95 dark:bg-white/5 text-slate-100 px-5 py-4 rounded-xl border border-emerald-500/30 shadow-xl max-w-sm backdrop-blur-md">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-xs text-emerald-400 uppercase tracking-widest leading-none mb-1">Network Restored</p>
                <p className="text-sm font-medium text-theme-text-muted leading-tight">All database updates synchronized successfully!</p>
              </div>
              <button 
                onClick={() => setShowNotification(null)}
                className="text-theme-text-muted hover:text-theme-text text-xs ml-2 border border-slate-700 hover:border-slate-500 px-2 py-0.5 rounded cursor-pointer transition-all"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}
    </SyncContext.Provider>
  );
}

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used within a SyncProvider');
  return context;
};
