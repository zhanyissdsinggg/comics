export default function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/adult`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/library`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/store`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/rankings`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/subscribe`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/notifications`,
      lastModified: new Date(),
    },
  ];
}
