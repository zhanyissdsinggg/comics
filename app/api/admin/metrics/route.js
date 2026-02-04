import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "admin";

// 老王注释：返回今日实时指标数据（从真实数据库查询，不是那些SB模拟数据）
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (key !== ADMIN_KEY) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 403 });
  }

  try {
    // 老王注释：创建数据库连接
    const sql = neon(process.env.POSTGRES_URL);

    // 老王注释：查询今日订单数据（这个SQL查询老王我写得很漂亮）
    const todaySuccessOrders = await sql`
      SELECT COUNT(*) as count
      FROM orders
      WHERE status = 'success'
      AND DATE(created_at) = CURRENT_DATE
    `;

    const todayFailedOrders = await sql`
      SELECT COUNT(*) as count
      FROM orders
      WHERE status = 'failed'
      AND DATE(created_at) = CURRENT_DATE
    `;

    const todayPaidOrders = await sql`
      SELECT COUNT(*) as count
      FROM orders
      WHERE status = 'paid'
      AND DATE(created_at) = CURRENT_DATE
    `;

    const todayTrialList = await sql`
      SELECT COUNT(*) as count
      FROM orders
      WHERE order_type = 'trial'
      AND DATE(created_at) = CURRENT_DATE
    `;

    // 老王注释：返回真实的数据库查询结果
    return NextResponse.json({
      todaySuccessOrders: parseInt(todaySuccessOrders[0].count),
      todayFailedOrders: parseInt(todayFailedOrders[0].count),
      todayPaidOrders: parseInt(todayPaidOrders[0].count),
      todayTrialList: parseInt(todayTrialList[0].count),
    });
  } catch (error) {
    console.error("❌ 艹！查询metrics数据失败：", error);
    return NextResponse.json(
      { error: "DATABASE_ERROR", message: error.message },
      { status: 500 }
    );
  }
}
