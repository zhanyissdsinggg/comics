"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "../../components/layout/SiteHeader";
import PackageCard from "../../components/store/PackageCard";
import PromoBanner from "../../components/store/PromoBanner";
import { useWalletStore } from "../../store/useWalletStore";
import { track } from "../../lib/analytics";

const packages = [
  { id: "starter", name: "Starter", paidPts: 50, bonusPts: 5, tag: "Best for trial" },
  { id: "medium", name: "Medium", paidPts: 100, bonusPts: 15, tag: "Popular" },
  { id: "value", name: "Value", paidPts: 200, bonusPts: 40, tag: "Best value" },
  { id: "mega", name: "Mega", paidPts: 500, bonusPts: 120, tag: "Mega pack" },
];

export default function StorePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { topup } = useWalletStore();
  const returnTo = searchParams.get("returnTo") || "/";
  const focus = searchParams.get("focus") || "";
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    track("store_view", { focus });
  }, [focus]);

  const orderedPackages = useMemo(() => {
    if (!focus) {
      return packages;
    }
    const selected = packages.find((pkg) => pkg.id === focus);
    if (!selected) {
      return packages;
    }
    return [selected, ...packages.filter((pkg) => pkg.id !== focus)];
  }, [focus]);

  const handleBuy = async (packageId) => {
    setBusyId(packageId);
    track("package_click", { packageId });
    const response = await topup(packageId);
    setBusyId(null);
    if (response.ok) {
      router.replace(returnTo);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-12 pt-8 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold">Store</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Buy points to unlock episodes.
          </p>
        </div>

        <PromoBanner />

        <div className="grid gap-4 md:grid-cols-2">
          {orderedPackages.map((pkg) => (
            <div key={pkg.id} className={busyId === pkg.id ? "opacity-70" : ""}>
              <PackageCard
                pkg={pkg}
                highlighted={pkg.id === focus}
                onSelect={handleBuy}
              />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
