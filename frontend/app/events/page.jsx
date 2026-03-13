import { createPageMetadata } from "../../lib/seo";
import EventsPageClient from "./EventsPageClient";

export const metadata = createPageMetadata({
  title: "Event Log",
  description: "Inspect local frontend events and the signed-in server event log from one observability console.",
  path: "/events",
});

export default function Page() {
  return <EventsPageClient />;
}
