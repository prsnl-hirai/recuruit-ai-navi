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
  } catch (error) {
    console.error("掲載終了求人の自動非公開エラー:", error);

    return res.status(500).json({
      success: false,
      message: "掲載終了求人の自動非公開に失敗しました",
    });
  }
}
