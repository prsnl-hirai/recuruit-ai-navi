import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method Not Allowed",
    });
  }

  try {
    console.log("========================================");
    console.log("仕事内容候補生成");
    console.log("========================================");

    console.log("受信データ:", req.body);

    const { industry, jobTitle } = req.body;

    /* =========================
       入力チェック
    ========================= */

    if (!industry) {
      return res.status(400).json({
        success: false,
        message: "業種を選択してください",
      });
    }

    if (!jobTitle) {
      return res.status(400).json({
        success: false,
        message: "職種を入力してください",
      });
    }

    /* =========================
       AIプロンプト
    ========================= */

    const prompt = `
あなたは求人作成サービス「求人AIナビ」のアシスタントです。

以下の業種・職種から、
その仕事で一般的に行われる仕事内容を考えてください。

【業種】
${industry}

【職種】
${jobTitle}

応募者が仕事内容をイメージしやすいように、
実際の求人でよく使われる仕事内容を
6～8個程度作成してください。

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

    /* =========================
       OpenAI API
    ========================= */

    const response = await openai.responses.create({
      model: "gpt-5-mini",
      input: prompt,
    });

    const output = response.output_text;

    console.log("仕事内容候補AI response:", output);

    /* =========================
       JSON解析
    ========================= */

    let parsed: any;

    try {
      parsed = JSON.parse(output);
    } catch {
      console.log("JSON直接解析失敗。JSON部分を抽出します。");

      const jsonMatch = output.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error("AIから正しいJSONが返されませんでした");
      }

      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (jsonError) {
        console.error("JSON解析エラー:", jsonError);

        throw new Error("AIの回答をJSONとして解析できませんでした");
      }
    }

    /* =========================
       候補を安全に整形
    ========================= */

    const options = Array.isArray(parsed?.options)
      ? parsed.options.filter(
          (item: unknown) => typeof item === "string" && item.trim() !== ""
        )
      : [];

    if (options.length === 0) {
      throw new Error("仕事内容候補を生成できませんでした");
    }

    /* =========================
       レスポンス
    ========================= */

    return res.status(200).json({
      success: true,
      options,
    });
  } catch (error) {
    console.error("仕事内容候補生成エラー:", error);

    const message =
      error instanceof Error
        ? error.message
        : "仕事内容候補の生成に失敗しました";

    return res.status(500).json({
      success: false,
      message,
    });
  }
}
