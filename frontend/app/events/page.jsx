import { createPageMetadata } from "../../lib/seo";
import EventsPageClient from "./EventsPageClient";

export const metadata = createPageMetadata({
  title: "Internal Event Console",
  description: "Inspect local frontend events and the signed-in server event log from one internal observability console.",
  path: "/events",
  robots: {
    index: false,
    follow: false,
  },
});

export default function Page() {
  return <EventsPageClient />;
}
