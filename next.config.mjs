/*********
Purpose: Next.js configuration for Booma backend using App Router.
Assumptions: Only minimal flags are set for production builds on Vercel.
*********/

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
