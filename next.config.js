/*********
Purpose: Next.js configuration for Booma backend. Uses default App Router.
Assumptions: No custom webpack or experimental flags are required.
*********/

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // App Router is default in Next 14
  }
};

export default nextConfig;
