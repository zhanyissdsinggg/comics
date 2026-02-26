import { useRef } from "react";

export function useRetryPolicy() {
  const attemptsRef = useRef({});

  const shouldRetry = (key, maxAttempts = 2) => {
    const attempts = attemptsRef.current[key] || 0;
    if (attempts >= maxAttempts) {
      return false;
    }
    attemptsRef.current[key] = attempts + 1;
    return true;
  };

  return { shouldRetry };
}
