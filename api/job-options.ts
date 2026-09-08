import OpenAI from "openai";
import { neon } from "@neondatabase/serverless";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function pushLineMessage(to: string, text: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || !to) return false;

  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to,
      messages: [{ type: "text", text }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("LINE push failed:", response.status, detail);
    return false;
  }

  return true;
}

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
          introduction,
          active
        FROM experts
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
    // 専門家 新規登録
    // =========================================================
    if (action === "subsidy-expert-create") {
      if (!process.env.DATABASE_URL)
        throw new Error("DATABASE_URLが設定されていません");
      const sql = neon(process.env.DATABASE_URL);

      const expertType = String(req.body?.expertType ?? "").trim();
      const name = String(req.body?.name ?? "").trim();
      const companyName = String(req.body?.companyName ?? "").trim();
      const email = String(req.body?.email ?? "").trim();
      const phone = String(req.body?.phone ?? "").trim();
      const postalCode = String(req.body?.postalCode ?? "").trim();
      const prefecture = String(req.body?.prefecture ?? "").trim();
      const city = String(req.body?.city ?? "").trim();
      const address = String(req.body?.address ?? "").trim();
      const websiteUrl = String(req.body?.websiteUrl ?? "").trim();
      const licenseNumber = String(req.body?.licenseNumber ?? "").trim();
      const introduction = String(req.body?.introduction ?? "").trim();

      const allowedTypes = [
        "social_insurance_consultant",
        "subsidy_consultant",
        "other",
      ];
      if (!allowedTypes.includes(expertType)) {
        return res
          .status(400)
          .json({ success: false, message: "専門家種別が正しくありません" });
      }
      if (!name) {
        return res
          .status(400)
          .json({ success: false, message: "氏名は必須です" });
      }

      const rows = await sql`
        INSERT INTO experts (
          expert_type, company_name, name, email, phone, postal_code,
          prefecture, city, address, website_url, license_number,
          introduction, active, created_at, updated_at
        )
        VALUES (
          ${expertType}, ${companyName || null}, ${name},
          ${email || null}, ${phone || null}, ${postalCode || null},
          ${prefecture || null}, ${city || null}, ${address || null},
          ${websiteUrl || null}, ${licenseNumber || null},
          ${introduction || null}, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        RETURNING *
      `;
      return res.status(200).json({ success: true, expert: rows[0] });
    }

    // =========================================================
    // 専門家 更新
    // =========================================================
    if (action === "subsidy-expert-update") {
      if (!process.env.DATABASE_URL)
        throw new Error("DATABASE_URLが設定されていません");
      const sql = neon(process.env.DATABASE_URL);

      const expertId = Number(req.body?.expertId);
      const expertType = String(req.body?.expertType ?? "").trim();
      const name = String(req.body?.name ?? "").trim();
      const companyName = String(req.body?.companyName ?? "").trim();
      const email = String(req.body?.email ?? "").trim();
      const phone = String(req.body?.phone ?? "").trim();
      const postalCode = String(req.body?.postalCode ?? "").trim();
      const prefecture = String(req.body?.prefecture ?? "").trim();
      const city = String(req.body?.city ?? "").trim();
      const address = String(req.body?.address ?? "").trim();
      const websiteUrl = String(req.body?.websiteUrl ?? "").trim();
      const licenseNumber = String(req.body?.licenseNumber ?? "").trim();
      const introduction = String(req.body?.introduction ?? "").trim();

      if (!Number.isInteger(expertId) || expertId <= 0) {
        return res
          .status(400)
          .json({ success: false, message: "専門家IDが正しくありません" });
      }
      if (
        ![
          "social_insurance_consultant",
          "subsidy_consultant",
          "other",
        ].includes(expertType)
      ) {
        return res
          .status(400)
          .json({ success: false, message: "専門家種別が正しくありません" });
      }
      if (!name) {
        return res
          .status(400)
          .json({ success: false, message: "氏名は必須です" });
      }

      const rows = await sql`
        UPDATE experts SET
          expert_type = ${expertType},
          company_name = ${companyName || null},
          name = ${name},
          email = ${email || null},
          phone = ${phone || null},
          postal_code = ${postalCode || null},
          prefecture = ${prefecture || null},
          city = ${city || null},
          address = ${address || null},
          website_url = ${websiteUrl || null},
          license_number = ${licenseNumber || null},
          introduction = ${introduction || null},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${expertId}
        RETURNING *
      `;
      if (rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "専門家が見つかりません" });
      }
      return res.status(200).json({ success: true, expert: rows[0] });
    }

    // =========================================================
    // 専門家 有効・無効切替
    // =========================================================
    if (action === "subsidy-expert-status") {
      if (!process.env.DATABASE_URL)
        throw new Error("DATABASE_URLが設定されていません");
      const sql = neon(process.env.DATABASE_URL);

      const expertId = Number(req.body?.expertId);
      const active = req.body?.active;
      if (
        !Number.isInteger(expertId) ||
        expertId <= 0 ||
        typeof active !== "boolean"
      ) {
        return res
          .status(400)
          .json({ success: false, message: "専門家情報が正しくありません" });
      }

      const rows = await sql`
        UPDATE experts
        SET active = ${active}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${expertId}
        RETURNING id, active, updated_at
      `;
      if (rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "専門家が見つかりません" });
      }
      return res.status(200).json({ success: true, expert: rows[0] });
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
        userId,
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
          user_id,
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
          ${userId ? String(userId).trim() : null},
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

      // ---------------------------------------------------------
      // LINE通知
      // LINE送信に失敗しても、相談申込み自体は成功扱いにします。
      // ---------------------------------------------------------
      try {
        const selectedSubsidies = await sql`
          SELECT s.name, s.course_name
          FROM consultation_subsidies cs
          INNER JOIN subsidies s ON s.id = cs.subsidy_id
          WHERE cs.consultation_id = ${consultationId}
          ORDER BY s.name, s.course_name, s.id
        `;

        const subsidyText =
          selectedSubsidies.length > 0
            ? selectedSubsidies
                .map(
                  (item: any) =>
                    `・${[item.name, item.course_name].filter(Boolean).join(" / ")}`,
                )
                .join("\n")
            : "・未登録";

        const safeMessage =
          consultationMessage && String(consultationMessage).trim()
            ? String(consultationMessage).trim()
            : "記入なし";

        // ① 相談者本人への受付完了通知
        if (userId) {
          const userMessage = [
            "💰 専門家相談を受け付けました",
            "",
            `${String(companyName).trim()} 様`,
            "助成金に関する専門家相談のお申し込みありがとうございます。",
            "",
            "【相談したい助成金】",
            subsidyText,
            "",
            "【ご相談内容】",
            safeMessage,
            "",
            "内容を確認後、相談内容に応じて提携する社会保険労務士または専門家をご案内します。",
            "",
            `相談受付番号：${consultationId}`,
          ].join("\n");

          await pushLineMessage(String(userId), userMessage);
        } else {
          console.warn(
            "LINE userId が取得できなかったため、相談者本人へのLINE通知を省略しました",
          );
        }

        // ② 求人AIナビ運営者への新規相談通知
        const adminLineUserId = process.env.ADMIN_LINE_USER_ID;
        if (adminLineUserId) {
          const adminMessage = [
            "🔔 新しい助成金の専門家相談が入りました",
            "",
            `【相談ID】${consultationId}`,
            `【会社名】${String(companyName).trim()}`,
            `【担当者】${String(contactName).trim()}`,
            `【都道府県】${String(prefecture).trim()}`,
            `【メール】${String(email).trim()}`,
            `【電話】${phone ? String(phone).trim() : "未登録"}`,
            "",
            "【相談したい助成金】",
            subsidyText,
            "",
            "【相談内容】",
            safeMessage,
            "",
            "管理画面：",
            "https://recuruit-ai-navi.vercel.app/admin/subsidy-consultations",
          ].join("\n");

          await pushLineMessage(adminLineUserId, adminMessage);
        } else {
          console.warn(
            "ADMIN_LINE_USER_ID が未設定のため、運営者LINE通知を省略しました",
          );
        }
      } catch (lineError) {
        console.error("相談申込み後のLINE通知処理でエラー:", lineError);
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
