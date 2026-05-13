export const dynamic = "force-dynamic";

import AdminLoginPage from "../../../components/admin/AdminLoginPage";
import { createPageMetadata } from "../../../lib/seo";

export const metadata = createPageMetadata({
  title: "后台登录",
  description: "Gush 管理后台安全登录入口。",
  path: "/admin/login",
  robots: {
    index: false,
    follow: false,
  },
});

export default function LoginPage() {
  return <AdminLoginPage />;
}
