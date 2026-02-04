const eventStoreByUser = new Map();

export function addClientEvent(userId, event) {
  if (!eventStoreByUser.has(userId)) {
    eventStoreByUser.set(userId, []);
  }
  const list = eventStoreByUser.get(userId);
  list.unshift(event);
  if (list.length > 200) {
    list.pop();
  }
  return list;
}

export function getClientEvents(userId) {
  if (!eventStoreByUser.has(userId)) {
    eventStoreByUser.set(userId, []);
  }
  return eventStoreByUser.get(userId);
}

export function clearClientEvents(userId) {
  eventStoreByUser.set(userId, []);
  return [];
}
