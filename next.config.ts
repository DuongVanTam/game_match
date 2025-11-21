import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Optimize static pages
  // This enables static optimization for pages that can be pre-rendered
  output: undefined, // Use default (standalone for production)

  // Enable compression for better performance
  compress: true,

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 604800, // 7 days cache for images
  },

  // Headers for static assets
  async headers() {
    return [
      {
        // Cache static assets (CSS, JS, fonts, images)
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
        // Only apply to static files
        has: [
          {
            type: 'header',
            key: 'content-type',
            value: '(text/css|application/javascript|image/.*|font/.*)',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
