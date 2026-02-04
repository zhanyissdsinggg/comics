import { Suspense } from "react";
import AdminBillingPage from "../../../components/admin/AdminBillingPage";

export const metadata = {
  title: "套餐定价",
};

export default function AdminBilling() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminBillingPage />
    </Suspense>
  );
}
