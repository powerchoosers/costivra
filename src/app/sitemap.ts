import type { MetadataRoute } from "next";

const routes = [
  "", "/product", "/solutions", "/solutions/software", "/solutions/telecom", "/solutions/energy",
  "/how-it-works", "/pricing", "/security", "/integrations", "/industries",
  "/industries/hospitality", "/industries/car-washes", "/industries/assisted-living", "/industries/restaurants",
  "/industries/fitness", "/industries/manufacturing", "/industries/education", "/industries/nonprofits",
  "/industries/property-management", "/industries/retail", "/case-studies", "/scan", "/about", "/partners",
  "/contact", "/help", "/status", "/privacy", "/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({ url: `https://costivra.ai${route}`, lastModified: new Date(), changeFrequency: route === "" ? "weekly" : "monthly", priority: route === "" ? 1 : 0.7 }));
}
