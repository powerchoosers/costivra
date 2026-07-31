import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Costivra",
    short_name: "Costivra",
    description: "Every recurring business cost, under command.",
    start_url: "/app",
    display: "standalone",
    background_color: "#f7f8fc",
    theme_color: "#080b14",
    icons: [{ src: "/brand/costivra-favicon.png", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}
