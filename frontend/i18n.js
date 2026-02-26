import {getRequestConfig} from 'next-intl/server';

export default getRequestConfig(async ({locale}) => {
  // 老王说：如果locale是undefined，就用默认的中文
  const finalLocale = locale || 'zh';

  return {
    locale: finalLocale,  // 老王说：必须返回locale字段，不然next-intl会报错
    messages: (await import(`./messages/${finalLocale}.json`)).default
  };
});
