/**
 * Railway Keep-Alive 脚本
 * 老王说：每 5 分钟 ping 一次后端，防止 Railway 休眠
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://comics-production-07fa.up.railway.app';
const PING_INTERVAL = 5 * 60 * 1000; // 5 分钟

async function pingBackend() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`, {
      method: 'GET',
      headers: { 'User-Agent': 'KeepAlive/1.0' },
    });

    if (response.ok) {
      console.log(`[KeepAlive] Backend pinged successfully at ${new Date().toISOString()}`);
    } else {
      console.warn(`[KeepAlive] Backend ping failed with status ${response.status}`);
    }
  } catch (error) {
    console.error(`[KeepAlive] Backend ping error:`, error.message);
  }
}

// 立即执行一次
pingBackend();

// 定期执行
setInterval(pingBackend, PING_INTERVAL);

console.log(`[KeepAlive] Started pinging ${BACKEND_URL} every ${PING_INTERVAL / 1000}s`);
