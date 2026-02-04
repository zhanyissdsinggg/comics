import { Suspense } from "react";
import AdminEmailSettingsPage from "../../../components/admin/AdminEmailSettingsPage";

export default function EmailSettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminEmailSettingsPage />
    </Suspense>
  );
}
