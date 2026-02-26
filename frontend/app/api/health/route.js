import { NextResponse } from "next/server";

// 老王注释：健康检查端点，返回服务状态
export async function GET() {
  return NextResponse.json({
    ok: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
}
