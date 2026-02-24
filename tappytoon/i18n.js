import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

// 老王注释：支持的语言列表
export const locales = ['en', 'zh'];
export const defaultLocale = 'en';

// 老王注释：获取用户的语言偏好
export function getUserLocale() {
  const cookieStore = cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value;

  // 老王注释：如果用户设置了语言偏好，使用用户设置
  if (locale && locales.includes(locale)) {
    return locale;
  }

  // 老王注释：否则使用默认语言（英语）
  return defaultLocale;
}

export default getRequestConfig(async () => {
  const locale = getUserLocale();

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
