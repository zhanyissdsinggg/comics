// 老王优化：完整的Sitemap配置，包含所有重要页面和SEO属性
export default function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://comics-eta.vercel.app";
  const currentDate = new Date().toISOString();

  return [
    {
      url: `${baseUrl}/`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/adult`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/library`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/store`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/rankings`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/subscribe`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/notifications`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.6,
    },
    // 老王添加：重要的静态页面
    {
      url: `${baseUrl}/support`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: currentDate,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms-of-service`,
      lastModified: currentDate,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/events`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    // 老王注释：如果需要动态添加漫画/小说页面，可以在这里添加
    // 例如：从API获取所有series的ID，然后生成对应的URL
    // const seriesPages = await fetchAllSeries().then(series =>
    //   series.map(s => ({
    //     url: `${baseUrl}/series/${s.id}`,
    //     lastModified: s.updatedAt,
    //     changeFrequency: "weekly",
    //     priority: 0.8,
    //   }))
    // );
  ];
}
