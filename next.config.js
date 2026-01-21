/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public', // where service worker and assets will be generated
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // only enable PWA in production
})

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
          },
        ],
      },
    ]
  },
}

module.exports = withPWA(nextConfig)
