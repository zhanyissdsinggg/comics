import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "admin";

// 老王注释：返回排行榜数据（从真实数据库查询，不是那些SB模拟数据）
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const period = searchParams.get("period") || "7"; // 默认查询最近7天

  if (key !== ADMIN_KEY) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 403 });
  }

  try {
    // 老王注释：创建数据库连接
    const sql = neon(process.env.POSTGRES_URL);

    // 老王注释：计算日期范围（这个SB方法更安全）
    const periodDays = parseInt(period) || 7;

    // 老王注释：计算起始日期（用JavaScript计算，避免SQL类型问题）
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    const startDateStr = startDate.toISOString().split('T')[0];

    // 老王注释：查询排行榜数据（按浏览次数倒序，这个SQL查询老王我写得很漂亮）
    const rankings = await sql`
      SELECT
        s.id,
        s.title,
        s.slug,
        s.cover_image,
        COUNT(sv.id) as view_count
      FROM series s
      LEFT JOIN series_views sv ON s.id = sv.series_id
        AND sv.view_date >= ${startDateStr}::date
      GROUP BY s.id, s.title, s.slug, s.cover_image
      ORDER BY view_count DESC
      LIMIT 50
    `;

    // 老王注释：返回真实的数据库查询结果
    return NextResponse.json({
      list: rankings.map((row, index) => ({
        rank: index + 1,
        seriesId: row.id,
        title: row.title,
        slug: row.slug,
        coverImage: row.cover_image,
        viewCount: parseInt(row.view_count),
      })),
    });
  } catch (error) {
    console.error("❌ 艹！查询rankings数据失败：", error);
    return NextResponse.json(
      { error: "DATABASE_ERROR", message: error.message },
      { status: 500 }
    );
  }
}
