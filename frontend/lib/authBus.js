const listeners = new Set();

export function emitAuthRequired(payload) {
  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (err) {
      // ignore listener errors
    }
  });
}

export function subscribeAuthRequired(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
