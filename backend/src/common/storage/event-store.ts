const eventStoreByUser = new Map<string, any[]>();

export function addClientEvent(userId: string, event: any): any[] {
  if (!eventStoreByUser.has(userId)) {
    eventStoreByUser.set(userId, []);
  }
  const list = eventStoreByUser.get(userId)!;
  list.unshift(event);
  if (list.length > 200) {
    list.pop();
  }
  return list;
}

export function getClientEvents(userId: string): any[] {
  if (!eventStoreByUser.has(userId)) {
    eventStoreByUser.set(userId, []);
  }
  return eventStoreByUser.get(userId)!;
}

export function clearClientEvents(userId: string): any[] {
  eventStoreByUser.set(userId, []);
  return [];
}
