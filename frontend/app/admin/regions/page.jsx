import { AdminLayout } from '../../../components/admin/AdminLayout';
import AdminRegionsPage from '../../../components/admin/AdminRegionsPage';

export const dynamic = 'force-dynamic';

export default function RegionsPage() {
  return (
    <AdminLayout title="地区设置">
      <AdminRegionsPage />
    </AdminLayout>
  );
}
