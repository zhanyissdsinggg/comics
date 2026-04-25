import AdultHubPage from "../../components/adult/AdultHubPage";
import { createPageMetadata } from "../../lib/seo";

export const metadata = createPageMetadata({
  title: "18+ Series",
  description: "18+ titles.",
  path: "/adult",
  robots: {
    index: false,
    follow: false,
  },
});

export default function Page() {
  return <AdultHubPage />;
}
