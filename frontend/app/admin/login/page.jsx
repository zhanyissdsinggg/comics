
export const dynamic = 'force-dynamic';

import AdminLoginPage from "../../../components/admin/AdminLoginPage";
import { createPageMetadata } from "../../../lib/seo";

export const metadata = createPageMetadata({
  title: "Admin Sign In",
  description: "Secure access for the Gush admin workspace.",
  path: "/admin/login",
  robots: {
    index: false,
    follow: false,
  },
});

export default function LoginPage() {
  return <AdminLoginPage />;
}
