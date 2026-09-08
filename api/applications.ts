import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export default async function handler(req: any, res: any) {
  try {
    // ========================================
    // 応募者一覧取得
    // ========================================
    if (req.method === "GET") {
      const userId = String(req.query.userId ?? "").trim();
      const jobId = String(req.query.jobId ?? "").trim();

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "ユーザーIDがありません。",
        });
      }

      const applications = jobId
        ? await sql`
            SELECT
              a.id,
              a.job_id,
              a.name,
              a.email,
              a.phone,
              a.message,
              a.memo,
              a.interview_date,
              a.interview_time,
              a.interview_method,
              a.interview_location,
              a.interview_memo,
              a.status,
              a.source,
              a.created_at,
              j.public_id,
              j.title,
              j.ai_title,
              j.company_name
            FROM applications a
            INNER JOIN jobs j
              ON j.id = a.job_id
            WHERE j.user_id = ${userId}
              AND j.id = ${jobId}
              AND j.status <> '9'
            ORDER BY a.created_at DESC
          `
        : await sql`
            SELECT
              a.id,
              a.job_id,
              a.name,
              a.email,
              a.phone,
              a.message,
              a.memo,
              a.interview_date,
              a.interview_time,
              a.interview_method,
              a.interview_location,
              a.interview_memo,
              a.status,
              a.source,
              a.created_at,
              j.public_id,
              j.title,
              j.ai_title,
              j.company_name
            FROM applications a
            INNER JOIN jobs j
              ON j.id = a.job_id
            WHERE j.user_id = ${userId}
              AND j.status <> '9'
            ORDER BY a.created_at DESC
          `;

      return res.status(200).json({
        success: true,
        applications,
      });
    }

    // ========================================
    // 応募情報更新
    // ========================================
    if (req.method === "PATCH") {
      const { id, userId, status, memo, action } = req.body ?? {};

      const applicationId = Number(id);
      const ownerUserId = String(userId ?? "").trim();

      if (!Number.isFinite(applicationId) || applicationId <= 0) {
        return res.status(400).json({
          success: false,
          message: "応募IDが正しくありません。",
        });
      }

      if (!ownerUserId) {
        return res.status(400).json({
          success: false,
          message: "ユーザーIDがありません。",
        });
      }

      // ----------------------------------------
      // 応募者へメール送信
      // ----------------------------------------
      if (action === "send-email") {
        const subject = String(req.body?.subject ?? "").trim();
        const body = String(req.body?.body ?? "").trim();

        if (!subject) {
          return res.status(400).json({
            success: false,
            message: "メール件名を入力してください。",
          });
        }

        if (!body) {
          return res.status(400).json({
            success: false,
            message: "メール本文を入力してください。",
          });
        }

        if (subject.length > 200 || body.length > 10000) {
          return res.status(400).json({
            success: false,
            message: "メールの文字数が上限を超えています。",
          });
        }

        const rows = await sql`
          SELECT
            a.id,
            a.email
          FROM applications a
          INNER JOIN jobs j
            ON j.id = a.job_id
          WHERE a.id = ${applicationId}
            AND j.user_id = ${ownerUserId}
            AND j.status <> '9'
          LIMIT 1
        `;

        if (rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: "応募情報が見つかりませんでした。",
          });
        }

        const email = String(rows[0].email ?? "").trim();

        if (!email) {
          return res.status(400).json({
            success: false,
            message: "応募者のメールアドレスがありません。",
          });
        }

        const apiKey = process.env.RESEND_API_KEY;
        const mailFrom = process.env.MAIL_FROM;
        const replyTo = process.env.MAIL_REPLY_TO;

        if (!apiKey) {
          throw new Error("RESEND_API_KEY が設定されていません。");
        }

        if (!mailFrom) {
          throw new Error("MAIL_FROM が設定されていません。");
        }

        const payload: Record<string, any> = {
          from: mailFrom,
          to: [email],
          subject,
          text: body,
        };

        if (replyTo) {
          payload.reply_to = replyTo;
        }

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          console.error("Resend error:", response.status, result);

          return res.status(502).json({
            success: false,
            message:
              result?.message || "メール送信サービスでエラーが発生しました。",
          });
        }

        return res.status(200).json({
          success: true,
          message: "メールを送信しました。",
          emailId: result?.id ?? null,
        });
      }

      // ----------------------------------------
      // 面接情報保存
      // ----------------------------------------
      if (action === "save-interview") {
        const interviewDate =
          String(req.body?.interviewDate ?? "").trim() || null;
        const interviewTime =
          String(req.body?.interviewTime ?? "").trim() || null;
        const interviewMethod =
          String(req.body?.interviewMethod ?? "").trim() || null;
        const interviewLocation =
          String(req.body?.interviewLocation ?? "").trim() || null;
        const interviewMemo = String(req.body?.interviewMemo ?? "");

        const allowedMethods = ["対面", "オンライン", "電話"];

        if (
          interviewMethod !== null &&
          !allowedMethods.includes(interviewMethod)
        ) {
          return res.status(400).json({
            success: false,
            message: "面接方法が正しくありません。",
          });
        }

        if (interviewMemo.length > 5000) {
          return res.status(400).json({
            success: false,
            message: "面接メモは5000文字以内で入力してください。",
          });
        }

        const applications = await sql`
          UPDATE applications AS a
          SET
            interview_date = ${interviewDate},
            interview_time = ${interviewTime},
            interview_method = ${interviewMethod},
            interview_location = ${interviewLocation},
            interview_memo = ${interviewMemo}
          FROM jobs AS j
          WHERE a.id = ${applicationId}
            AND a.job_id = j.id
            AND j.user_id = ${ownerUserId}
            AND j.status <> '9'
          RETURNING
            a.id,
            a.job_id,
            a.name,
            a.email,
            a.phone,
            a.message,
            a.memo,
            a.interview_date,
            a.interview_time,
            a.interview_method,
            a.interview_location,
            a.interview_memo,
            a.status,
            a.source,
            a.created_at
        `;

        if (applications.length === 0) {
          return res.status(404).json({
            success: false,
            message: "応募情報が見つかりませんでした。",
          });
        }

        return res.status(200).json({
          success: true,
          message: "面接情報を保存しました。",
          application: applications[0],
        });
      }

      // ----------------------------------------
      // 採用メモ保存
      // ----------------------------------------
      if (action === "save-memo") {
        const newMemo = String(memo ?? "");

        if (newMemo.length > 5000) {
          return res.status(400).json({
            success: false,
            message: "採用メモは5000文字以内で入力してください。",
          });
        }

        const applications = await sql`
          UPDATE applications AS a
          SET memo = ${newMemo}
          FROM jobs AS j
          WHERE a.id = ${applicationId}
            AND a.job_id = j.id
            AND j.user_id = ${ownerUserId}
            AND j.status <> '9'
          RETURNING
            a.id,
            a.job_id,
            a.name,
            a.email,
            a.phone,
            a.message,
            a.memo,
            a.status,
            a.source,
            a.created_at
        `;

        if (applications.length === 0) {
          return res.status(404).json({
            success: false,
            message: "応募情報が見つかりませんでした。",
          });
        }

        return res.status(200).json({
          success: true,
          message: "採用メモを保存しました。",
          application: applications[0],
        });
      }

      // ----------------------------------------
      // 選考状況変更
      // 既存の動作をそのまま維持
      // ----------------------------------------
      const newStatus = String(status ?? "").trim();
      const allowedStatuses = ["0", "1", "2", "3", "4"];

      if (!allowedStatuses.includes(newStatus)) {
        return res.status(400).json({
          success: false,
          message: "応募ステータスが正しくありません。",
        });
      }

      const applications = await sql`
        UPDATE applications AS a
        SET status = ${newStatus}
        FROM jobs AS j
        WHERE a.id = ${applicationId}
          AND a.job_id = j.id
          AND j.user_id = ${ownerUserId}
          AND j.status <> '9'
        RETURNING
          a.id,
          a.job_id,
          a.name,
          a.email,
          a.phone,
          a.message,
          a.status,
          a.source,
          a.created_at
      `;

      if (applications.length === 0) {
        return res.status(404).json({
          success: false,
          message: "応募情報が見つかりませんでした。",
        });
      }

      return res.status(200).json({
        success: true,
        message: "応募ステータスを更新しました。",
        application: applications[0],
      });
    }

    // ========================================
    // 応募保存
    // ========================================
    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST, PATCH");

      return res.status(405).json({
        success: false,
        message: "Method Not Allowed",
      });
    }

    const { public_id, name, email, phone, message } = req.body ?? {};

    if (!public_id) {
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
      WHERE public_id = ${public_id}
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
      status,
      source
    )
    VALUES (
      ${job.id},
      ${name},
      ${email},
      ${phone || null},
      ${message || null},
      '0',
      'web'
    )
    RETURNING *
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
    console.error("applications API error:", error);

    return res.status(500).json({
      success: false,
      message: "応募情報の処理中にエラーが発生しました。",
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
