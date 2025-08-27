export default function robots() {
  return {
    rules: [
      { userAgent: "*", disallow: ["/admin"] },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL || "https://migrate-world.vercel.app"}/sitemap.xml`,
  };
}
