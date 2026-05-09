import FigmaLoginPage from "../../components/figma/FigmaLoginPage";
import { createPageMetadata } from "../../lib/seo";

export const metadata = createPageMetadata({
  title: "Sign In",
  description: "Sign in to Gush.",
  path: "/signin",
  robots: {
    index: false,
    follow: false,
  },
});

export default function SignInPage() {
  return <FigmaLoginPage />;
}
