import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Profile photos are capped at 3 MB by the upload action.
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  serverExternalPackages: ["nodemailer"],
};

export default nextConfig;
