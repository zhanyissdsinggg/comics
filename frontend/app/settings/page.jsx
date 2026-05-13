import { ReaderSettingsProvider } from "../../store/useReaderSettingsStore";
import FigmaSettingsPage from "../../components/figma/FigmaSettingsPage";
import { createPageMetadata } from "../../lib/seo";

export const metadata = createPageMetadata({
  title: "Settings",
  description:
    "Manage reading preferences, mature access, and device behavior.",
  path: "/settings",
  robots: {
    index: false,
    follow: false,
  },
});

export default function Page() {
  return (
    <ReaderSettingsProvider>
      <FigmaSettingsPage />
    </ReaderSettingsProvider>
  );
}
