import { NextResponse } from "next/server";

// 老王注释：返回后端版本信息的API端点
export async function GET() {
  return NextResponse.json({
    name: "Backend",
    version: "latest",
    timestamp: new Date().toISOString(),
  });
}
