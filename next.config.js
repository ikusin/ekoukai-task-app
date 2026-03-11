/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server Actions (stable in Next.js 14, experimental flag required in 13.x)
  experimental: {
    serverActions: true,
  },
  // Production optimizations
  poweredByHeader: false,
  compress: true,

  // Image optimization
  images: {
    // Add your custom domain here when deploying
    // e.g. domains: ['app.example.com']
    formats: ["image/webp"],
  },

  // Suppress optional ws native addon warnings from Supabase Realtime
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      bufferutil: false,
      "utf-8-validate": false,
    };
    return config;
  },
};

module.exports = nextConfig;
