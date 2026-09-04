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
          ai_appeal_points
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
          ${aiAppealPoints || null}
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
      const jobs = await sql`
        SELECT *
        FROM jobs
        WHERE status <> '9'
        ORDER BY created_at DESC;
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
        const {
          id,
          userId,
          status = "0",

          title,
          companyName,
          industry,
          jobTitle,
          recruitmentCount,
          jobDescription,
          employmentType,
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
        } = req.body ?? {};

        if (!id) {
          return res.status(400).json({
            success: false,
            message: "求人IDが指定されていません。",
          });
        }

        if (!["0", "1", "9"].includes(status)) {
          return res.status(400).json({
            success: false,
            message: "statusが不正です。",
          });
        }

        const rows = await sql`
        UPDATE jobs
        SET
          user_id = ${userId},
  
          status = ${status},
  
          title = ${title},
          company_name = ${companyName},
          industry = ${industry},
          job_title = ${jobTitle},
          recruitment_count = ${recruitmentCount},
          job_description = ${jobDescription},
          employment_type = ${employmentType},
  
          location = ${location},
  
          work_type = ${workType},
          start_time = ${startTime},
          end_time = ${endTime},
          break_time = ${breakTime},
          holidays = ${holidays},
          min_days_per_week = ${minDaysPerWeek},
          min_hours_per_day = ${minHoursPerDay},
          overtime = ${overtime},
          shift_example = ${shiftExample},
  
          salary_type = ${salaryType},
          salary = ${salary},
          raise = ${raise},
          bonus = ${bonus},
          trial_period = ${trialPeriod},
          contract_period = ${contractPeriod},
  
          experience = ${experience},
  
          required_conditions =
            ${JSON.stringify(requiredConditions ?? [])}::jsonb,
  
          welcome_conditions =
            ${JSON.stringify(welcomeConditions ?? [])}::jsonb,
  
          qualifications =
            ${JSON.stringify(qualifications ?? [])}::jsonb,
  
          benefits =
            ${Array.isArray(benefits) ? benefits.join("、") : benefits ?? ""},
  
          social_insurance = ${socialInsurance},
          transportation_allowance = ${transportationAllowance},
  
          allowances =
            ${JSON.stringify(allowances ?? [])}::jsonb,
  
          other_benefits = ${otherBenefits},
  
          workplace_atmosphere =
            ${JSON.stringify(workplaceAtmosphere ?? [])}::jsonb,
  
          age_group =
            ${JSON.stringify(ageGroup ?? [])}::jsonb,
  
          gender_ratio = ${genderRatio},
  
          appeal_points =
            ${JSON.stringify(appealPoints ?? [])}::jsonb,
  
          ai_request = ${aiRequest},
  
          nearest_stations =
            ${JSON.stringify(nearestStations ?? [])}::jsonb,
  
          score =
            ${JSON.stringify(score ?? {})}::jsonb,
  
          market_summary =
            ${JSON.stringify(marketSummary ?? [])}::jsonb,
  
          improvement_points =
            ${JSON.stringify(improvementPoints ?? [])}::jsonb,
  
          ai_title = ${aiTitle},
          catch_copy = ${catchCopy},
          ai_description = ${aiDescription},
          ai_requirements = ${aiRequirements},
          ai_salary = ${aiSalary},
          ai_working_hours = ${aiWorkingHours},
          ai_location = ${aiLocation},
          ai_employment_type = ${aiEmploymentType},
          ai_benefits = ${aiBenefits},
          ai_appeal_points = ${aiAppealPoints},
  
          updated_at = NOW()
  
        WHERE id = ${id}
  
        RETURNING *;
      `;

        if (rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: "求人が見つかりません。",
          });
        }

        return res.status(200).json({
          success: true,
          job: rows[0],
        });
      } catch (error: any) {
        console.error("求人更新エラー:", error);

        return res.status(500).json({
          success: false,
          message: error?.message || "求人の更新に失敗しました。",
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
