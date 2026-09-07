import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

function cdata(value: unknown): string {
  return String(value ?? "").replace(/]]>/g, "]]]]><![CDATA[>");
}

function buildIndeedApplyData(
  job: any,
  baseUrl: string,
  apiToken: string
): string {
  const title = String(job.ai_title || job.title || "").slice(0, 50);
  const company = String(job.company_name || "").slice(0, 50);
  const location = String(job.location || "").slice(0, 50);

  const params = new URLSearchParams();

  params.set("indeed-apply-apiToken", apiToken);
  params.set("indeed-apply-jobTitle", title);
  params.set("indeed-apply-jobId", String(job.public_id));
  params.set("indeed-apply-jobCompanyName", company);
  params.set("indeed-apply-jobLocation", location);

  params.set("indeed-apply-jobUrl", `${baseUrl}/jobs/${job.public_id}`);

  params.set("indeed-apply-jobMeta", String(job.public_id));

  params.set("indeed-apply-postUrl", `${baseUrl}/api/indeed-applications`);

  params.set("indeed-apply-phone", "optional");

  return params.toString();
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const baseUrl =
      process.env.PUBLIC_BASE_URL || "https://recuruit-ai-navi.vercel.app";

    const indeedApplyApiToken = process.env.INDEED_APPLY_API_TOKEN || "";

    const jobs = await sql`
      SELECT
        id,
        public_id,
        status,
        title,
        ai_title,
        company_name,
        location,
        job_description,
        ai_description,
        salary,
        ai_salary,
        employment_type,
        industry,
        job_title,
        created_at,
        updated_at
      FROM jobs
      WHERE status = '1'
        AND public_id IS NOT NULL
      ORDER BY updated_at DESC
    `;

    const jobsXml = jobs
      .map((job: any) => {
        const title = job.ai_title || job.title || job.job_title || "";

        const description = job.ai_description || job.job_description || "";

        const salary = job.ai_salary || job.salary || "";

        const jobType = job.employment_type || "";

        const jobUrl = `${baseUrl}/jobs/${job.public_id}`;

        const indeedApplyData = indeedApplyApiToken
          ? buildIndeedApplyData(job, baseUrl, indeedApplyApiToken)
          : "";

        return `
  <job>
    <title><![CDATA[${cdata(title)}]]></title>

    <date><![CDATA[${cdata(job.created_at)}]]></date>

    <referencenumber><![CDATA[${cdata(job.public_id)}]]></referencenumber>

    <url><![CDATA[${cdata(jobUrl)}]]></url>

    <company><![CDATA[${cdata(job.company_name)}]]></company>

    <city><![CDATA[${cdata(job.location)}]]></city>

    <country><![CDATA[JP]]></country>

    <description><![CDATA[${cdata(description)}]]></description>

    ${salary ? `<salary><![CDATA[${cdata(salary)}]]></salary>` : ""}

    ${jobType ? `<jobtype><![CDATA[${cdata(jobType)}]]></jobtype>` : ""}

    ${
      indeedApplyData
        ? `<indeed-apply-data><![CDATA[${cdata(
            indeedApplyData
          )}]]></indeed-apply-data>`
        : ""
    }
  </job>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<source>
  <publisher><![CDATA[求人AIナビ]]></publisher>
  <publisherurl><![CDATA[${cdata(baseUrl)}]]></publisherurl>

${jobsXml}

</source>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");

    res.setHeader("Cache-Control", "public, max-age=300");

    return res.status(200).send(xml);
  } catch (error) {
    console.error("Indeed feed error:", error);

    return res.status(500).send("Failed to generate Indeed feed");
  }
}
