import { useCallback, useRef, useState } from 'react';

const DEFAULT_DURATION = 3000;

export function useToast() {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const clearToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback((message, options = {}) => {
    const { type = 'info', duration = DEFAULT_DURATION } = options;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    const nextToast = { message, type, id: Date.now() };
    setToast(nextToast);
    if (duration > 0) {
      timerRef.current = setTimeout(() => {
        setToast(null);
        timerRef.current = null;
      }, duration);
    }
  }, []);

  return { toast, showToast, clearToast };
}
