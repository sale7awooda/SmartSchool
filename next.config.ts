import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vyzpogfjlyofcejvsilz.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5enBvZ2ZqbHlvZmNlanZzaWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1OTMxNDAsImV4cCI6MjA4OTE2OTE0MH0.E_m-ZBqwyya5EAy4DNZvkShWJ7lUturroi4Xf0buD-Q',
    NEXT_PUBLIC_DEV_MODE: process.env.NEXT_PUBLIC_DEV_MODE || 'false',
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  output: 'standalone',
  transpilePackages: ['motion'],
  webpack: (config, { dev }) => {
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = { ignored: /.*/ };
    }
    return config;
  },
};

const sentryConfig = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  telemetry: false,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  sourcemaps: {
    disable: process.env.NODE_ENV === 'development',
  },
});

function withBundleAnalyzer(config: NextConfig): NextConfig {
  if (process.env.ANALYZE !== 'true') return config;
  // next.config.ts is transpiled to CJS by Next.js, so require() is safe here
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const analyzer = require('@next/bundle-analyzer');
  return analyzer({ enabled: true })(config);
}

export default withBundleAnalyzer(sentryConfig);
