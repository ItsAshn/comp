import type { MetadataRoute } from "next";

/**
 * Installability: this is a daily-use logging tool, and its natural home on a
 * phone is the home screen, not a browser tab. Colours track the light-theme
 * surface from globals.css; at runtime the viewport themeColor in layout.tsx
 * takes over and follows the active theme.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Comp",
    short_name: "Comp",
    description: "A two-person weight-loss competition",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
