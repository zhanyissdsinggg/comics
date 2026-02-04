import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "admin";

// 老王注释：返回统计数据（从真实数据库查询，不是那些SB模拟数据）
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (key !== ADMIN_KEY) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 403 });
  }

  try {
    // 老王注释：创建数据库连接
    const sql = neon(process.env.POSTGRES_URL);

    // 老王注释：查询最近30天的统计数据（按日期倒序）
    const stats = await sql`
      SELECT
        stat_date,
        total_views,
        new_registrations,
        dau,
        paid_orders,
        revenue
      FROM daily_stats
      ORDER BY stat_date DESC
      LIMIT 30
    `;

    // 老王注释：计算汇总数据（这个SQL查询老王我写得很漂亮）
    const summary = await sql`
      SELECT
        COALESCE(SUM(total_views), 0) as total_views,
        COALESCE(SUM(new_registrations), 0) as total_registrations,
        COALESCE(AVG(dau), 0) as avg_dau,
        COALESCE(SUM(paid_orders), 0) as total_paid_orders
      FROM daily_stats
      WHERE stat_date >= CURRENT_DATE - INTERVAL '30 days'
    `;

    // 老王注释：返回真实的数据库查询结果
    return NextResponse.json({
      stats: stats.map((row) => ({
        date: row.stat_date,
        views: parseInt(row.total_views),
        registrations: parseInt(row.new_registrations),
        dau: parseInt(row.dau),
        paidOrders: parseInt(row.paid_orders),
        revenue: parseFloat(row.revenue),
      })),
      summary: {
        totalViews: parseInt(summary[0].total_views),
        totalRegistrations: parseInt(summary[0].total_registrations),
        avgDau: Math.round(parseFloat(summary[0].avg_dau)),
        totalPaidOrders: parseInt(summary[0].total_paid_orders),
      },
    });
  } catch (error) {
    console.error("❌ 艹！查询stats数据失败：", error);
    return NextResponse.json(
      { error: "DATABASE_ERROR", message: error.message },
      { status: 500 }
    );
  }
}
