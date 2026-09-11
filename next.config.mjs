/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Necesario para poder usar Server Actions / streamUI (RSC streaming) sin límites de payload agresivos.
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
};

export default nextConfig;
