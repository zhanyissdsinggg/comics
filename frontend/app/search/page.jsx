import SearchPageShell from "./SearchPageShell";
import { buildNoIndexRobots, createPageMetadata } from "../../lib/seo";

export const metadata = createPageMetadata({
  title: "Search Stories",
  description: "Browse stories, creators, and formats on Gush.",
  path: "/search",
  robots: buildNoIndexRobots({ follow: true }),
});

export default function Page() {
  return <SearchPageShell />;
}
