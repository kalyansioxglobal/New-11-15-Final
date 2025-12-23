/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 5000,
        aggregateTimeout: 2000,
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**', '**/tmp/**', '**/*.log'],
      };
    }
    return config;
  },
  allowedDevOrigins: [
    "*.riker.replit.dev",
    "*.picard.replit.dev", 
    "*.kirk.replit.dev",
    "*.janeway.replit.dev",
    "*.sisko.replit.dev",
    "*.worf.replit.dev",
    "*.spock.replit.dev",
    "*.replit.dev",
    "*.replit.app",
    "*.repl.co",
    "replit.com",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://*.replit.dev https://*.replit.app https://*.repl.co https://replit.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
