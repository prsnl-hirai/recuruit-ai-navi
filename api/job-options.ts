import OpenAI from "openai";
import { neon } from "@neondatabase/serverless";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      success: false,
      message: "Method Not Allowed",
    });
  }

  try {
    const action = String(req.body?.action ?? "");

    // =========================================================
    // 助成金診断マスタ取得
    // 既存の /api/job-options を利用するため、新しいFunctionは増やしません。
    // =========================================================
    if (action === "subsidy-master") {
      if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URLが設定されていません");
      }

      const sql = neon(process.env.DATABASE_URL);
      const fiscalYear = Number(req.body?.fiscalYear ?? 2026);

      if (
        !Number.isInteger(fiscalYear) ||
        fiscalYear < 2000 ||
        fiscalYear > 2100
      ) {
        return res.status(400).json({
          success: false,
          message: "年度が正しくありません",
        });
      }

      const questions = await sql`
        SELECT
          id,
          question_key,
          question_text,
          question_type,
          industry,
          options,
          sort_order
        FROM subsidy_questions
        WHERE active = TRUE
        ORDER BY sort_order, id
      `;

      const subsidies = await sql`
        SELECT
          id,
          code,
          name,
          course_name,
          fiscal_year,
          category,
          description,
          official_url,
          application_authority,
          valid_from,
          valid_to
        FROM subsidies
        WHERE fiscal_year = ${fiscalYear}
          AND active = TRUE
          AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
          AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)
        ORDER BY name, course_name, id
      `;

      const subsidyIds = subsidies.map((item: any) => Number(item.id));

      let conditions: any[] = [];
      let amountRules: any[] = [];
      if (subsidyIds.length > 0) {
        // Neonの配列展開に依存せず、年度でJOINして取得します。
        conditions = await sql`
          SELECT
            c.id,
            c.subsidy_id,
            c.condition_key,
            c.operator,
            c.condition_value,
            c.weight,
            c.required,
            c.sort_order
          FROM subsidy_conditions c
          INNER JOIN subsidies s
            ON s.id = c.subsidy_id
          WHERE s.fiscal_year = ${fiscalYear}
            AND s.active = TRUE
            AND (s.valid_from IS NULL OR s.valid_from <= CURRENT_DATE)
            AND (s.valid_to IS NULL OR s.valid_to >= CURRENT_DATE)
          ORDER BY c.subsidy_id, c.sort_order, c.id
        `;

        amountRules = await sql`
          SELECT a.id, a.subsidy_id, a.fiscal_year, a.rule_key,
                 a.amount_type, a.amount_display, a.min_amount_yen,
                 a.max_amount_yen, a.rate_min, a.rate_max, a.unit,
                 a.calculation_note, a.source_url
          FROM subsidy_amount_rules a
          INNER JOIN subsidies s ON s.id = a.subsidy_id
          WHERE a.fiscal_year = ${fiscalYear}
            AND a.active = TRUE
            AND s.fiscal_year = ${fiscalYear}
            AND s.active = TRUE
          ORDER BY a.subsidy_id, a.id
        `;
      }

      return res.status(200).json({
        success: true,
        fiscalYear,
        questions,
        subsidies,
        conditions,
        amountRules,
      });
    }

    // =========================================================
    // 助成金相談 管理一覧
    // =========================================================
    if (action === "subsidy-consultation-list") {
      if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URLが設定されていません");
      }

      const sql = neon(process.env.DATABASE_URL);

      const consultations = await sql`
        SELECT
          cr.id,
          cr.diagnosis_id,
          cr.company_name,
          cr.contact_name,
          cr.email,
          cr.phone,
          cr.prefecture,
          cr.consultation_message,
          cr.admin_memo,
          cr.status,
          cr.consent_to_share,
          cr.consented_at,
          cr.created_at,
          sd.industry,
          sd.employee_count,
          sd.capital,
          sd.answers
        FROM consultation_requests cr
        LEFT JOIN subsidy_diagnoses sd
          ON sd.id = cr.diagnosis_id
        ORDER BY
          CASE WHEN cr.status = 'new' THEN 0 ELSE 1 END,
          cr.created_at DESC,
          cr.id DESC
      `;

      const rows = [];
      for (const consultation of consultations) {
        const subsidies = await sql`
          SELECT
            s.id,
            s.name,
            s.course_name,
            sdr.match_level,
            sdr.score,
            sdr.matched_reasons,
            sdr.required_checks
          FROM consultation_subsidies cs
          INNER JOIN subsidies s
            ON s.id = cs.subsidy_id
          LEFT JOIN subsidy_diagnosis_results sdr
            ON sdr.diagnosis_id = ${consultation.diagnosis_id}
           AND sdr.subsidy_id = s.id
          WHERE cs.consultation_id = ${consultation.id}
          ORDER BY s.name, s.course_name, s.id
        `;

        const assignments = await sql`
          SELECT
            ea.id,
            ea.status,
            ea.assigned_at,
            ea.accepted_at,
            ea.declined_at,
            ea.completed_at,
            ea.note,
            e.id AS expert_id,
            e.expert_type,
            e.company_name AS expert_company_name,
            e.name AS expert_name,
            e.email AS expert_email,
            e.phone AS expert_phone,
            e.prefecture AS expert_prefecture,
            e.website_url AS expert_website_url,
            e.license_number AS expert_license_number
          FROM expert_assignments ea
          INNER JOIN experts e
            ON e.id = ea.expert_id
          WHERE ea.consultation_id = ${consultation.id}
          ORDER BY ea.assigned_at DESC, ea.id DESC
        `;

        const activities = await sql`
          SELECT
            ca.id,
            ca.contact_type,
            ca.contacted_at,
            ca.memo,
            ca.created_at,
            ca.expert_id,
            e.name AS expert_name,
            e.company_name AS expert_company_name
          FROM consultation_activities ca
          LEFT JOIN experts e
            ON e.id = ca.expert_id
          WHERE ca.consultation_id = ${consultation.id}
          ORDER BY ca.contacted_at DESC, ca.id DESC
        `;

        rows.push({
          ...consultation,
          subsidies,
          assignments,
          activities,
        });
      }

      return res.status(200).json({
        success: true,
        consultations: rows,
      });
    }

    // =========================================================
    // 専門家一覧
    // =========================================================
    if (action === "subsidy-expert-list") {
      if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URLが設定されていません");
      }

      const sql = neon(process.env.DATABASE_URL);

      const experts = await sql`
        SELECT
          id,
          expert_type,
          company_name,
          name,
          email,
          phone,
          postal_code,
          prefecture,
          city,
          address,
          website_url,
          license_number,
          introduction
        FROM experts
        WHERE active = TRUE
        ORDER BY
          CASE
            WHEN expert_type = 'social_insurance_consultant' THEN 0
            WHEN expert_type = 'subsidy_consultant' THEN 1
            ELSE 2
          END,
          prefecture,
          name,
          id
      `;

      return res.status(200).json({
        success: true,
        experts,
      });
    }

    // =========================================================
    // 専門家割当
    // =========================================================
    if (action === "subsidy-assign-expert") {
      if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URLが設定されていません");
      }

      const sql = neon(process.env.DATABASE_URL);
      const consultationId = Number(req.body?.consultationId);
      const expertId = Number(req.body?.expertId);
      const note = String(req.body?.note ?? "").trim();

      if (!Number.isInteger(consultationId) || consultationId <= 0) {
        return res.status(400).json({
          success: false,
          message: "相談IDが正しくありません",
        });
      }

      if (!Number.isInteger(expertId) || expertId <= 0) {
        return res.status(400).json({
          success: false,
          message: "専門家を選択してください",
        });
      }

      const expertRows = await sql`
        SELECT id
        FROM experts
        WHERE id = ${expertId}
          AND active = TRUE
        LIMIT 1
      `;

      if (expertRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "専門家が見つかりません",
        });
      }

      const assigned = await sql`
        INSERT INTO expert_assignments (
          consultation_id,
          expert_id,
          status,
          assigned_at,
          note
        )
        VALUES (
          ${consultationId},
          ${expertId},
          'assigned',
          CURRENT_TIMESTAMP,
          ${note || null}
        )
        RETURNING id, consultation_id, expert_id, status, assigned_at, note
      `;

      await sql`
        UPDATE consultation_requests
        SET
          status = 'assigned',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${consultationId}
      `;

      return res.status(200).json({
        success: true,
        assignment: assigned[0],
      });
    }

    // =========================================================
    // 対応履歴追加
    // =========================================================
    if (action === "subsidy-consultation-activity-add") {
      if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URLが設定されていません");
      }

      const sql = neon(process.env.DATABASE_URL);
      const consultationId = Number(req.body?.consultationId);
      const expertIdRaw = req.body?.expertId;
      const expertId =
        expertIdRaw === null || expertIdRaw === undefined || expertIdRaw === ""
          ? null
          : Number(expertIdRaw);
      const contactType = String(req.body?.contactType ?? "");
      const contactedAt = String(req.body?.contactedAt ?? "");
      const memo = String(req.body?.memo ?? "").trim();

      const allowedContactTypes = [
        "phone",
        "email",
        "line",
        "online_meeting",
        "visit",
        "other",
      ];

      if (!Number.isInteger(consultationId) || consultationId <= 0) {
        return res.status(400).json({
          success: false,
          message: "相談IDが正しくありません",
        });
      }

      if (!allowedContactTypes.includes(contactType)) {
        return res.status(400).json({
          success: false,
          message: "連絡方法が正しくありません",
        });
      }

      if (!contactedAt) {
        return res.status(400).json({
          success: false,
          message: "連絡日時を入力してください",
        });
      }

      if (expertId !== null && (!Number.isInteger(expertId) || expertId <= 0)) {
        return res.status(400).json({
          success: false,
          message: "専門家IDが正しくありません",
        });
      }

      const inserted = await sql`
        INSERT INTO consultation_activities (
          consultation_id,
          expert_id,
          contact_type,
          contacted_at,
          memo
        )
        VALUES (
          ${consultationId},
          ${expertId},
          ${contactType},
          ${contactedAt},
          ${memo || null}
        )
        RETURNING id, consultation_id, expert_id, contact_type, contacted_at, memo
      `;

      return res.status(200).json({
        success: true,
        activity: inserted[0],
      });
    }

    // =========================================================
    // 管理メモ保存
    // =========================================================
    if (action === "subsidy-consultation-memo") {
      if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URLが設定されていません");
      }

      const sql = neon(process.env.DATABASE_URL);
      const consultationId = Number(req.body?.consultationId);
      const adminMemo = String(req.body?.adminMemo ?? "");

      if (!Number.isInteger(consultationId) || consultationId <= 0) {
        return res.status(400).json({
          success: false,
          message: "相談IDが正しくありません",
        });
      }

      const updated = await sql`
        UPDATE consultation_requests
        SET
          admin_memo = ${adminMemo},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${consultationId}
        RETURNING id, admin_memo, updated_at
      `;

      if (updated.length === 0) {
        return res.status(404).json({
          success: false,
          message: "相談が見つかりません",
        });
      }

      return res.status(200).json({
        success: true,
        consultation: updated[0],
      });
    }

    // =========================================================
    // 助成金相談 ステータス更新
    // =========================================================
    if (action === "subsidy-consultation-status") {
      if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URLが設定されていません");
      }

      const sql = neon(process.env.DATABASE_URL);
      const consultationId = Number(req.body?.consultationId);
      const status = String(req.body?.status ?? "");

      const allowedStatuses = [
        "new",
        "contacting",
        "consulting",
        "assigned",
        "completed",
        "closed",
      ];

      if (!Number.isInteger(consultationId) || consultationId <= 0) {
        return res.status(400).json({
          success: false,
          message: "相談IDが正しくありません",
        });
      }

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "ステータスが正しくありません",
        });
      }

      const updated = await sql`
        UPDATE consultation_requests
        SET
          status = ${status},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${consultationId}
        RETURNING id, status, updated_at
      `;

      if (updated.length === 0) {
        return res.status(404).json({
          success: false,
          message: "相談が見つかりません",
        });
      }

      return res.status(200).json({
        success: true,
        consultation: updated[0],
      });
    }

    // =========================================================
    // 助成金診断 → 専門家相談申込み
    // =========================================================
    if (action === "subsidy-consultation") {
      if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URLが設定されていません");
      }

      const sql = neon(process.env.DATABASE_URL);
      const {
        companyName,
        contactName,
        email,
        phone,
        prefecture,
        consultationMessage,
        answers,
        subsidyIds,
        results,
        consentToShare,
      } = req.body ?? {};

      if (!companyName || !contactName || !email || !prefecture) {
        return res.status(400).json({
          success: false,
          message: "会社名・担当者名・メールアドレス・都道府県は必須です",
        });
      }

      if (consentToShare !== true) {
        return res.status(400).json({
          success: false,
          message: "専門家への情報提供同意が必要です",
        });
      }

      const answerObject =
        answers && typeof answers === "object" && !Array.isArray(answers)
          ? answers
          : {};

      const employeeCount = Number(answerObject.employee_count);
      const capital = Number(answerObject.capital);
      const industry =
        typeof answerObject.industry === "string"
          ? answerObject.industry
          : null;

      const diagnosisRows = await sql`
        INSERT INTO subsidy_diagnoses (
          company_name,
          contact_name,
          industry,
          employee_count,
          capital,
          answers,
          status
        )
        VALUES (
          ${String(companyName).trim()},
          ${String(contactName).trim()},
          ${industry},
          ${Number.isFinite(employeeCount) ? employeeCount : null},
          ${Number.isFinite(capital) ? capital : null},
          ${JSON.stringify(answerObject)}::jsonb,
          'completed'
        )
        RETURNING id
      `;

      const diagnosisId = Number(diagnosisRows[0].id);

      const safeResults = Array.isArray(results) ? results : [];
      for (const result of safeResults) {
        const subsidyId = Number(result?.subsidyId);
        if (!Number.isInteger(subsidyId) || subsidyId <= 0) continue;

        await sql`
          INSERT INTO subsidy_diagnosis_results (
            diagnosis_id,
            subsidy_id,
            match_level,
            score,
            matched_reasons,
            required_checks
          )
          VALUES (
            ${diagnosisId},
            ${subsidyId},
            ${String(result?.matchLevel ?? "medium")},
            ${Number(result?.score ?? 0)},
            ${JSON.stringify(Array.isArray(result?.reasons) ? result.reasons : [])}::jsonb,
            ${JSON.stringify(Array.isArray(result?.checks) ? result.checks : [])}::jsonb
          )
          ON CONFLICT (diagnosis_id, subsidy_id)
          DO NOTHING
        `;
      }

      const consultationRows = await sql`
        INSERT INTO consultation_requests (
          diagnosis_id,
          company_name,
          contact_name,
          email,
          phone,
          prefecture,
          consultation_type,
          consultation_message,
          status,
          consent_to_share,
          consented_at
        )
        VALUES (
          ${diagnosisId},
          ${String(companyName).trim()},
          ${String(contactName).trim()},
          ${String(email).trim()},
          ${phone ? String(phone).trim() : null},
          ${String(prefecture).trim()},
          'subsidy',
          ${consultationMessage ? String(consultationMessage).trim() : null},
          'new',
          TRUE,
          CURRENT_TIMESTAMP
        )
        RETURNING id
      `;

      const consultationId = Number(consultationRows[0].id);
      const ids = Array.isArray(subsidyIds)
        ? [
            ...new Set(
              subsidyIds
                .map(Number)
                .filter((id) => Number.isInteger(id) && id > 0),
            ),
          ]
        : [];

      for (const subsidyId of ids) {
        await sql`
          INSERT INTO consultation_subsidies (
            consultation_id,
            subsidy_id
          )
          VALUES (
            ${consultationId},
            ${subsidyId}
          )
          ON CONFLICT (consultation_id, subsidy_id)
          DO NOTHING
        `;
      }

      return res.status(200).json({
        success: true,
        diagnosisId,
        consultationId,
      });
    }

    // =========================================================
    // 従来の仕事内容候補生成
    // =========================================================
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEYが設定されていません");
    }

    const { industry, jobTitle } = req.body ?? {};

    if (!industry) {
      return res.status(400).json({
        success: false,
        message: "業種を選択してください",
      });
    }

    if (!jobTitle) {
      return res.status(400).json({
        success: false,
        message: "職種を選択してください",
      });
    }

    const prompt = `
あなたは求人作成サービス「求人AIナビ」のアシスタントです。

以下の業種・職種から、その仕事で一般的に行われる仕事内容を考えてください。

【業種】
${industry}

【職種】
${jobTitle}

応募者が仕事内容をイメージしやすいように、
実際の求人でよく使われる仕事内容を候補として8個程度作成してください。

【ルール】

・実際に一般的な仕事内容だけを出してください
・入力された職種から大きく外れる仕事内容を追加しない
・専門的すぎる表現は避ける
・短く分かりやすい日本語にする
・1項目につき1つの仕事内容にする
・「その他」「未指定」「要相談」などは入れない
・AIやシステムについての説明は入れない
・仕事内容以外の情報は出さない

必ず以下のJSONだけを返してください。

{
  "options": [
    "仕事内容1",
    "仕事内容2",
    "仕事内容3",
    "仕事内容4",
    "仕事内容5",
    "仕事内容6",
    "仕事内容7",
    "仕事内容8"
  ]
}

JSON以外の文章は絶対に出力しないでください。
`;

    console.log("仕事内容候補生成", { industry, jobTitle });

    const response = await openai.responses.create({
      model: "gpt-5.6-luna",
      input: prompt,
    });

    const output = response.output_text;

    let parsed;

    try {
      parsed = JSON.parse(output);
    } catch (error) {
      console.error("JSON parse error:", error);

      const jsonMatch = output.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error("AIから正しいJSONが返されませんでした");
      }

      parsed = JSON.parse(jsonMatch[0]);
    }

    const options = Array.isArray(parsed.options)
      ? parsed.options.filter(
          (item: unknown): item is string =>
            typeof item === "string" && item.trim() !== "",
        )
      : [];

    return res.status(200).json({
      success: true,
      options,
    });
  } catch (error: any) {
    console.error("job-options error:", error);

    return res.status(500).json({
      success: false,
      message: error?.message || "処理に失敗しました",
    });
  }
}
