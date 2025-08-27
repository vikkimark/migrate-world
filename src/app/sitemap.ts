import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://migrate-world.vercel.app";
  const now = new Date();
  const routes = [
    "",            // home
    "/start",      
    "/programs",
    "/visa",
    "/housing",
    "/jobs",
    "/shop",
    "/signup",
    "/checklist",
    "/terms", 
    "/privacy",
    "/voice",
  ];
  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.8,
  }));
}
