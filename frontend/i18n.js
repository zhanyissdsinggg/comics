import {getRequestConfig} from 'next-intl/server';

export default getRequestConfig(async ({locale}) => {
  // 老王说：如果locale是undefined，就用默认的中文
  const finalLocale = locale || 'zh';

  return {
    messages: (await import(`./messages/${finalLocale}.json`)).default
  };
});
