import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      success: false,
      message: "Method Not Allowed",
    });
  }

  try {
    const { publicId, name, email, phone, message } = req.body ?? {};

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: "求人IDがありません。",
      });
    }

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "氏名を入力してください。",
      });
    }

    if (!email?.trim()) {
      return res.status(400).json({
        success: false,
        message: "メールアドレスを入力してください。",
      });
    }

    // 公開中の求人だけ応募可能
    const jobs = await sql`
      SELECT
        id,
        public_id,
        user_id,
        company_name,
        ai_title,
        title
      FROM jobs
      WHERE public_id = ${publicId}
        AND status = '1'
      LIMIT 1;
    `;

    if (jobs.length === 0) {
      return res.status(404).json({
        success: false,
        message: "求人が見つからないか、募集が終了しています。",
      });
    }

    const job = jobs[0];

    const applications = await sql`
      INSERT INTO applications (
        job_id,
        name,
        email,
        phone,
        message,
        status
      )
      VALUES (
        ${job.id},
        ${name.trim()},
        ${email.trim()},
        ${phone?.trim() || null},
        ${message?.trim() || null},
        '0'
      )
      RETURNING
        id,
        job_id,
        name,
        email,
        phone,
        message,
        status,
        created_at;
    `;

    const jobTitle = job.ai_title || job.title || job.job_title || "求人";

    const notificationMessage = [
      "📩 新しい応募がありました",
      "",
      `求人：${jobTitle}`,
      `応募者：${name.trim()}`,
      `メール：${email.trim()}`,
      phone?.trim() ? `電話番号：${phone.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    if (job.user_id) {
      await sendLineNotification(job.user_id, notificationMessage);
    }

    return res.status(201).json({
      success: true,
      message: "応募を受け付けました。",
      application: applications[0],
    });
  } catch (error) {
    console.error("application save error:", error);

    return res.status(500).json({
      success: false,
      message: "応募の受付中にエラーが発生しました。",
    });
  }
}

async function sendLineNotification(userId: string, message: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token) {
    console.error("LINE_CHANNEL_ACCESS_TOKEN is not set");
    return;
  }

  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: userId,
      messages: [
        {
          type: "text",
          text: message,
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("LINE push error:", response.status, text);
  }
}
