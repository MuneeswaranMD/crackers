/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    'recharts',
    'd3-array',
    'd3-scale',
    'd3-shape',
    'd3-interpolate',
    'd3-color',
    'd3-format',
    'd3-time',
    'd3-time-format',
    'd3-path',
  ],
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
