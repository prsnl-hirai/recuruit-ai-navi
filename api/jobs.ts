import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export default async function handler(req: any, res: any) {
  try {
    // ========================================
    // 求人保存
    // ========================================
    if (req.method === "POST") {
      const {
        userId,
        status = "0",

        title,
        companyName,
        industry,
        jobTitle,
        recruitmentCount,
        jobDescription,
        employmentType,

        postalCode,
        prefecture,
        city,
        streetAddress,
        buildingName,
        location,

        workType,
        startTime,
        endTime,
        breakTime,
        holidays,
        minDaysPerWeek,
        minHoursPerDay,
        overtime,
        shiftExample,

        salaryType,
        salary,
        raise,
        bonus,
        trialPeriod,
        contractPeriod,

        experience,
        requiredConditions,
        welcomeConditions,
        qualifications,

        benefits,
        socialInsurance,
        transportationAllowance,
        allowances,
        otherBenefits,

        workplaceAtmosphere,
        ageGroup,
        genderRatio,

        appealPoints,

        aiRequest,

        nearestStations,
        score,
        marketSummary,
        improvementPoints,

        aiTitle,
        catchCopy,
        aiDescription,
        aiRequirements,
        aiSalary,
        aiWorkingHours,
        aiLocation,
        aiEmploymentType,
        aiBenefits,
        aiAppealPoints,
      } = req.body;

      // ========================================
      // statusチェック
      // 0:下書き
      // 1:公開
      // 9:非公開・削除
      // ========================================
      if (!["0", "1", "9"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "statusが不正です",
        });
      }
      const public_id = generatepublic_id();

      const result = await sql`
        INSERT INTO jobs (
          user_id,
          status,

          title,
          company_name,
          industry,
          job_title,
          recruitment_count,
          job_description,
          employment_type, 
          
          postal_code,
          prefecture,
          city,
          street_address,
          building_name,
          location,

          work_type,
          start_time,
          end_time,
          break_time,
          holidays,
          min_days_per_week,
          min_hours_per_day,
          overtime,
          shift_example,

          salary_type,
          salary,
          raise,
          bonus,
          trial_period,
          contract_period,

          experience,
          required_conditions,
          welcome_conditions,
          qualifications,

          benefits,
          social_insurance,
          transportation_allowance,
          allowances,
          other_benefits,

          workplace_atmosphere,
          age_group,
          gender_ratio,

          appeal_points,

          ai_request,

          nearest_stations,
          score,
          market_summary,
          improvement_points,

          ai_title,
          catch_copy,
          ai_description,
          ai_requirements,
          ai_salary,
          ai_working_hours,
          ai_location,
          ai_employment_type,
          ai_benefits,
          ai_appeal_points,
          public_id
        )
        VALUES (
          ${userId || null},
          ${status},

          ${title || null},
          ${companyName || null},
          ${industry || null},
          ${jobTitle || null},
          ${recruitmentCount || null},
          ${jobDescription || null},
          ${employmentType || null},

          ${postalCode || null},
          ${prefecture || null},
          ${city || null},
          ${streetAddress || null},
          ${buildingName || null},
          ${location || null},

          ${workType || null},
          ${startTime || null},
          ${endTime || null},
          ${breakTime || null},
          ${holidays || null},
          ${minDaysPerWeek || null},
          ${minHoursPerDay || null},
          ${overtime || null},
          ${shiftExample || null},

          ${salaryType || null},
          ${salary || null},
          ${raise || null},
          ${bonus || null},
          ${trialPeriod || null},
          ${contractPeriod || null},

          ${experience || null},
          ${JSON.stringify(requiredConditions || [])},
          ${JSON.stringify(welcomeConditions || [])},
          ${JSON.stringify(qualifications || [])},

          ${Array.isArray(benefits) ? benefits.join("、") : benefits || null},
          ${socialInsurance || null},
          ${transportationAllowance || null},
          ${JSON.stringify(allowances || [])},
          ${otherBenefits || null},

          ${JSON.stringify(workplaceAtmosphere || [])},
          ${JSON.stringify(ageGroup || [])},
          ${genderRatio || null},

          ${JSON.stringify(appealPoints || [])},

          ${aiRequest || null},

          ${JSON.stringify(nearestStations || [])},
          ${JSON.stringify(score || {})},
          ${JSON.stringify(marketSummary || [])},
          ${JSON.stringify(improvementPoints || [])},

          ${aiTitle || null},
          ${catchCopy || null},
          ${aiDescription || null},
          ${aiRequirements || null},
          ${aiSalary || null},
          ${aiWorkingHours || null},
          ${aiLocation || null},
          ${aiEmploymentType || null},
          ${aiBenefits || null},
          ${aiAppealPoints || null},
          ${public_id || null}
        )
        RETURNING *;
      `;

      return res.status(201).json({
        success: true,
        job: result[0],
      });
    }

    // ========================================
    // 求人一覧取得
    // ========================================
    if (req.method === "GET") {
      const id = req.query.id ? Number(req.query.id) : null;

      // 1件取得
      if (id) {
        const rows = await sql`
      SELECT *
      FROM jobs
      WHERE id = ${id}
        AND status <> '9'
      LIMIT 1
    `;

        if (rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: "求人が見つかりません",
          });
        }

        return res.status(200).json({
          success: true,
          job: rows[0],
        });
      }

      // 一覧取得
      const jobs = await sql`
    SELECT *
    FROM jobs
    WHERE status <> '9'
    ORDER BY created_at DESC
  `;

      return res.status(200).json({
        success: true,
        jobs,
      });
    }

    /* ========================================
    PATCH 求人更新
    ======================================== */

    if (req.method === "PATCH") {
      try {
        const { id, status, ...rest } = req.body ?? {};

        if (!id) {
          return res.status(400).json({
            success: false,
            message: "求人IDがありません",
          });
        }

        // 公開・非公開トグルからの更新
        // id と status だけ送られてきた場合
        if (status !== undefined && Object.keys(rest).length === 0) {
          if (status !== "0" && status !== "1") {
            return res.status(400).json({
              success: false,
              message: "公開状態が不正です",
            });
          }

          const rows = await sql`
        UPDATE jobs
        SET
          status = ${status},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;

          if (rows.length === 0) {
            return res.status(404).json({
              success: false,
              message: "求人が見つかりません",
            });
          }

          return res.status(200).json({
            success: true,
            job: rows[0],
          });
        }

        // ↓ この下に通常の求人編集PATCH
        // ...
      } catch (error) {
        console.error("求人更新エラー:", error);

        return res.status(500).json({
          success: false,
          message: "求人の更新に失敗しました",
        });
      }
    }

    // ========================================
    // 未対応メソッド
    // ========================================
    return res.status(405).json({
      success: false,
      message: "Method Not Allowed",
    });
  } catch (error) {
    console.error("求人DB APIエラー:", error);

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "求人データの処理に失敗しました",
    });
  }
}

// ========================================
// ユニークID生成
// ========================================
function generatepublic_id(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let result = "";

  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}
