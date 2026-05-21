import FigmaSearchPage from "../../components/figma/FigmaSearchPage";
import { buildNoIndexRobots, createPageMetadata } from "../../lib/seo";

export const metadata = createPageMetadata({
  title: "Interactive Stories",
  description: "Browse interactive stories on Gush.",
  path: "/interactive",
  robots: buildNoIndexRobots({ follow: true }),
});

export default function InteractivePage() {
  return (
    <FigmaSearchPage
      initialQuery=""
      initialFormat="interactive"
      initialResults={[]}
      initialHotKeywords={[]}
      initialReady
      interactiveOnly
    />
  );
}
