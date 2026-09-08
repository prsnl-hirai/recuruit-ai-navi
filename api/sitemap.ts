import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

const BASE_URL =
  process.env.PUBLIC_BASE_URL || "https://recuruit-ai-navi.vercel.app";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    // 公開中の求人だけ取得
    const jobs = await sql`
      SELECT
        public_id,
        updated_at
      FROM jobs
      WHERE status = '1'
        AND public_id IS NOT NULL
        AND (
          valid_through IS NULL
          OR valid_through >=
           (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo')::date
        )
      ORDER BY updated_at DESC
    `;

    const staticPages = [
      {
        url: `${BASE_URL}/jobs`,
        changefreq: "daily",
        priority: "1.0",
      },
      {
        url: `${BASE_URL}/company`,
        changefreq: "monthly",
        priority: "0.5",
      },
      {
        url: `${BASE_URL}/privacy`,
        changefreq: "monthly",
        priority: "0.5",
      },
    ];

    const staticXml = staticPages
      .map(
        (page) => `
  <url>
    <loc>${escapeXml(page.url)}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
      )
      .join("");

    const jobsXml = jobs
      .map((job: any) => {
        const jobUrl = `${BASE_URL}/jobs/${job.public_id}`;

        const lastmod = job.updated_at
          ? new Date(job.updated_at).toISOString()
          : null;

        return `
  <url>
    <loc>${escapeXml(jobUrl)}</loc>${
      lastmod
        ? `
    <lastmod>${lastmod}</lastmod>`
        : ""
    }
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
      })
      .join("");

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticXml}
${jobsXml}
</urlset>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");

    // Vercel/CDNで短時間キャッシュ
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=600",
    );

    return res.status(200).send(sitemap);
  } catch (error) {
    console.error("sitemap生成エラー:", error);

    return res.status(500).send("Failed to generate sitemap");
  }
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
