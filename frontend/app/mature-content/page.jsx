import MatureContentSettingsPage from "../../components/adult/MatureContentSettingsPage";
import { buildNoIndexRobots, createPageMetadata } from "../../lib/seo";

export const metadata = createPageMetadata({
  title: "Mature Content Settings",
  description: "Mature content settings and 18+ access controls.",
  path: "/mature-content",
  robots: buildNoIndexRobots({ follow: false }),
});

export default function Page() {
  return <MatureContentSettingsPage />;
}
