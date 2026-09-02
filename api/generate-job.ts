import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: any, res: any) {
  // POST以外は拒否
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method Not Allowed",
    });
  }

  try {
    console.log("求人生成リクエスト受信");

    const job = req.body;

    console.log("受信データ:", job);

    // =========================
    // 入力チェック
    // =========================

    if (!job.storeName) {
      return res.status(400).json({
        success: false,
        message: "店舗名・会社名が入力されていません",
      });
    }

    if (!job.industry) {
      return res.status(400).json({
        success: false,
        message: "業種が入力されていません",
      });
    }

    if (!job.jobTitle) {
      return res.status(400).json({
        success: false,
        message: "募集職種が入力されていません",
      });
    }

    if (!job.jobDescription) {
      return res.status(400).json({
        success: false,
        message: "仕事内容が入力されていません",
      });
    }

    if (!job.location) {
      return res.status(400).json({
        success: false,
        message: "勤務地が入力されていません",
      });
    }

    if (!job.salary) {
      return res.status(400).json({
        success: false,
        message: "給与が入力されていません",
      });
    }

    // =========================
    // AIへの指示
    // =========================

    const prompt = `
あなたは求人広告の専門ライターです。

以下の求人情報をもとに、
応募者が仕事内容や働くメリットを理解しやすく、
応募したくなる求人票を作成してください。


【店舗・会社情報】

店舗名・会社名：
${job.storeName}

業種：
${job.industry}


【募集内容】

募集職種：
${job.jobTitle}

仕事内容：
${job.jobDescription}

雇用形態：
${job.employmentType}


【勤務条件】

勤務地：
${job.location}

勤務開始時間：
${job.startTime || "未指定"}

勤務終了時間：
${job.endTime || "未指定"}

給与：
${job.salaryType} ${job.salary}円


【待遇・特徴】

${
  job.benefits && job.benefits.length > 0 ? job.benefits.join("、") : "特になし"
}


【AIへのリクエスト】

${job.aiRequest || "特になし"}


【作成ルール】

・入力されていない情報を勝手に追加しない
・給与、勤務地、勤務時間などの条件を変更しない
・誇張表現を避ける
・応募者に分かりやすい日本語にする
・読みやすい文章にする
・仕事内容を具体的かつ魅力的に表現する
・AIへのリクエストをできるだけ反映する
・求人媒体に掲載しやすい内容にする


【出力形式】

以下の項目を必ず含めてください。

■ 求人タイトル

■ キャッチコピー

■ 仕事内容

■ 応募資格・求める人物像

■ 給与

■ 勤務時間

■ 勤務地

■ 雇用形態

■ 待遇・福利厚生

■ この求人の魅力
`;

    // =========================
    // OpenAI API呼び出し
    // =========================

    console.log("OpenAI APIを呼び出します");

    const response = await openai.responses.create({
      model: "gpt-5-mini",
      input: prompt,
    });

    // =========================
    // AIからの回答
    // =========================

    const generatedJob = response.output_text;

    console.log("求人生成完了");

    // =========================
    // Reactへ返却
    // =========================

    return res.status(200).json({
      success: true,
      job: generatedJob,
    });
  } catch (error) {
    console.error("求人生成エラー:", error);

    return res.status(500).json({
      success: false,
      message: "AIによる求人生成に失敗しました",
    });
  }
}
