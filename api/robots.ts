export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).send("Method Not Allowed");
  }

  const baseUrl =
    process.env.PUBLIC_BASE_URL || "https://recuruit-ai-navi.vercel.app";

  const robots = `User-agent: *
Allow: /jobs
Allow: /jobs/
Allow: /company
Allow: /privacy

Disallow: /api/
Disallow: /?page=create
Disallow: /?page=jobs
Disallow: /?page=edit

Sitemap: ${baseUrl}/sitemap.xml
`;

  res.setHeader("Content-Type", "text/plain; charset=utf-8");

  res.setHeader(
    "Cache-Control",
    "public, s-maxage=3600, stale-while-revalidate=86400",
  );

  return res.status(200).send(robots);
}
