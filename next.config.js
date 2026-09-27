/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  experimental: {
    missingSuspenseWithCSRBailout: false,
    outputFileTracingIncludes: {
      "/api/visitas/documento": ["./src/app/api/visitas/documento/*.docx"],
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // pdf-parse usa rutas internas que webpack no puede resolver estáticamente
      config.externals = [...(config.externals || []), "pdf-parse"];
    }
    return config;
  },
};

module.exports = nextConfig;
