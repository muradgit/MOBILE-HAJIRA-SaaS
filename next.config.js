/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow AI Studio cloud domain for Hot Module Replacement (HMR)
  allowedDevOrigins: [
    'ais-dev-ssggrbjivql236okgbocv3-792872969230.asia-southeast1.run.app'
  ],
  // Ensure we can use process.env in the client if needed
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  },
};

export default nextConfig;
