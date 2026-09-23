/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  // Externalizar chromium para que Vercel lo sirva como archivo nativo
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        "@sparticuz/chromium",
        "puppeteer-core",
      ];
    }
    return config;
  },
};

module.exports = nextConfig;
