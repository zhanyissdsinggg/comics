import { AdminLayout } from "../../../components/admin/AdminLayout";
import AdminRegionsPage from "../../../components/admin/AdminRegionsPage";

export const dynamic = "force-dynamic";

export default function RegionsPage() {
  return (
    <AdminLayout
      title="区域设置"
      subtitle="把地区和号码规则收在一个清爽页面里处理，不去挤占核心内容工作流。"
    >
      <AdminRegionsPage />
    </AdminLayout>
  );
}
