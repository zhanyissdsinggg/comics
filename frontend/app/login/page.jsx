import FigmaLoginPage from "../../components/figma/FigmaLoginPage";
import { createPageMetadata } from "../../lib/seo";

export const metadata = createPageMetadata({
  title: "Sign In",
  description: "Sign in to Gush.",
  path: "/login",
  robots: {
    index: false,
    follow: false,
  },
});

export default function LoginPage() {
  return <FigmaLoginPage />;
}
