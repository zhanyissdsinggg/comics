import MatureContentSettingsPage from "../../components/adult/MatureContentSettingsPage";
import { createPageMetadata } from "../../lib/seo";

export const metadata = createPageMetadata({
  title: "18+ Access",
  description: "Mature content settings and 18+ access controls.",
  path: "/mature-content",
});

export default function Page() {
  return <MatureContentSettingsPage />;
}
