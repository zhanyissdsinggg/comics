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
  // 匹配所有路径，除了api、_next/static、_next/image、favicon.ico和admin
  // 老王说：admin路由不需要国际化，直接排除掉避免构建时预渲染
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|admin).*)']
};
