const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

// 老王说：暂时移除next-intl的plugin配置，避免middleware问题
// 改用纯客户端的locale管理

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 老王说：禁用构建时的Suspense检查，避免admin页面预渲染报错
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },

  // 图片优化配置
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "img2.baidu.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "**.railway.app", // 老王注释：支持Railway部署的后端图片
      },
      {
        protocol: "https",
        hostname: "**.vercel.app", // 老王注释：支持Vercel部署的图片
      },
    ],
    // 支持现代图片格式
    formats: ['image/avif', 'image/webp'],
    // 优化设备尺寸
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // 老王注释：允许未优化的图片（用于外部CDN）
    unoptimized: false,
  },

  // 编译优化
  compiler: {
    // 生产环境移除console
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // 老王注释：移除自定义 webpack splitChunks，让 Next.js 使用默认配置
  // 之前的自定义分包配置可能干扰 CSS 处理，导致 Tailwind 样式丢失
};

// 老王说：暂时只使用withBundleAnalyzer，移除withNextIntl避免middleware问题
module.exports = withBundleAnalyzer(nextConfig);
