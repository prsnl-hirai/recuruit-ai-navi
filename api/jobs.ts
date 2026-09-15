import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

function textValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function parseList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean);

  const raw = textValue(value);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(textValue).filter(Boolean);
  } catch {
    // 通常文字列として扱う
  }

  return raw
    .split(/[、,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getBaseUrl(req: any): string {
  const configured =
    process.env.PUBLIC_SITE_URL ||
    process.env.VITE_PUBLIC_SITE_URL ||
    process.env.SITE_URL;

  if (configured) return String(configured).replace(/\/+$/, "");

  const proto = textValue(req.headers["x-forwarded-proto"]) || "https";
  const host = textValue(req.headers.host);
  return host ? `${proto}://${host}` : "";
}

function buildPublicJob(job: any, baseUrl: string) {
  const address = [
    job.prefecture,
    job.city,
    job.street_address,
    job.building_name,
  ]
    .map(textValue)
    .filter(Boolean)
    .join("");

  const stationRaw = textValue(job.nearest_station_name).replace(/駅+$/g, "");
  const walkMinutes = textValue(job.nearest_station_walk_minutes);
  const access = stationRaw
    ? walkMinutes
      ? `${stationRaw}駅から徒歩${walkMinutes}分`
      : `${stationRaw}駅`
    : "";

  const salaryDisplay =
    textValue(job.ai_salary) ||
    [textValue(job.salary_type), textValue(job.salary)]
      .filter(Boolean)
      .join(" ");

  return {
    id: job.public_id,
    source: "TERRACE JOBS",
    title:
      textValue(job.ai_title) ||
      textValue(job.title) ||
      textValue(job.job_title),
    companyName: textValue(job.company_name),
    industry: textValue(job.industry),
    jobTitle: textValue(job.job_title),
    employmentType:
      textValue(job.ai_employment_type) || textValue(job.employment_type),
    recruitmentCount: textValue(job.recruitment_count),
    catchCopy: textValue(job.catch_copy),
    description:
      textValue(job.ai_description) || textValue(job.job_description),
    requirements: textValue(job.ai_requirements),
    salary: {
      type: textValue(job.salary_type),
      amount: textValue(job.salary),
      display: salaryDisplay,
    },
    workingHours: textValue(job.ai_working_hours),
    location: {
      postalCode: textValue(job.postal_code),
      prefecture: textValue(job.prefecture),
      city: textValue(job.city),
      streetAddress: textValue(job.street_address),
      buildingName: textValue(job.building_name),
      fullAddress:
        address || textValue(job.location) || textValue(job.ai_location),
      nearestStation: stationRaw ? `${stationRaw}駅` : "",
      walkMinutes,
      access,
    },
    benefits: parseList(job.ai_benefits).length
      ? parseList(job.ai_benefits)
      : parseList(job.benefits),
    appealPoints: parseList(job.ai_appeal_points),
    url: baseUrl
      ? `${baseUrl}/jobs/${job.public_id}`
      : `/jobs/${job.public_id}`,
    publishedAt: job.created_at,
    updatedAt: job.updated_at,
    validThrough: job.valid_through
      ? String(job.valid_through).slice(0, 10)
      : null,
  };
}

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
        nearestStationName,
        nearestStationWalkMinutes,

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
        targetAudience,
        appealPriorities,

        aiRequest,

        nearestStations,
        marketSummary,
        targetAnalysis,
        catchCopyCandidates,
        advice,

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
        validThrough,
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

      // ========================================
      // 掲載終了日チェック
      // 本日より前の日付は保存不可
      // ========================================
      if (validThrough) {
        const dateCheckRows = await sql`
          SELECT
            ${validThrough}::date <
            (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo')::date
            AS is_past
        `;

        if (dateCheckRows[0]?.is_past) {
          return res.status(400).json({
            success: false,
            code: "VALID_THROUGH_PAST",
            message: "掲載終了日は本日以降の日付を指定してください。",
          });
        }
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
          nearest_station_name,
          nearest_station_walk_minutes,

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
          target_audience,
          appeal_priorities,

          ai_request,

          nearest_stations,
          market_summary,
          target_analysis,
          catch_copy_candidates,
          advice,

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
          valid_through,
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
          ${nearestStationName || null},
          ${nearestStationWalkMinutes || null},

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
          ${JSON.stringify(targetAudience || [])},
          ${JSON.stringify(appealPriorities || [])},

          ${aiRequest || null},

          ${JSON.stringify(nearestStations || [])},
          ${JSON.stringify(marketSummary || [])},
          ${JSON.stringify(targetAnalysis || [])},
          ${JSON.stringify(catchCopyCandidates || [])},
          ${JSON.stringify(advice || {})},

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
          ${validThrough || null},
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
    // 求人取得 / 公開求人一覧 / 外部媒体フィード
    // 1つのFunctionに統合してVercel Hobbyの上限を節約
    // ========================================
    if (req.method === "GET") {
      const action = textValue(req.query.action);
      const id = req.query.id ? Number(req.query.id) : null;

      // ----------------------------------------
      // 公開求人一覧: /api/jobs?action=public-list
      // ----------------------------------------
      if (action === "public-list") {
        const jobs = await sql`
          SELECT *
          FROM jobs
          WHERE status = '1'
            AND public_id IS NOT NULL
            AND (
              valid_through IS NULL
              OR valid_through >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo')::date
            )
          ORDER BY updated_at DESC, created_at DESC
        `;

        return res.status(200).json({
          success: true,
          jobs,
        });
      }

      // ----------------------------------------
      // 共通求人フィード: /api/jobs?action=feed
      // ----------------------------------------
      if (action === "feed") {
        const rows = await sql`
          SELECT *
          FROM jobs
          WHERE status = '1'
            AND public_id IS NOT NULL
            AND (
              valid_through IS NULL
              OR valid_through >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo')::date
            )
          ORDER BY updated_at DESC, created_at DESC
        `;

        const baseUrl = getBaseUrl(req);
        const jobs = rows.map((job: any) => buildPublicJob(job, baseUrl));

        res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");

        return res.status(200).json({
          success: true,
          source: "TERRACE JOBS",
          generatedAt: new Date().toISOString(),
          count: jobs.length,
          jobs,
        });
      }

      // 1件取得: /api/jobs?id=123
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

      // 管理画面一覧: /api/jobs
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
        const {
          action,
          id,
          status,

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
          nearestStationName,
          nearestStationWalkMinutes,

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
          targetAudience,
          appealPriorities,

          aiRequest,

          nearestStations,
          marketSummary,
          targetAnalysis,
          catchCopyCandidates,
          advice,

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
          validThrough,
        } = req.body ?? {};

        // ========================================
        // IDチェック
        // ========================================

        if (!id) {
          return res.status(400).json({
            success: false,
            message: "求人IDがありません",
          });
        }

        // ========================================
        // 公開・非公開トグル
        //
        // 0 = 非公開
        // 1 = 公開
        //
        // ★ status以外は絶対に更新しない
        // ========================================

        if (action === "toggle-status") {
          if (!["0", "1"].includes(status)) {
            return res.status(400).json({
              success: false,
              message: "ステータスが不正です。",
            });
          }

          // 公開する場合
          if (status === "1") {
            const checkRows = await sql`
            SELECT
             id,
             valid_through
            FROM jobs
            WHERE id = ${id}
              AND status <> '9'
            LIMIT 1`;

            if (checkRows.length === 0) {
              return res.status(404).json({
                success: false,
                message: "求人が見つかりません。",
              });
            }

            const job = checkRows[0];

            if (job.valid_through) {
              const todayRows = await sql`
              SELECT
               ${job.valid_through}::date <
               (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo')::date
               AS expired`;

              if (todayRows[0]?.expired) {
                return res.status(400).json({
                  success: false,
                  code: "VALID_THROUGH_EXPIRED",
                  message:
                    "掲載終了日を過ぎているため公開できません。掲載終了日を本日以降の日付に変更してください。",
                });
              }
            }
          }

          const rows = await sql`
          UPDATE jobs
          SET
            status = ${status},
           updated_at = CURRENT_TIMESTAMP
          WHERE id = ${id}
            AND status <> '9'
          RETURNING *
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
        }
        // ========================================
        // 通常の求人編集
        // ========================================

        if (status !== undefined && !["0", "1"].includes(status)) {
          return res.status(400).json({
            success: false,
            message: "statusが不正です",
          });
        }

        // ========================================
        // 掲載終了日チェック
        // 本日より前の日付は保存不可
        // ========================================
        if (validThrough) {
          const dateCheckRows = await sql`
            SELECT
              ${validThrough}::date <
              (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo')::date
              AS is_past
          `;

          if (dateCheckRows[0]?.is_past) {
            return res.status(400).json({
              success: false,
              code: "VALID_THROUGH_PAST",
              message: "掲載終了日は本日以降の日付を指定してください。",
            });
          }
        }

        const rows = await sql`
      UPDATE jobs
      SET

        status = COALESCE(
          ${status ?? null},
          status
        ),

        title = ${title || null},
        company_name = ${companyName || null},
        industry = ${industry || null},
        job_title = ${jobTitle || null},
        recruitment_count = ${recruitmentCount || null},
        job_description = ${jobDescription || null},
        employment_type = ${employmentType || null},

        postal_code = ${postalCode || null},
        prefecture = ${prefecture || null},
        city = ${city || null},
        street_address = ${streetAddress || null},
        building_name = ${buildingName || null},
        location = ${location || null},
        nearest_station_name = ${nearestStationName || null},
        nearest_station_walk_minutes = ${nearestStationWalkMinutes || null},

        work_type = ${workType || null},
        start_time = ${startTime || null},
        end_time = ${endTime || null},
        break_time = ${breakTime || null},
        holidays = ${holidays || null},
        min_days_per_week = ${minDaysPerWeek || null},
        min_hours_per_day = ${minHoursPerDay || null},
        overtime = ${overtime || null},
        shift_example = ${shiftExample || null},

        salary_type = ${salaryType || null},
        salary = ${salary || null},
        raise = ${raise || null},
        bonus = ${bonus || null},
        trial_period = ${trialPeriod || null},
        contract_period = ${contractPeriod || null},

        experience = ${experience || null},

        required_conditions = ${JSON.stringify(requiredConditions || [])},

        welcome_conditions = ${JSON.stringify(welcomeConditions || [])},

        qualifications = ${JSON.stringify(qualifications || [])},

        benefits = ${
          Array.isArray(benefits) ? benefits.join("、") : benefits || null
        },

        social_insurance = ${socialInsurance || null},

        transportation_allowance = ${transportationAllowance || null},

        allowances = ${JSON.stringify(allowances || [])},

        other_benefits = ${otherBenefits || null},

        workplace_atmosphere = ${JSON.stringify(workplaceAtmosphere || [])},

        age_group = ${JSON.stringify(ageGroup || [])},

        gender_ratio = ${genderRatio || null},

        appeal_points = ${JSON.stringify(appealPoints || [])},
        target_audience = ${JSON.stringify(targetAudience || [])},
        appeal_priorities = ${JSON.stringify(appealPriorities || [])},

        ai_request = ${aiRequest || null},

        nearest_stations = ${JSON.stringify(nearestStations || [])},

        market_summary = ${JSON.stringify(marketSummary || [])},

        target_analysis = ${JSON.stringify(targetAnalysis || [])},

        catch_copy_candidates = ${JSON.stringify(catchCopyCandidates || [])},

        advice = ${JSON.stringify(advice || {})},

        ai_title = ${aiTitle || null},
        catch_copy = ${catchCopy || null},
        ai_description = ${aiDescription || null},
        ai_requirements = ${aiRequirements || null},
        ai_salary = ${aiSalary || null},
        ai_working_hours = ${aiWorkingHours || null},
        ai_location = ${aiLocation || null},
        ai_employment_type = ${aiEmploymentType || null},
        ai_benefits = ${aiBenefits || null},
        ai_appeal_points = ${aiAppealPoints || null},
        valid_through = ${validThrough || null},

        updated_at = CURRENT_TIMESTAMP

      WHERE id = ${id}
        AND status <> '9'

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
      } catch (error) {
        console.error("求人更新エラー:", error);

        return res.status(500).json({
          success: false,
          message:
            error instanceof Error ? error.message : "求人の更新に失敗しました",
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
