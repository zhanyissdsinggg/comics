// 老王注释：数据库初始化脚本，这个SB脚本用于创建表和插入测试数据
import { Pool } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 老王注释：加载.env.local文件中的环境变量（这个SB步骤很重要）
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

async function initDatabase() {
  // 老王注释：创建数据库连接池
  const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

  try {
    // 老王注释：从环境变量获取数据库连接URL
    const databaseUrl = process.env.POSTGRES_URL;

    if (!databaseUrl) {
      throw new Error(
        "艹！POSTGRES_URL环境变量没设置！检查你的.env.local文件！"
      );
    }

    console.log("🚀 开始初始化数据库...");

    // 老王注释：读取SQL文件
    const sqlFilePath = path.join(__dirname, "init-db.sql");
    const sqlContent = fs.readFileSync(sqlFilePath, "utf-8");

    // 老王注释：执行SQL语句
    console.log("📝 执行SQL脚本...");
    await pool.query(sqlContent);

    console.log("✅ 数据库初始化成功！");
    console.log("📊 表已创建：users, orders, series, series_views, daily_stats");
    console.log("🎉 测试数据已插入！");
  } catch (error) {
    console.error("❌ 艹！数据库初始化失败：", error.message);
    process.exit(1);
  } finally {
    // 老王注释：关闭数据库连接池（别忘了这个SB步骤）
    await pool.end();
  }
}

initDatabase();
