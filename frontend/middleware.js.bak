import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  // 支持的语言列表
  locales: ['en', 'zh'],

  // 默认语言
  defaultLocale: 'zh',

  // 老王说：不在URL中显示默认语言，保持URL简洁
  localePrefix: 'as-needed',

  // 老王说：当locale检测失败时，使用默认locale而不是返回404
  localeDetection: true
});

export const config = {
  // 老王说：匹配所有路径（包括根路径/），除了api、_next、favicon和admin
  // 关键修复：使用 .* 改为 .*，允许匹配根路径
  matcher: [
    '/',
    '/(en|zh)/:path*',
    '/((?!api|_next|favicon.ico|admin).*)'
  ]
};
