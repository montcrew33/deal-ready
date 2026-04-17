/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server-side PDF processing needs this
  serverExternalPackages: ['pdf-parse'],
};

module.exports = nextConfig;
