import InteractiveLandingPage from "../../components/interactive/InteractiveLandingPage";
import { createPageMetadata } from "../../lib/seo";
import { buildInteractiveLandingRobots } from "../../lib/interactiveSeo";

export const metadata = createPageMetadata({
  title: "Interactive Stories",
  description: "Choose the route. Push the story somewhere nobody else took it.",
  path: "/interactive",
  robots: buildInteractiveLandingRobots(),
});

export default function InteractiveLandingRoute() {
  return <InteractiveLandingPage />;
}
