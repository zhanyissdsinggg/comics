import { AdminLayout } from "../../../components/admin/AdminLayout";
import AdminRegionsPage from "../../../components/admin/AdminRegionsPage";

export const dynamic = "force-dynamic";

export default function RegionsPage() {
  return (
    <AdminLayout
      title="Regions"
      subtitle="Manage locale and regional settings without crowding the core publishing workflow."
    >
      <AdminRegionsPage />
    </AdminLayout>
  );
}
