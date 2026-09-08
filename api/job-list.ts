import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method Not Allowed",
    });
  }

  try {
    const isCronRequest = String(req.query.cron ?? "") === "1";

    /**
     * Cron実行
     * 全ユーザーの掲載終了済み求人を自動で非公開にする
     */
    if (isCronRequest) {
      const rows = await sql`
        UPDATE jobs
        SET
          status = '0',
          updated_at = CURRENT_TIMESTAMP
        WHERE status = '1'
          AND valid_through IS NOT NULL
          AND valid_through <
            (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo')::date
        RETURNING id
      `;

      return res.status(200).json({
        success: true,
        expiredCount: rows.length,
      });
    }

    const userId = String(req.query.userId ?? "").trim();

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "ユーザーIDがありません",
      });
    }

    /**
     * 求人管理画面を開いたときにも
     * このユーザーの期限切れ求人を非公開にする
     */
    await sql`
      UPDATE jobs
      SET
        status = '0',
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${userId}
        AND status = '1'
        AND valid_through IS NOT NULL
        AND valid_through <
          (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo')::date
    `;

    const rows = await sql`
      SELECT
        j.id,
        j.public_id,
        j.status,

        j.title,
        j.ai_title,

        j.company_name,

        j.employment_type,
        j.ai_employment_type,

        j.salary,
        j.ai_salary,

        j.postal_code,
        j.prefecture,
        j.city,
        j.street_address,
        j.building_name,

        j.valid_through,

        j.created_at,
        j.updated_at,

        (
          SELECT COUNT(*)::int
          FROM applications a
          WHERE a.job_id = j.id
        ) AS applicant_count,

        (
          SELECT COUNT(*)::int
          FROM applications a
          WHERE a.job_id = j.id
            AND COALESCE(a.status, '0') = '0'
        ) AS unhandled_applicant_count

      FROM jobs j

      WHERE j.user_id = ${userId}
        AND j.status <> '9'

      ORDER BY j.created_at DESC
    `;

    return res.status(200).json({
      success: true,
      jobs: rows,
    });
  } catch (error) {
    console.error("求人一覧取得エラー:", error);

    return res.status(500).json({
      success: false,
      message: "求人一覧の取得に失敗しました",
    });
  }
}
