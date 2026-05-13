import { useRef, useCallback } from 'react';

/**
 * Debounce function that delays execution of a function
 * Useful for reducing API calls during rapid user input
 */
export function debounce<T extends any[], R>(
  func: (...args: T) => R,
  wait: number
): (...args: T) => void {
  let timeout: NodeJS.Timeout;
  return function (...args: T) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * React hook version of debounce
 * Returns a debounced callback that won't trigger immediately on every call
 */
export function useDebouncedCallback<T extends any[]>(
  callback: (...args: T) => void,
  delay: number
) {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    (...args: T) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    },
    [callback, delay]
  );
}
