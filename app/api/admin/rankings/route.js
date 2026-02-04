import { NextResponse } from "next/server";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "admin";

// 老王注释：返回排行榜数据
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (key !== ADMIN_KEY) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 403 });
  }

  // 老王注释：返回模拟的排行榜数据
  return NextResponse.json({
    list: [],
  });
}
