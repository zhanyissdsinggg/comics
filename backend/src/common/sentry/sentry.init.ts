import * as Sentry from '@sentry/node';

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    console.warn('⚠️ SENTRY_DSN not configured, Sentry error tracking disabled');
    return;
  }

  // 老王说：初始化Sentry，用于错误追踪和性能监控
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      // 老王说：过滤掉不必要的错误，避免Sentry爆炸
      if (event.exception) {
        const error = event.exception.values?.[0]?.value || '';
        // 忽略404和某些无关紧要的错误
        if (error.includes('404') || error.includes('ECONNREFUSED')) {
          return null;
        }
      }
      return event;
    },
  });

  console.log('✅ Sentry initialized successfully');
}
