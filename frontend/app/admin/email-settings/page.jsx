import { AdminLayout } from "../../../components/admin/AdminLayout";
import AdminEmailSettingsPage from "../../../components/admin/AdminEmailSettingsPage";

export const dynamic = "force-dynamic";

export default function EmailSettingsPage() {
  return (
    <AdminLayout title="邮件设置" subtitle="管理发信身份和邮件配置。">
      <AdminEmailSettingsPage />
    </AdminLayout>
  );
}
