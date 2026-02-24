import { Injectable } from "@nestjs/common";
import { addClientEvent, clearClientEvents, getClientEvents } from "../../common/storage/event-store";

@Injectable()
export class EventsService {
  list(userId: string) {
    return getClientEvents(userId);
  }

  add(userId: string, payload: any) {
    return addClientEvent(userId, payload);
  }

  clear(userId: string) {
    return clearClientEvents(userId);
  }

  addBatch(userId: string, events: any[]) {
    // Add multiple events at once
    events.forEach((event) => {
      addClientEvent(userId, {
        event: event.event,
        props: event.props || {},
        ts: event.ts || Date.now(),
      });
    });
    return getClientEvents(userId);
  }
}
