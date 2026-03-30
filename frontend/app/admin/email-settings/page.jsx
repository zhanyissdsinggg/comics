import { AdminLayout } from "../../../components/admin/AdminLayout";
import AdminEmailSettingsPage from "../../../components/admin/AdminEmailSettingsPage";

export const dynamic = "force-dynamic";

export default function EmailSettingsPage() {
  return (
    <AdminLayout
      title="邮件设置"
      subtitle="统一管理发件身份、默认投递方式，以及支撑读者沟通的邮件配置。"
    >
      <AdminEmailSettingsPage />
    </AdminLayout>
  );
}
