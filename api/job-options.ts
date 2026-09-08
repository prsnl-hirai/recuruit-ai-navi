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
