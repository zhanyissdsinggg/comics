import { AdminLayout } from "../../../components/admin/AdminLayout";
import AdminEmailSettingsPage from "../../../components/admin/AdminEmailSettingsPage";

export const dynamic = "force-dynamic";

export default function EmailSettingsPage() {
  return (
    <AdminLayout
      title="Email Settings"
      subtitle="Manage sender identity, delivery defaults, and the email settings that support reader communication."
    >
      <AdminEmailSettingsPage />
    </AdminLayout>
  );
}
