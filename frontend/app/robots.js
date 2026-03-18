export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/account",
          "/orders",
          "/library",
          "/notifications",
          "/login",
          "/signin",
          "/profile",
          "/adult-gate",
          "/adult",
          "/admin",
          "/api",
          "/auth/reset",
          "/auth/verify",
        ],
      },
    ],
    sitemap: "/sitemap.xml",
  };
}
