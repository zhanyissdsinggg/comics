import { cookies } from "next/headers";
import LibraryPage from "../../components/library/LibraryPage";
import { createPageMetadata } from "../../lib/seo";
import {
  hasServerSessionCookie,
  isServerAdultModeEnabled,
} from "../../lib/serverAdultGate";

export const metadata = createPageMetadata({
  title: "Library",
  description: "Your saved series, reading history, and continue reading list.",
  path: "/library",
  robots: {
    index: false,
    follow: false,
  },
});

export default async function Page() {
  const cookieStore = await cookies();
  const initialSignedIn =
    cookieStore.get("mn_is_signed_in")?.value === "1" ||
    hasServerSessionCookie(cookieStore);
  const initialAdultMode = await isServerAdultModeEnabled();

  return (
    <LibraryPage
      initialSignedIn={initialSignedIn}
      initialAdultMode={initialAdultMode}
    />
  );
}
