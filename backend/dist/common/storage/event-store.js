"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addClientEvent = addClientEvent;
exports.getClientEvents = getClientEvents;
exports.clearClientEvents = clearClientEvents;
const eventStoreByUser = new Map();
function addClientEvent(userId, event) {
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
function getClientEvents(userId) {
    if (!eventStoreByUser.has(userId)) {
        eventStoreByUser.set(userId, []);
    }
    return eventStoreByUser.get(userId);
}
function clearClientEvents(userId) {
    eventStoreByUser.set(userId, []);
    return [];
}
