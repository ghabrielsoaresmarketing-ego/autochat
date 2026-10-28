/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pacotes do banco rodam só no servidor (não entram no bundle)
  serverExternalPackages: ["postgres", "@electric-sql/pglite"],
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
