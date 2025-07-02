const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Option A: Relax COEP for images only
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless', // Less strict than 'require-corp'
          },
          // Option B: Or remove COEP entirely if not needed
          // Comment out the COEP header if you don't need it
          
          // Keep other security headers
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh4.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh5.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh6.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig