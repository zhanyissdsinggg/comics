const path = require("node:path");
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

function normalizeHeaderValue(value, fallback = "unknown") {
  const normalized = String(value || "")
    .replace(/[\r\n]+/g, " ")
    .trim();

  return normalized || fallback;
}

function getFrontendIdentityHeaders() {
  const repoOwner = normalizeHeaderValue(
    process.env.VERCEL_GIT_REPO_OWNER || process.env.GITHUB_REPOSITORY_OWNER,
    "",
  );
  const repoSlug = normalizeHeaderValue(
    process.env.VERCEL_GIT_REPO_SLUG ||
      (process.env.GITHUB_REPOSITORY
        ? process.env.GITHUB_REPOSITORY.split("/")[1]
        : ""),
    "",
  );
  const repo =
    repoOwner && repoSlug
      ? `${repoOwner}/${repoSlug}`
      : normalizeHeaderValue(process.env.GITHUB_REPOSITORY, "unknown");

  return [
    {
      key: "X-Gush-Frontend-Revision",
      value: normalizeHeaderValue(
        process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA,
      ),
    },
    {
      key: "X-Gush-Frontend-Repo",
      value: normalizeHeaderValue(repo),
    },
    {
      key: "X-Gush-Frontend-Branch",
      value: normalizeHeaderValue(
        process.env.VERCEL_GIT_COMMIT_REF || process.env.GITHUB_REF_NAME,
      ),
    },
    {
      key: "X-Gush-Frontend-Deployment",
      value: normalizeHeaderValue(
        process.env.VERCEL_URL ||
          process.env.VERCEL_PROJECT_PRODUCTION_URL ||
          process.env.NEXT_PUBLIC_SITE_URL,
      ),
    },
  ];
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.resolve(__dirname, ".."),
  poweredByHeader: false,
  distDir: process.env.NEXT_DIST_DIR || ".next",

  eslint: {
    ignoreDuringBuilds: false,
  },

  async headers() {
    const sharedSecurityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
      },
      ...getFrontendIdentityHeaders(),
    ];

    if (process.env.NODE_ENV === "production") {
      sharedSecurityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains; preload",
      });
    }

    return [
      {
        source: "/:path*",
        headers: sharedSecurityHeaders,
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "**.railway.app",
      },
      {
        protocol: "https",
        hostname: "**.vercel.app",
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    unoptimized: false,
  },

  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },
};

module.exports = withBundleAnalyzer(nextConfig);
