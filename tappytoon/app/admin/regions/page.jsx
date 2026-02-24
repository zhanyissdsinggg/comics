import { Suspense } from "react";
import AdminRegionsPage from "../../../components/admin/AdminRegionsPage";

export default function RegionsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminRegionsPage />
    </Suspense>
  );
}
