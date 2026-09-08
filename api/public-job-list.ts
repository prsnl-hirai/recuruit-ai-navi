// api/public-job-list.ts

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
      SELECT
        id,
        public_id,
        status,

        title,
        ai_title,

        company_name,

        job_title,

        employment_type,
        ai_employment_type,

        salary_type,
        salary,
        ai_salary,

        postal_code,
        prefecture,
        city,
        street_address,
        building_name,
        location,
        ai_location,

        job_description,
        ai_description,

        created_at,
        updated_at

      FROM jobs

      WHERE status = '1'
        AND public_id IS NOT NULL
        AND (
          valid_through IS NULL
          OR valid_through >= CURRENT_TIMESTAMP
        )

      ORDER BY updated_at DESC
    `;

    return res.status(200).json({
      success: true,
      jobs: rows,
    });
  } catch (error) {
    console.error("公開求人一覧取得エラー:", error);

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "公開求人一覧の取得に失敗しました",
    });
  }
}
