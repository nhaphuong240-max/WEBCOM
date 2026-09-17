import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@ptt/ui'],
  basePath: process.env.NEXT_BASE_PATH || '',
};

export default nextConfig;
