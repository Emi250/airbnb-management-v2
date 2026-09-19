import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El route handler del comprobante lee el logo con fs desde public/, que
  // Vercel sube como asset de CDN y no copia dentro de la función. El tracer
  // tampoco puede ver un path.join(process.cwd(), ...), así que se declara.
  outputFileTracingIncludes: {
    "/**": ["./public/logo-refugio.jpeg"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default nextConfig;
