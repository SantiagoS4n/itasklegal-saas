import { useState, useCallback } from 'react';

export function useToast() {
  const [toast, setToast] = useState(null); // { message, type }

  const show = useCallback((message, type = 'success', duration = 2500) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  }, []);

  return { toast, show };
}
