import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

/**
 * HTMLエスケープ
 */
function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * 改行を <br> に変換
 */
function nl2br(value: unknown): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

/**
 * JSON-LDを安全にHTMLへ埋め込む
 */
function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

/**
 * 雇用形態をGoogle JobPosting用に変換
 */
function getEmploymentType(employmentType: string | null): string | undefined {
  if (!employmentType) {
    return undefined;
  }

  if (employmentType.includes("正社員")) {
    return "FULL_TIME";
  }

  if (
    employmentType.includes("アルバイト") ||
    employmentType.includes("パート")
  ) {
    return "PART_TIME";
  }

  if (employmentType.includes("契約")) {
    return "CONTRACTOR";
  }

  if (employmentType.includes("派遣")) {
    return "TEMPORARY";
  }

  return undefined;
}

/**
 * 給与単位をGoogle JobPosting用に変換
 */
function getSalaryUnit(salaryType: string | null): string | undefined {
  if (!salaryType) {
    return undefined;
  }

  if (salaryType === "時給") {
    return "HOUR";
  }

  if (salaryType === "日給") {
    return "DAY";
  }

  if (salaryType === "月給") {
    return "MONTH";
  }

  if (salaryType === "年俸") {
    return "YEAR";
  }

  return undefined;
}

/**
 * 給与を数値へ変換
 */
function getSalaryValue(salary: unknown): number | undefined {
  if (salary === null || salary === undefined || salary === "") {
    return undefined;
  }

  const value = String(salary).replace(/[^0-9.]/g, "");

  if (!value) {
    return undefined;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return undefined;
  }

  return numberValue;
}

/**
 * 既存の勤務地文字列からGoogle求人用住所を補完
 */
function parseJapaneseAddress(value: unknown) {
  const raw = String(value ?? "")
    .replace(/^〒?\s*\d{3}-?\d{4}\s*/, "")
    .trim();
  const pm = raw.match(/^(東京都|北海道|(?:京都|大阪)府|.{2,3}県)/);
  const addressRegion = pm?.[1] || "";
  const rest = addressRegion ? raw.slice(addressRegion.length).trim() : raw;
  const lm = rest.match(
    /^((?:.+?市.+?区)|(?:.+?市)|(?:.+?区)|(?:.+?郡.+?[町村])|(?:.+?[町村]))/,
  );
  const addressLocality = lm?.[1] || "";
  const streetAddress = addressLocality
    ? rest.slice(addressLocality.length).trim()
    : "";
  return { addressRegion, addressLocality, streetAddress };
}

function getValidThrough(value: unknown): string | undefined {
  if (!value) return undefined;
  const date = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? `${date}T23:59:59+09:00`
    : undefined;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");

    return res.status(405).send("Method Not Allowed");
  }

  try {
    const publicId = String(req.query.id ?? "").trim();

    if (!publicId) {
      return res.status(400).send("求人IDが指定されていません。");
    }

    /**
     * 公開求人を取得
     */
    const rows = await sql`
      SELECT *
      FROM jobs
      WHERE public_id = ${publicId}
        AND status = '1'
        AND (
          valid_through IS NULL
          OR valid_through >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo')::date
        )
      LIMIT 1
    `;

    if (rows.length === 0) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="ja">
          <head>
            <meta charset="UTF-8">
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            >
            <title>求人が見つかりません｜求人AIナビ</title>
          </head>

          <body
            style="
              font-family:
                -apple-system,
                BlinkMacSystemFont,
                'Segoe UI',
                sans-serif;
              padding: 40px 20px;
              text-align: center;
            "
          >
            <h1>求人が見つかりません</h1>

            <p>
              この求人は募集を終了したか、
              非公開になっている可能性があります。
            </p>
          </body>
        </html>
      `);
    }

    const job: any = rows[0];

    const baseUrl = (
      process.env.PUBLIC_BASE_URL || "https://recuruit-ai-navi.vercel.app"
    ).replace(/\/$/, "");

    const publicUrl = `${baseUrl}/jobs/${job.public_id}`;

    const applyUrl = `${baseUrl}/apply/${job.public_id}`;

    /**
     * 表示内容
     */
    const jobTitle = job.ai_title || job.title || job.job_title || "求人情報";

    const description = job.ai_description || job.job_description || "";

    const requirements = job.ai_requirements || "";

    const salary = job.ai_salary || job.salary || "";

    const workingHours =
      job.ai_working_hours ||
      [job.start_time, job.end_time].filter(Boolean).join(" ～ ");

    /**
     * 分割住所から勤務地を作成
     *
     * 分割住所がない古い求人は
     * ai_location / location を使用
     */
    const fullLocation = [
      job.prefecture,
      job.city,
      job.street_address,
      job.building_name,
    ]
      .filter(Boolean)
      .join("");

    const location = fullLocation || job.ai_location || job.location || "";

    const employmentType = job.ai_employment_type || job.employment_type || "";

    const benefits = job.ai_benefits || job.benefits || "";

    const appealPoints = job.ai_appeal_points || "";

    const catchCopy = job.catch_copy || "";

    const companyName = job.company_name || "";

    const datePosted = job.created_at
      ? new Date(job.created_at).toISOString()
      : new Date().toISOString();

    const structuredStreetAddress = [job.street_address, job.building_name]
      .filter(Boolean)
      .join(" ");
    const parsedAddress = parseJapaneseAddress(
      job.ai_location || job.location || "",
    );
    const addressRegion =
      job.prefecture || parsedAddress.addressRegion || undefined;
    const addressLocality =
      job.city || parsedAddress.addressLocality || undefined;
    const streetAddress =
      structuredStreetAddress || parsedAddress.streetAddress || undefined;

    /**
     * Google求人検索用
     * 給与情報
     */
    const salaryValue = getSalaryValue(job.salary);

    const salaryUnit = getSalaryUnit(job.salary_type);

    /**
     * Google 求人検索
     * JobPosting 構造化データ
     */
    const jsonLd: Record<string, unknown> = {
      "@context": "https://schema.org/",

      "@type": "JobPosting",

      title: jobTitle,

      description,

      datePosted,

      employmentType: getEmploymentType(employmentType),

      hiringOrganization: {
        "@type": "Organization",
        name: companyName,
      },

      jobLocation: {
        "@type": "Place",

        address: {
          "@type": "PostalAddress",

          postalCode: job.postal_code || undefined,

          addressRegion,

          addressLocality,

          streetAddress,

          addressCountry: "JP",
        },
      },

      url: publicUrl,

      directApply: true,

      validThrough: getValidThrough(job.valid_through),
    };

    /**
     * 給与が登録されている場合のみ
     * Google JobPostingへ追加
     */
    if (salaryValue !== undefined && salaryUnit) {
      jsonLd.baseSalary = {
        "@type": "MonetaryAmount",

        currency: "JPY",

        value: {
          "@type": "QuantitativeValue",

          value: salaryValue,

          unitText: salaryUnit,
        },
      };
    }

    /**
     * undefinedを含む項目を
     * JSON-LDから除外
     */
    Object.keys(jsonLd).forEach((key) => {
      if (jsonLd[key] === undefined || jsonLd[key] === "") {
        delete jsonLd[key];
      }
    });

    /**
     * HTML
     */
    const html = `
<!DOCTYPE html>

<html lang="ja">

<head>

  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>
    ${escapeHtml(jobTitle)}
    ｜${escapeHtml(companyName)}
  </title>

  <meta
    name="description"
    content="${escapeHtml(description.replace(/\r?\n/g, " ").slice(0, 150))}"
  >

  <link
    rel="canonical"
    href="${escapeHtml(publicUrl)}"
  >

  <script type="application/ld+json">
    ${safeJsonLd(jsonLd)}
  </script>

  <style>

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: #f6f7f9;
      color: #222;
      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        "Noto Sans JP",
        sans-serif;
      line-height: 1.75;
    }

    .header {
      background: #ffffff;
      border-bottom: 1px solid #e5e7eb;
    }

    .header-inner {
      width: min(900px, 100%);
      margin: 0 auto;
      padding: 18px 20px;
      font-size: 18px;
      font-weight: 700;
    }

    .container {
      width: min(900px, 100%);
      margin: 28px auto;
      padding: 0 16px 60px;
    }

    .job-card {
      overflow: hidden;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      box-shadow:
        0 3px 14px
        rgba(0, 0, 0, 0.04);
    }

    .job-main {
      padding: 32px;
    }

    .company {
      margin-bottom: 8px;
      color: #555;
      font-size: 15px;
    }

    h1 {
      margin: 0 0 12px;
      color: #111827;
      font-size: 30px;
      line-height: 1.4;
    }

    .catch-copy {
      margin: 0 0 24px;
      color: #2563eb;
      font-size: 17px;
      font-weight: 700;
    }

    .summary {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 20px 0 4px;
    }

    .tag {
      padding: 6px 11px;
      background: #f3f4f6;
      border-radius: 999px;
      color: #374151;
      font-size: 13px;
      font-weight: 600;
    }

    .apply-area {
      padding: 22px 32px;
      background: #f8fafc;
      border-top: 1px solid #e5e7eb;
      border-bottom: 1px solid #e5e7eb;
    }

    .apply-button {
      display: block;
      width: 100%;
      padding: 15px 20px;
      border-radius: 10px;
      background: #2563eb;
      color: #ffffff;
      font-size: 17px;
      font-weight: 700;
      text-align: center;
      text-decoration: none;
    }

    .apply-button:hover {
      opacity: 0.9;
    }

    .sections {
      padding: 8px 32px 32px;
    }

    .section {
      padding: 25px 0;
      border-bottom: 1px solid #eeeeee;
    }

    .section:last-child {
      border-bottom: none;
    }

    h2 {
      margin: 0 0 12px;
      color: #111827;
      font-size: 19px;
    }

    .section-content {
      color: #374151;
      font-size: 15px;
    }

    .footer {
      padding: 30px 16px;
      color: #777;
      font-size: 13px;
      text-align: center;
    }

    @media (
      max-width: 600px
    ) {

      .container {
        margin-top: 14px;
        padding:
          0 10px
          40px;
      }

      .job-main {
        padding: 22px 18px;
      }

      h1 {
        font-size: 24px;
      }

      .apply-area {
        padding: 18px;
      }

      .sections {
        padding:
          4px 18px
          24px;
      }

    }

  </style>

</head>

<body>

  <header class="header">
    <div class="header-inner">
      求人AIナビ
    </div>
  </header>

  <main class="container">

    <article class="job-card">

      <div class="job-main">

        ${
          companyName
            ? `
              <div class="company">
                ${escapeHtml(companyName)}
              </div>
            `
            : ""
        }

        <h1>
          ${escapeHtml(jobTitle)}
        </h1>

        ${
          catchCopy
            ? `
              <p class="catch-copy">
                ${escapeHtml(catchCopy)}
              </p>
            `
            : ""
        }

        <div class="summary">

          ${
            employmentType
              ? `
                <span class="tag">
                  ${escapeHtml(employmentType)}
                </span>
              `
              : ""
          }

          ${
            salary
              ? `
                <span class="tag">
                  ${escapeHtml(salary)}
                </span>
              `
              : ""
          }

          ${
            location
              ? `
                <span class="tag">
                  📍 ${escapeHtml(location)}
                </span>
              `
              : ""
          }

        </div>

      </div>

      <div class="apply-area">

        <a
          class="apply-button"
          href="${escapeHtml(applyUrl)}"
        >
          この求人に応募する
        </a>

      </div>

      <div class="sections">

        ${
          description
            ? `
              <section class="section">
                <h2>仕事内容</h2>

                <div class="section-content">
                  ${nl2br(description)}
                </div>
              </section>
            `
            : ""
        }

        ${
          requirements
            ? `
              <section class="section">
                <h2>
                  応募資格・求める人物像
                </h2>

                <div class="section-content">
                  ${nl2br(requirements)}
                </div>
              </section>
            `
            : ""
        }

        ${
          salary
            ? `
              <section class="section">
                <h2>給与</h2>

                <div class="section-content">
                  ${nl2br(salary)}
                </div>
              </section>
            `
            : ""
        }

        ${
          workingHours
            ? `
              <section class="section">
                <h2>勤務時間</h2>

                <div class="section-content">
                  ${nl2br(workingHours)}
                </div>
              </section>
            `
            : ""
        }

        ${
          location
            ? `
              <section class="section">
                <h2>勤務地</h2>

                <div class="section-content">
                  ${
                    job.postal_code
                      ? `〒${escapeHtml(job.postal_code)}<br>`
                      : ""
                  }
                  ${nl2br(location)}
                </div>
              </section>
            `
            : ""
        }

        ${
          employmentType
            ? `
              <section class="section">
                <h2>雇用形態</h2>

                <div class="section-content">
                  ${nl2br(employmentType)}
                </div>
              </section>
            `
            : ""
        }

        ${
          benefits
            ? `
              <section class="section">
                <h2>
                  待遇・福利厚生
                </h2>

                <div class="section-content">
                  ${nl2br(benefits)}
                </div>
              </section>
            `
            : ""
        }

        ${
          appealPoints
            ? `
              <section class="section">
                <h2>
                  この求人の魅力
                </h2>

                <div class="section-content">
                  ${nl2br(appealPoints)}
                </div>
              </section>
            `
            : ""
        }

      </div>

    </article>

  </main>

  <footer class="footer">
    求人AIナビ
    <br>
    AIで、求人作成をもっと簡単に。
    <br>
    <br>
    <a href="/company">運営会社</a>
    <span>｜</span>
    <a href="/privacy">プライバシーポリシー</a>
  </footer>

</body>

</html>
`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");

    res.setHeader("Cache-Control", "public, max-age=60");

    return res.status(200).send(html);
  } catch (error) {
    console.error("Job page error:", error);

    return res.status(500).send(`
      <!DOCTYPE html>
      <html lang="ja">
        <head>
          <meta charset="UTF-8">
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          >
          <title>エラー｜求人AIナビ</title>
        </head>

        <body
          style="
            font-family:
              -apple-system,
              BlinkMacSystemFont,
              'Segoe UI',
              sans-serif;
            padding: 40px 20px;
            text-align: center;
          "
        >
          <h1>
            求人情報を表示できませんでした
          </h1>

          <p>
            時間をおいて、
            もう一度お試しください。
          </p>
        </body>
      </html>
    `);
  }
}
