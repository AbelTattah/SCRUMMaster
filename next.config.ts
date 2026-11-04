import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The desktop shell (desktop/) bundles the standalone server so it can run
  // the app locally; Vercel builds keep the default output.
  output: process.env.DESKTOP_BUILD === "1" ? "standalone" : undefined,
  experimental: {
    // Profile photos are capped at 3 MB by the upload action.
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  serverExternalPackages: ["nodemailer"],
};

export default nextConfig;
