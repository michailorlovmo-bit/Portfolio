import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Electric City",
    short_name: "Electric City",
    description: "Electric City fiber build task management with AI-assisted review",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2445e8",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
