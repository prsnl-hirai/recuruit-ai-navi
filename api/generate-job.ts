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
    const job = req.body;

    console.log("求人生成リクエスト受信");
    console.log("受信データ:", job);

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEYが設定されていません");
    }

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

    const benefits =
      Array.isArray(job.benefits) && job.benefits?.length > 0
        ? job.benefits.join("、")
        : "特になし";

    const workCondition =
      job.workType === "シフト制"
        ? `
勤務形態：シフト制

勤務可能時間帯：
${job.startTime || "未指定"} ～ ${job.endTime || "未指定"}

シフト例：
${job.shiftExample || "未指定"}

最低勤務日数：
${job.minDaysPerWeek || "未指定"}

最低勤務時間：
${job.minHoursPerDay || "未指定"}
`
        : `
勤務形態：固定時間

勤務時間：
${job.startTime || "未指定"} ～ ${job.endTime || "未指定"}
`;

    const prompt = `
あなたは「求人AIナビ」の求人広告コンサルタントです。

単に求人文章を書くのではなく、

1. 応募者にとって魅力的な求人票を作る
2. 勤務地から最寄り駅候補を推定する
3. 求人の応募されやすさを100点満点で評価する
4. 同じエリア・同じ職種の求人市場で一般的に見られる傾向を考慮する
5. 応募を増やすための改善ポイントを優先順位付きで提案する

という5つを行ってください。

【重要】

・入力された条件を勝手に変更しない
・存在しない待遇を追加しない
・給与を勝手に変更しない
・勤務時間を勝手に変更しない
・駅名や距離について確信がない場合は「候補」「推定」として扱う
・最寄り駅の徒歩分数を断定しない
・市場データを確認できていない場合、具体的な応募数や順位を捏造しない
・「応募数が○%増える」などの根拠のない数値予測をしない
・市場傾向は一般的な求人市場の傾向として説明する
・求人票は日本の求人媒体に掲載しやすい自然な日本語にする
・AIへのリクエストをできる限り反映する

【求人情報】

店舗名・会社名：
${job.storeName}

業種：
${job.industry}

募集職種：
${job.jobTitle}

仕事内容：
${job.jobDescription}

雇用形態：
${job.employmentType}

勤務地：
${job.location}

${workCondition}

給与：
${job.salaryType} ${job.salary}円

待遇・特徴：
${benefits}

AIへのリクエスト：
${job.aiRequest || "特になし"}

【分析対象】

勤務地：
${job.location}

職種：
${job.jobTitle}

業種：
${job.industry}

雇用形態：
${job.employmentType}

給与：
${job.salaryType} ${job.salary}円

勤務形態：
${job.workType}

【市場分析】

以下の観点から、
この求人が応募者にとって魅力的かを分析してください。

・給与水準
・勤務時間
・シフトの柔軟性
・週の勤務日数
・1日の勤務時間
・待遇
・未経験者への訴求
・学生への訴求
・主婦・主夫への訴求
・Wワークへの訴求
・アクセス
・求人タイトル
・仕事内容の分かりやすさ

ただし、現在の実際の求人データを確認していない場合は、
「一般的な求人市場の傾向」として表現してください。

【最寄り駅】

勤務地住所から、知識上判断できる範囲で
最寄り駅候補を最大3件挙げてください。

以下を出してください。

駅名
路線名
距離・徒歩時間の推定

確信がない場合は空配列にしてください。

【求人AIスコア】

以下を0～100で評価してください。

salary
workConditions
benefits
accessibility
title
appeal

totalは上記6項目を総合して判断してください。

【改善提案】

応募を増やすために、
効果が大きいと思われる順に最大5件提案してください。

例えば、

・給与を変更する必要があるか
・シフト条件を分かりやすくする
・学生向けの訴求を強くする
・最寄り駅をアピールする
・タイトルを変更する
・仕事内容を具体化する
・待遇を目立たせる

などです。

ただし、給与や待遇を勝手に変更する提案ではなく、
「可能であれば」という形で提案してください。

【求人票】

以下を作成してください。

求人タイトル
キャッチコピー
仕事内容
応募資格・求める人物像
給与
勤務時間
勤務地
雇用形態
待遇・福利厚生
この求人の魅力

【JSON形式】

必ず以下のJSON構造で返してください。

{
  "nearestStations": [
    {
      "stationName": "駅名",
      "lineName": "路線名",
      "estimatedDistance": "徒歩約○分など"
    }
  ],
  "score": {
    "total": 0,
    "salary": 0,
    "workConditions": 0,
    "benefits": 0,
    "accessibility": 0,
    "title": 0,
    "appeal": 0
  },
  "marketSummary": [
    "市場傾向1",
    "市場傾向2",
    "市場傾向3"
  ],
  "improvementPoints": [
    {
      "priority": 1,
      "title": "改善ポイント",
      "reason": "理由",
      "recommendation": "おすすめ"
    }
  ],
  "job": {
    "title": "求人タイトル",
    "catchCopy": "キャッチコピー",
    "description": "仕事内容",
    "requirements": "応募資格・求める人物像",
    "salary": "給与",
    "workingHours": "勤務時間",
    "location": "勤務地",
    "employmentType": "雇用形態",
    "benefits": "待遇・福利厚生",
    "appealPoints": "この求人の魅力"
  }
}

JSON以外の文章は出力しないでください。
`;

    console.log("OpenAI APIを呼び出します");

    const response = await openai.responses.create({
      model: "gpt-5.6-luna",
      input: prompt,
    });

    const output = response.output_text;

    console.log("OpenAI response:", output);

    let parsed;

    try {
      parsed = JSON.parse(output);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);

      const jsonMatch = output.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error("AIから正しいJSONが返されませんでした");
      }

      parsed = JSON.parse(jsonMatch[0]);
    }

    return res.status(200).json({
      success: true,
      ...parsed,
    });
  } catch (error: any) {
    console.error("求人生成エラー:", error);

    return res.status(500).json({
      success: false,
      message: error?.message || "AIによる求人生成に失敗しました",
    });
  }
}
