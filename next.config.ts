import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["tsdav", "ical.js", "rss-parser"],
};

export default nextConfig;
