/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  async headers() {
    return [
      {
        // Applies to every response. The app has no legitimate reason to be
        // framed by another site, and it performs real state-changing
        // actions (deactivate staff, approve Telekom, archive a building)
        // behind simple button clicks — exactly what clickjacking (an
        // invisible iframe overlaid on a page a logged-in manager is
        // tricked into clicking) targets.
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
