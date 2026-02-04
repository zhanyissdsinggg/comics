import { Suspense } from "react";
import AdminEmailJobsPage from "../../../components/admin/AdminEmailJobsPage";

export default function EmailJobsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminEmailJobsPage />
    </Suspense>
  );
}
