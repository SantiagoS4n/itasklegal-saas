import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const DirtyContext = createContext(null);

// Registro global simple — permite que funciones fuera de React marquen dirty
const dirtyRegistry = new Set();
const listeners = new Set();

export const dirtyStore = {
  add(id) {
    if (!dirtyRegistry.has(id)) {
      dirtyRegistry.add(id);
      listeners.forEach(fn => fn(dirtyRegistry.size));
    }
  },
  remove(id) {
    if (dirtyRegistry.has(id)) {
      dirtyRegistry.delete(id);
      listeners.forEach(fn => fn(dirtyRegistry.size));
    }
  },
  clear() {
    dirtyRegistry.clear();
    listeners.forEach(fn => fn(0));
  },
  size() { return dirtyRegistry.size; },
};

export function DirtyProvider({ children }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const listener = (size) => setCount(size);
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  const clearAll = useCallback(() => dirtyStore.clear(), []);

  return (
    <DirtyContext.Provider value={{ dirtyCount: count, hasUnsaved: count > 0, clearAll }}>
      {children}
    </DirtyContext.Provider>
  );
}

export const useDirty = () => {
  const ctx = useContext(DirtyContext);
  if (!ctx) throw new Error('useDirty must be used within DirtyProvider');
  return ctx;
};
