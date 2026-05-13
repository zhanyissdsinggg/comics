import { createPageMetadata } from "../../lib/seo";
import AdminLayoutClient from "./layout-client";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "后台管理",
  description:
    "Gush 运营后台，集中处理作品、创作者、首页编排、订单与支持事务。",
  path: "/admin",
  robots: {
    index: false,
    follow: false,
  },
});

export default function AdminLayout({ children }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
