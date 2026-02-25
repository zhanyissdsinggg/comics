const listeners = new Set();
const buffer = [];
const MAX_BUFFER = 50;

export function emitEvent(payload) {
  if (!payload) {
    return;
  }
  buffer.unshift({ ...payload, ts: Date.now() });
  if (buffer.length > MAX_BUFFER) {
    buffer.pop();
  }
  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (err) {
      // ignore
    }
  });
}

export function getEventBuffer() {
  return [...buffer];
}

export function clearEventBuffer() {
  buffer.splice(0, buffer.length);
}

export function subscribeEvents(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
