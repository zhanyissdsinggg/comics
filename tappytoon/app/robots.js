export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/series"],
        disallow: ["/adult", "/adult-gate"],
      },
    ],
    sitemap: "/sitemap.xml",
  };
}
