/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  },
  webpack: (config) => {
    // face-api.js references Node's fs/encoding in browser builds; stub them out
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, encoding: false };
    return config;
  },
};

export default nextConfig;
