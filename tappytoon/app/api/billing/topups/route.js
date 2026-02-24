import { NextResponse } from "next/server";
import { listTopupPackages } from "../../../../lib/serverStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const packages = listTopupPackages().map((pkg) => ({
    packageId: pkg.packageId,
    paidPts: pkg.paidPts,
    bonusPts: pkg.bonusPts,
    price: pkg.price,
    currency: "USD",
  }));

  return NextResponse.json({ packages });
}
