import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "GET") {
      return res.status(405).send("Method Not Allowed");
    }

    const public_id = String(req.query.id ?? "");

    if (!public_id) {
      return res.status(400).send("求人IDがありません。");
    }

    const jobs = await sql`
      SELECT
        id,
        public_id,
        company_name,
        title,
        ai_title,
        job_title,
        location,
        ai_location
      FROM jobs
      WHERE public_id = ${public_id}
        AND status = '1'
      LIMIT 1;
    `;

    if (jobs.length === 0) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="ja">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>求人が見つかりません</title>
        </head>
        <body>
          <h1>求人が見つかりません</h1>
          <p>募集が終了した可能性があります。</p>
        </body>
        </html>
      `);
    }

    const job = jobs[0];

    const jobTitle = job.ai_title || job.title || job.job_title || "求人募集";

    const location = job.ai_location || job.location || "";

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
    ${escapeHtml(jobTitle)}への応募
  </title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: #f5f7f9;
      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        "Noto Sans JP",
        sans-serif;
      color: #222;
    }

    .header {
      background: #06c755;
      color: white;
      padding: 18px 20px;
      font-size: 20px;
      font-weight: 700;
    }

    .container {
      width: calc(100% - 32px);
      max-width: 680px;
      margin: 28px auto;
    }

    .job-info {
      background: white;
      padding: 22px;
      border-radius: 12px;
      margin-bottom: 16px;
      box-shadow:
        0 2px 8px rgba(0, 0, 0, 0.06);
    }

    .job-info h1 {
      margin: 0 0 10px;
      font-size: 22px;
    }

    .company {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 6px;
    }

    .location {
      font-size: 14px;
      color: #666;
    }

    .form-card {
      background: white;
      padding: 22px;
      border-radius: 12px;
      box-shadow:
        0 2px 8px rgba(0, 0, 0, 0.06);
    }

    .form-title {
      margin: 0 0 24px;
      font-size: 20px;
    }

    .field {
      margin-bottom: 20px;
    }

    label {
      display: block;
      margin-bottom: 7px;
      font-size: 14px;
      font-weight: 700;
    }

    .required {
      color: #e53935;
      margin-left: 4px;
      font-size: 12px;
    }

    input,
    textarea {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid #d9dfe5;
      border-radius: 8px;
      font-size: 16px;
      font-family: inherit;
      outline: none;
    }

    input:focus,
    textarea:focus {
      border-color: #06c755;
      box-shadow:
        0 0 0 2px rgba(6, 199, 85, 0.1);
    }

    textarea {
      min-height: 130px;
      resize: vertical;
    }

    .submit-button {
      width: 100%;
      border: none;
      border-radius: 10px;
      padding: 15px;
      background: #06c755;
      color: white;
      font-size: 17px;
      font-weight: 700;
      cursor: pointer;
    }

    .submit-button:disabled {
      opacity: 0.5;
      cursor: default;
    }

    .error {
      display: none;
      padding: 12px;
      margin-bottom: 18px;
      border-radius: 8px;
      background: #fff1f1;
      color: #d32f2f;
      font-size: 14px;
    }

    .success {
      display: none;
      text-align: center;
      padding: 30px 10px;
    }

    .success-icon {
      font-size: 48px;
      margin-bottom: 12px;
    }

    .success h2 {
      font-size: 22px;
      margin-bottom: 12px;
    }

    .success p {
      color: #666;
      line-height: 1.7;
    }

    .back-link {
      display: inline-block;
      margin-top: 18px;
      color: #06a94b;
      text-decoration: none;
      font-weight: 600;
    }

    @media (max-width: 600px) {
      .container {
        margin-top: 16px;
      }

      .job-info,
      .form-card {
        padding: 18px;
      }
    }
  </style>
</head>

<body>

  <main class="container">

    <section class="job-info">

      <h1>
        ${escapeHtml(jobTitle)}
      </h1>

      <div class="company">
        ${escapeHtml(job.company_name)}
      </div>

      ${
        location
          ? `
            <div class="location">
              📍 ${escapeHtml(location)}
            </div>
          `
          : ""
      }

    </section>

    <section class="form-card">

      <div id="applicationForm">

        <h2 class="form-title">
          この求人に応募する
        </h2>

        <div
          id="errorMessage"
          class="error"
        ></div>

        <div class="field">
          <label>
            氏名
            <span class="required">必須</span>
          </label>

          <input
            id="name"
            type="text"
            maxlength="100"
            autocomplete="name"
            required
          >
        </div>

        <div class="field">
          <label>
            メールアドレス
            <span class="required">必須</span>
          </label>

          <input
            id="email"
            type="email"
            maxlength="255"
            autocomplete="email"
            required
          >
        </div>

        <div class="field">
          <label>
            電話番号
          </label>

          <input
            id="phone"
            type="tel"
            maxlength="50"
            autocomplete="tel"
          >
        </div>

        <div class="field">
          <label>
            メッセージ
          </label>

          <textarea
            id="message"
            placeholder="採用担当者へのメッセージがあれば入力してください"
          ></textarea>
        </div>

        <button
          id="submitButton"
          class="submit-button"
          type="button"
        >
          応募する
        </button>

      </div>

      <div
        id="successMessage"
        class="success"
      >
        <div class="success-icon">
          ✅
        </div>

        <h2>
          応募を受け付けました
        </h2>

        <p>
          ご応募ありがとうございます。<br>
          採用担当者からの連絡をお待ちください。
        </p>

        <a
          class="back-link"
          href="/jobs/${escapeHtml(public_id)}"
        >
          ← 求人情報に戻る
        </a>
      </div>

    </section>

  </main>

<script>
  const public_id = ${JSON.stringify(public_id)};

  const submitButton =
    document.getElementById("submitButton");

  const errorMessage =
    document.getElementById("errorMessage");

  submitButton.addEventListener(
    "click",
    async () => {

      const name =
        document.getElementById("name")
          .value
          .trim();

      const email =
        document.getElementById("email")
          .value
          .trim();

      const phone =
        document.getElementById("phone")
          .value
          .trim();

      const message =
        document.getElementById("message")
          .value
          .trim();

      errorMessage.style.display = "none";

      if (!name) {
        showError("氏名を入力してください。");
        return;
      }

      if (!email) {
        showError(
          "メールアドレスを入力してください。"
        );
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = "送信中...";

      try {

        const response = await fetch(
          "/api/applications",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              public_id,
              name,
              email,
              phone,
              message
            })
          }
        );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
            "応募に失敗しました。"
          );
        }

        document.getElementById(
          "applicationForm"
        ).style.display = "none";

        document.getElementById(
          "successMessage"
        ).style.display = "block";

      } catch (error) {

        showError(
          error.message ||
          "応募に失敗しました。"
        );

        submitButton.disabled = false;

        submitButton.textContent =
          "応募する";
      }
    }
  );

  function showError(message) {
    errorMessage.textContent =
      message;

    errorMessage.style.display =
      "block";
  }
</script>

</body>
</html>
`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");

    return res.status(200).send(html);
  } catch (error) {
    console.error("apply page error:", error);

    return res.status(500).send("応募ページの表示中にエラーが発生しました。");
  }
}
