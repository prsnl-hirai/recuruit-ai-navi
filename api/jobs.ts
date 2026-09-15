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
    // 求人一覧取得
    // ========================================
    if (req.method === "GET") {
      const action = String(req.query.action ?? "").trim();

      // ========================================
      // 媒体別掲載設定取得
      // ========================================
      if (action === "publication-channels") {
        const jobId = Number(req.query.jobId);

        if (!jobId) {
          return res.status(400).json({
            success: false,
            message: "求人IDがありません。",
          });
        }

        const rows = await sql`
          SELECT
            job_id,
            channel,
            enabled,
            status,
            external_job_id,
            published_at,
            last_synced_at,
            error_message
          FROM job_publication_channels
          WHERE job_id = ${jobId}
          ORDER BY channel
        `;

        return res.status(200).json({
          success: true,
          channels: rows,
        });
      }

      // ========================================
      // スタンバイ連携準備用フィード
      // 正式仕様受領後にフォーマットを合わせる
      // ========================================
      if (action === "stanby-feed") {
        const rows = await sql`
          SELECT j.*
          FROM jobs j
          INNER JOIN job_publication_channels c
            ON c.job_id = j.id
           AND c.channel = 'stanby'
           AND c.enabled = true
          WHERE j.status = '1'
            AND j.public_id IS NOT NULL
            AND (
              j.valid_through IS NULL
              OR j.valid_through >=
                (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo')::date
            )
          ORDER BY j.updated_at DESC
        `;

        const baseUrl = (
          process.env.PUBLIC_SITE_URL ||
          process.env.VITE_PUBLIC_SITE_URL ||
          process.env.SITE_URL ||
          ""
        ).replace(/\/+$/, "");

        const feed = rows.map((job: any) => {
          const fullAddress = [
            job.prefecture,
            job.city,
            job.street_address,
            job.building_name,
          ]
            .filter(Boolean)
            .join("");

          const station = job.nearest_station_name
            ? String(job.nearest_station_name).replace(/駅+$/g, "")
            : "";

          const access = station
            ? `${station}駅${
                job.nearest_station_walk_minutes
                  ? `から徒歩${job.nearest_station_walk_minutes}分`
                  : ""
              }`
            : "";

          return {
            id: job.public_id,
            source: "TERRACE JOBS",
            title: job.ai_title || job.title || job.job_title || "",
            companyName: job.company_name || "",
            employmentType: job.ai_employment_type || job.employment_type || "",
            salary: job.ai_salary || job.salary || "",
            location: fullAddress || job.location || job.ai_location || "",
            access,
            description: job.ai_description || job.job_description || "",
            requirements: job.ai_requirements || "",
            benefits: job.ai_benefits || job.benefits || "",
            catchCopy: job.catch_copy || "",
            url: baseUrl
              ? `${baseUrl}/jobs/${job.public_id}`
              : `/jobs/${job.public_id}`,
            validThrough: job.valid_through
              ? String(job.valid_through).slice(0, 10)
              : null,
            updatedAt: job.updated_at,
          };
        });

        res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");

        return res.status(200).json({
          success: true,
          source: "TERRACE JOBS",
          channel: "stanby",
          status: "preparing",
          generatedAt: new Date().toISOString(),
          count: feed.length,
          jobs: feed,
        });
      }

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
        // 掲載先設定保存
        // ========================================
        if (action === "publication-channels") {
          const { jobId, channels } = req.body ?? {};

          if (!jobId || !Array.isArray(channels)) {
            return res.status(400).json({
              success: false,
              message: "掲載先設定が不正です。",
            });
          }

          const allowedChannels = ["terrace_jobs", "stanby"];

          for (const item of channels) {
            const channel = String(item?.channel ?? "");
            const enabled = Boolean(item?.enabled);

            if (!allowedChannels.includes(channel)) {
              continue;
            }

            const defaultStatus =
              channel === "terrace_jobs"
                ? enabled
                  ? "published"
                  : "paused"
                : enabled
                  ? "pending"
                  : "paused";

            await sql`
              INSERT INTO job_publication_channels (
                job_id,
                channel,
                enabled,
                status,
                updated_at
              )
              VALUES (
                ${jobId},
                ${channel},
                ${enabled},
                ${defaultStatus},
                CURRENT_TIMESTAMP
              )
              ON CONFLICT (job_id, channel)
              DO UPDATE SET
                enabled = EXCLUDED.enabled,
                status = CASE
                  WHEN job_publication_channels.channel = 'terrace_jobs'
                    THEN CASE
                      WHEN EXCLUDED.enabled THEN 'published'
                      ELSE 'paused'
                    END
                  ELSE CASE
                    WHEN EXCLUDED.enabled
                      AND job_publication_channels.status IN (
                        'not_connected',
                        'paused',
                        'error'
                      )
                      THEN 'pending'
                    WHEN NOT EXCLUDED.enabled
                      THEN 'paused'
                    ELSE job_publication_channels.status
                  END,
                updated_at = CURRENT_TIMESTAMP
            `;
          }

          const savedRows = await sql`
            SELECT
              job_id,
              channel,
              enabled,
              status,
              external_job_id,
              published_at,
              last_synced_at,
              error_message
            FROM job_publication_channels
            WHERE job_id = ${jobId}
            ORDER BY channel
          `;

          return res.status(200).json({
            success: true,
            channels: savedRows,
          });
        }

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
