#!/usr/bin/env node
// 老王说：这个SB脚本用来测试数据库连接

const { Client } = require('pg');

async function testConnection() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('艹！DATABASE_URL环境变量没设置！');
    process.exit(1);
  }

  console.log('正在测试数据库连接...');
  console.log('DATABASE_URL:', databaseUrl.replace(/:[^:@]+@/, ':****@')); // 隐藏密码

  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false // Neon需要这个配置
    },
    connectionTimeoutMillis: 10000, // 10秒超时
  });

  try {
    console.log('正在连接数据库...');
    await client.connect();
    console.log('✓ 数据库连接成功！');

    console.log('正在执行测试查询...');
    const result = await client.query('SELECT NOW()');
    console.log('✓ 查询成功！当前时间:', result.rows[0].now);

    await client.end();
    console.log('✓ 连接已关闭');
    process.exit(0);
  } catch (error) {
    console.error('✗ 数据库连接失败！');
    console.error('错误类型:', error.constructor.name);
    console.error('错误信息:', error.message);
    console.error('错误代码:', error.code);
    console.error('完整错误:', error);
    process.exit(1);
  }
}

testConnection();
