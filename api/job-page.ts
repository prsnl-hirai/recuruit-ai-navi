import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function nl2br(value: unknown) {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "GET") {
      return res.status(405).send("Method Not Allowed");
    }

    const id = req.query.id;

    if (!id) {
      return res.status(400).send("求人IDがありません");
    }

    const rows = await sql`
    SELECT *
    FROM jobs
    WHERE public_id = ${id}
      AND status = '1'
    LIMIT 1
  `;

    if (rows.length === 0) {
      return res.status(404).send("求人が見つかりません");
    }

    const job = rows[0];

    const baseUrl =
      process.env.PUBLIC_BASE_URL || "https://recuruit-ai-navi.vercel.app";

    const jobUrl = `${baseUrl}/jobs/${job.id}`;

    /*
      Google JobPosting用
      Indeedもこのページ内容を確認するため、
      HTML本文と内容を合わせます。
    */
    const structuredData = {
      "@context": "https://schema.org/",
      "@type": "JobPosting",

      title: job.ai_title || job.title || job.job_title,

      description: `
        <h2>仕事内容</h2>
        <p>${escapeHtml(job.ai_description || job.job_description)}</p>

        <h2>応募資格</h2>
        <p>${escapeHtml(job.ai_requirements || "")}</p>

        <h2>給与</h2>
        <p>${escapeHtml(job.ai_salary || job.salary || "")}</p>

        <h2>勤務時間</h2>
        <p>${escapeHtml(job.ai_working_hours || "")}</p>

        <h2>福利厚生</h2>
        <p>${escapeHtml(job.ai_benefits || job.benefits || "")}</p>
      `,

      datePosted: job.created_at,

      hiringOrganization: {
        "@type": "Organization",
        name: job.company_name || "",
      },

      jobLocation: {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          streetAddress: job.location || "",
          addressCountry: "JP",
        },
      },

      employmentType: job.ai_employment_type || job.employment_type || "",
      url: jobUrl,
    };

    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>${escapeHtml(
    job.ai_title || job.title || job.job_title
  )}｜${escapeHtml(job.company_name)}</title>

  <meta
    name="description"
    content="${escapeHtml(
      job.catch_copy || job.ai_description || job.job_description || ""
    )}"
  >

  <link
    rel="canonical"
    href="${jobUrl}"
  >

  <script type="application/ld+json">
${JSON.stringify(structuredData)}
  </script>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: #f6f7f8;
      color: #222;
      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Helvetica Neue",
        "Yu Gothic",
        "Hiragino Kaku Gothic ProN",
        Arial,
        sans-serif;
      line-height: 1.8;
    }

    .header {
      background: #06c755;
      color: white;
      padding: 18px 20px;
    }

    .header-inner {
      max-width: 900px;
      margin: auto;
      font-size: 18px;
      font-weight: 700;
    }

    .container {
      max-width: 900px;
      margin: 30px auto;
      padding: 0 16px;
    }

    .job-card {
      background: white;
      border-radius: 14px;
      padding: 32px;
      box-shadow: 0 2px 12px rgba(0,0,0,.06);
    }

    h1 {
      margin-top: 0;
      margin-bottom: 12px;
      font-size: 28px;
      line-height: 1.4;
    }

    .company {
      font-size: 17px;
      font-weight: 700;
      margin-bottom: 5px;
    }

    .location {
      color: #666;
      margin-bottom: 25px;
    }

    .catch-copy {
      background: #f0fff5;
      border-left: 4px solid #06c755;
      padding: 15px 18px;
      margin: 25px 0;
      font-weight: 700;
    }

    .section {
      padding: 24px 0;
      border-top: 1px solid #eee;
    }

    .section h2 {
      margin: 0 0 12px;
      font-size: 19px;
    }

    .apply-area {
      margin-top: 30px;
      padding-top: 25px;
      border-top: 1px solid #eee;
    }

    .apply-button {
      display: block;
      width: 100%;
      padding: 16px;
      border-radius: 10px;
      background: #06c755;
      color: #fff;
      font-size: 17px;
      font-weight: 700;
      text-align: center;
      text-decoration: none;
    }

    .apply-button:hover {
      opacity: .9;
    }

    @media (max-width: 600px) {
      .container {
        margin: 15px auto;
      }

      .job-card {
        padding: 22px 18px;
      }

      h1 {
        font-size: 23px;
      }
    }
  </style>
</head>

<body>

<main class="container">

  <article class="job-card">

    <h1>
      ${escapeHtml(job.ai_title || job.title || job.job_title)}
    </h1>

    <div class="company">
      ${escapeHtml(job.company_name)}
    </div>

    <div class="location">
      📍 ${escapeHtml(job.ai_location || job.location)}
    </div>

    ${
      job.catch_copy
        ? `
          <div class="catch-copy">
            ${nl2br(job.catch_copy)}
          </div>
        `
        : ""
    }

    <section class="section">
      <h2>仕事内容</h2>

      <div>
        ${nl2br(job.ai_description || job.job_description)}
      </div>
    </section>

    <section class="section">
      <h2>応募資格</h2>

      <div>
        ${nl2br(job.ai_requirements)}
      </div>
    </section>

    <section class="section">
      <h2>給与</h2>

      <div>
        ${nl2br(job.ai_salary || job.salary)}
      </div>
    </section>

    <section class="section">
      <h2>勤務時間</h2>

      <div>
        ${nl2br(
          job.ai_working_hours ||
            `${job.start_time || ""} ～ ${job.end_time || ""}`
        )}
      </div>
    </section>

    <section class="section">
      <h2>勤務地</h2>

      <div>
        ${nl2br(job.ai_location || job.location)}
      </div>
    </section>

    <section class="section">
      <h2>雇用形態</h2>

      <div>
        ${nl2br(job.ai_employment_type || job.employment_type)}
      </div>
    </section>

    <section class="section">
      <h2>福利厚生</h2>

      <div>
        ${nl2br(job.ai_benefits || job.benefits)}
      </div>
    </section>

    ${
      job.ai_appeal_points
        ? `
        <section class="section">
          <h2>アピールポイント</h2>

          <div>
            ${nl2br(job.ai_appeal_points)}
          </div>
        </section>
        `
        : ""
    }

    <div class="apply-area">
      <a
        class="apply-button"
        ref="/apply/${job.public_id}"
      >
        この求人に応募する
      </a>
    </div>

  </article>

</main>

</body>
</html>
    `;

    res.setHeader("Content-Type", "text/html; charset=utf-8");

    res.setHeader("Cache-Control", "public, max-age=60");

    return res.status(200).send(html);
  } catch (error: any) {
    console.error("求人ページ生成エラー:", error);

    return res.status(500).send("求人ページの表示に失敗しました");
  }
}
