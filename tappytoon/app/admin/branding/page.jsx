import { Suspense } from "react";
import AdminBrandingPage from "../../../components/admin/AdminBrandingPage";

export default function BrandingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminBrandingPage />
    </Suspense>
  );
}
