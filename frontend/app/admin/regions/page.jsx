import { AdminLayout } from "../../../components/admin/AdminLayout";
import AdminRegionsPage from "../../../components/admin/AdminRegionsPage";

export const dynamic = "force-dynamic";

export default function RegionsPage() {
  return (
    <AdminLayout
      title="地区设置"
      subtitle="维护地区和号码规则。"
    >
      <AdminRegionsPage />
    </AdminLayout>
  );
}
