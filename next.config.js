/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    instrumentationHook: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.nba.com',
        pathname: '/logos/nba/**',
      },
      {
        protocol: 'https',
        hostname: 'a.espncdn.com',
        pathname: '/i/headshots/**',
      },
      /** College / combiner headshots: full URL path is /combiner/i?img=/i/headshots/... */
      {
        protocol: 'https',
        hostname: 'a.espncdn.com',
        pathname: '/combiner/**',
      },
    ],
  },
}

module.exports = nextConfig
