import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: {
    position: "bottom-right",
  },
  transpilePackages: ["@smart-crm/db", "@smart-crm/types"],
  serverExternalPackages: ["better-sqlite3"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.zo.xyz",
      },
      {
        protocol: "https",
        hostname: "**.zoworld.io",
      },
      {
        protocol: "https",
        hostname: "cdn.zo.xyz",
      },
      {
        protocol: "https",
        hostname: "api.io.zo.xyz",
      },
      {
        protocol: "https",
        hostname: "*.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.cloudfront.net",
      },
    ],
  },
};

export default nextConfig;
