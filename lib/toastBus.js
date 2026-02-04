const listeners = new Set();

export function emitToast(payload) {
  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (err) {
      // ignore listener errors
    }
  });
}

export function subscribeToast(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
