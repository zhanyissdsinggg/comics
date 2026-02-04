import { NextResponse } from "next/server";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "admin";

// 老王注释：返回统计数据
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (key !== ADMIN_KEY) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 403 });
  }

  // 老王注释：返回模拟的统计数据
  return NextResponse.json({
    stats: [],
    summary: {
      totalViews: 0,
      totalRegistrations: 0,
      avgDau: 0,
      totalPaidOrders: 0,
    },
  });
}
