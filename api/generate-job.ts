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

  /* =========================
       POST以外は拒否
    ========================= */

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method Not Allowed",
    });
  }

  try {
    console.log("========================================");
    console.log("求人生成リクエスト受信");
    console.log("========================================");

    const job = req.body;

    console.log("受信データ:", job);

    /* =========================
         入力チェック
      ========================= */

    if (!job.storeName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "店舗名・会社名が入力されていません",
      });
    }

    if (!job.industry) {
      return res.status(400).json({
        success: false,
        message: "業種が選択されていません",
      });
    }

    if (!job.jobTitle) {
      return res.status(400).json({
        success: false,
        message: "募集職種が選択されていません",
      });
    }

    if (!job.jobDescription?.trim()) {
      return res.status(400).json({
        success: false,
        message: "仕事内容が選択されていません",
      });
    }

    if (!job.location?.trim()) {
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

    /* =========================
         配列を安全に処理
      ========================= */

    const benefits = Array.isArray(job.benefits) ? job.benefits : [];

    const requiredConditions = Array.isArray(job.requiredConditions)
      ? job.requiredConditions
      : [];

    const welcomeConditions = Array.isArray(job.welcomeConditions)
      ? job.welcomeConditions
      : [];

    const qualifications = Array.isArray(job.qualifications)
      ? job.qualifications
      : [];

    const allowances = Array.isArray(job.allowances) ? job.allowances : [];

    const workplaceAtmosphere = Array.isArray(job.workplaceAtmosphere)
      ? job.workplaceAtmosphere
      : [];

    const ageGroup = Array.isArray(job.ageGroup) ? job.ageGroup : [];

    const appealPoints = Array.isArray(job.appealPoints)
      ? job.appealPoints
      : [];

    /* =========================
         AIへの入力情報
      ========================= */

    const prompt = `
  あなたは求人広告の専門家であり、
  求人市場分析にも詳しいAIです。
  
  「求人AIナビ」のユーザーが入力・選択した求人情報をもとに、
  
  1. 応募者にとって分かりやすい求人票を作成する
  2. 求人内容を100点満点で評価する
  3. 求人市場の傾向を分析する
  4. 応募を増やすための改善ポイントを提案する
  
  という4つを行ってください。
  
  ━━━━━━━━━━━━━━━━━━━━
  【会社・店舗情報】
  ━━━━━━━━━━━━━━━━━━━━
  
  店舗名・会社名：
  ${job.storeName}
  
  業種：
  ${job.industry}
  
  ━━━━━━━━━━━━━━━━━━━━
  【募集内容】
  ━━━━━━━━━━━━━━━━━━━━
  
  募集職種：
  ${job.jobTitle}
  
  募集人数：
  ${job.recruitmentCount || "未指定"}
  
  仕事内容：
  ${job.jobDescription}
  
  雇用形態：
  ${job.employmentType || "未指定"}
  
  ━━━━━━━━━━━━━━━━━━━━
  【勤務地】
  ━━━━━━━━━━━━━━━━━━━━
  
  勤務地：
  ${job.location}
  
  勤務地については、
  住所から判断できる範囲で最寄り駅を推定してください。
  
  ただし、正確な距離が分からない場合は、
  「徒歩約○分」などの断定を避け、
  「約○m程度」など大まかな表現にしてください。
  
  ━━━━━━━━━━━━━━━━━━━━
  【勤務条件】
  ━━━━━━━━━━━━━━━━━━━━
  
  勤務形態：
  ${job.workType || "未指定"}
  
  開始時間：
  ${job.startTime || "未指定"}
  
  終了時間：
  ${job.endTime || "未指定"}
  
  休憩時間：
  ${job.breakTime || "未指定"}
  
  休日：
  ${job.holidays || "未指定"}
  
  最低勤務日数：
  ${job.minDaysPerWeek || "未指定"}
  
  最低勤務時間：
  ${job.minHoursPerDay || "未指定"}
  
  残業：
  ${job.overtime || "未指定"}
  
  シフト例：
  ${job.shiftExample || "未指定"}
  
  ━━━━━━━━━━━━━━━━━━━━
  【給与・雇用条件】
  ━━━━━━━━━━━━━━━━━━━━
  
  給与：
  ${job.salaryType || "未指定"} ${job.salary}円
  
  昇給：
  ${job.raise || "未指定"}
  
  賞与：
  ${job.bonus || "未指定"}
  
  試用期間：
  ${job.trialPeriod || "未指定"}
  
  契約期間：
  ${job.contractPeriod || "未指定"}
  
  ━━━━━━━━━━━━━━━━━━━━
  【応募資格】
  ━━━━━━━━━━━━━━━━━━━━
  
  経験：
  ${job.experience || "未指定"}
  
  必須条件：
  ${requiredConditions.length > 0 ? requiredConditions.join("、") : "特になし"}
  
  歓迎条件：
  ${welcomeConditions.length > 0 ? welcomeConditions.join("、") : "特になし"}
  
  資格：
  ${qualifications.length > 0 ? qualifications.join("、") : "特になし"}
  
  ━━━━━━━━━━━━━━━━━━━━
  【福利厚生】
  ━━━━━━━━━━━━━━━━━━━━
  
  福利厚生：
  ${benefits.length > 0 ? benefits.join("、") : "特になし"}
  
  社会保険：
  ${job.socialInsurance || "未指定"}
  
  交通費：
  ${job.transportationAllowance || "未指定"}
  
  各種手当：
  ${allowances.length > 0 ? allowances.join("、") : "特になし"}
  
  その他の福利厚生：
  ${job.otherBenefits || "特になし"}
  
  ━━━━━━━━━━━━━━━━━━━━
  【職場環境】
  ━━━━━━━━━━━━━━━━━━━━
  
  職場の雰囲気：
  ${workplaceAtmosphere.length > 0 ? workplaceAtmosphere.join("、") : "未指定"}
  
  活躍している年代：
  ${ageGroup.length > 0 ? ageGroup.join("、") : "未指定"}
  
  男女比：
  ${job.genderRatio || "未指定"}
  
  ━━━━━━━━━━━━━━━━━━━━
  【アピールポイント】
  ━━━━━━━━━━━━━━━━━━━━
  
  ${
    appealPoints.length > 0
      ? appealPoints.join("、")
      : "特に指定なし。求人情報からAIが判断してください。"
  }
  
  ━━━━━━━━━━━━━━━━━━━━
  【AIへのリクエスト】
  ━━━━━━━━━━━━━━━━━━━━
  
  ${job.aiRequest || "特になし"}
  
  ━━━━━━━━━━━━━━━━━━━━
  【重要な作成ルール】
  ━━━━━━━━━━━━━━━━━━━━
  
  ・入力された条件を元に、出来るだけ分かりやすくボリュームのある魅力的な求人を作ること
  ・適切な改行を入れること
  ・入力された条件を勝手に変更しない
  ・入力されていない条件を事実として追加しない
  ・給与を勝手に変更しない
  ・勤務時間を勝手に変更しない
  ・休日を勝手に変更しない
  ・福利厚生を勝手に追加しない
  ・資格や経験を勝手に必須条件にしない
  ・誇張表現を避ける
  ・「必ず採用」「絶対に稼げる」などの表現は禁止
  ・応募者が仕事内容を具体的にイメージできる文章にする
  ・求人媒体に掲載しやすい自然な日本語にする
  ・AIへのリクエストは可能な範囲で反映する
  ・選択された情報をもとに、求人の魅力を自然に文章化する
  ・存在しない制度や待遇を作らない
  ・最寄り駅や距離は推定であることを考慮する
  ・求人スコアは、入力された条件を基準として評価する
  ・市場分析では、同一エリア・業種での一般的な求人市場の傾向を参考にする
  ・市場分析で存在しない具体的な統計値を作らない
  
  ━━━━━━━━━━━━━━━━━━━━
  【スコアについて】
  ━━━━━━━━━━━━━━━━━━━━
  
  以下の5項目をそれぞれ100点満点で評価してください。
  
  salary：
  給与条件の魅力
  
  workConditions：
  勤務時間、休日、シフト、残業などの働きやすさ
  
  benefits：
  福利厚生、待遇などの充実度
  
  accessibility：
  勤務地、駅からのアクセスなど
  
  appeal：
  求人全体の訴求力
  
  total：
  上記5項目を総合的に評価した求人全体の点数
  
  点数は求人応募者の視点で評価してください。
  
  ━━━━━━━━━━━━━━━━━━━━
  【改善ポイント】
  ━━━━━━━━━━━━━━━━━━━━
  
  応募を増やすために、
  改善効果が高い順に3個程度作成してください。
  
  priority：
  1が最優先
  
  title：
  改善ポイントのタイトル
  
  reason：
  なぜ改善した方がよいのか
  
  recommendation：
  具体的にどう改善すればよいか
  
  ただし、すでに十分良い項目について
  無理に改善を提案する必要はありません。
  
  ━━━━━━━━━━━━━━━━━━━━
  【求人票】
  ━━━━━━━━━━━━━━━━━━━━
  
  以下の項目を作成してください。
  
  title：
  求人タイトル
  
  catchCopy：
  応募者の興味を引くキャッチコピー
  
  description：
  仕事内容
  
  requirements：
  応募資格・求める人物像
  
  salary：
  給与
  
  workingHours：
  勤務時間・休日・残業など
  
  location：
  勤務地
  
  employmentType：
  雇用形態
  
  benefits：
  待遇・福利厚生
  
  appealPoints：
  この求人の魅力
  
  ━━━━━━━━━━━━━━━━━━━━
  【重要】
  ━━━━━━━━━━━━━━━━━━━━
  
  必ずJSONだけを返してください。
  
  Markdownのコードブロックは使用しないでください。
  
  JSON以外の文章を絶対に出力しないでください。
  
  以下の形式を厳守してください。
  
  {
    "nearestStations": [
      {
        "stationName": "駅名",
        "lineName": "路線名",
        "estimatedDistance": "約○m"
      }
    ],
    "score": {
      "total": 0,
      "salary": 0,
      "workConditions": 0,
      "benefits": 0,
      "accessibility": 0,
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
  `;

    /* =========================
         OpenAI API
      ========================= */

    console.log("OpenAI APIを呼び出します");

    const response = await openai.responses.create({
      model: "gpt-5-mini",
      input: prompt,
    });

    const output = response.output_text;

    console.log("========================================");
    console.log("AI response:");
    console.log(output);
    console.log("========================================");

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
         安全なデータ整形
      ========================= */

    const safeScore = {
      total: Number(parsed?.score?.total) || 0,
      salary: Number(parsed?.score?.salary) || 0,
      workConditions: Number(parsed?.score?.workConditions) || 0,
      benefits: Number(parsed?.score?.benefits) || 0,
      accessibility: Number(parsed?.score?.accessibility) || 0,
      appeal: Number(parsed?.score?.appeal) || 0,
    };

    const safeNearestStations = Array.isArray(parsed?.nearestStations)
      ? parsed.nearestStations.map((station: any) => ({
          stationName: station?.stationName || "",
          lineName: station?.lineName || "",
          estimatedDistance: station?.estimatedDistance || "",
        }))
      : [];

    const safeMarketSummary = Array.isArray(parsed?.marketSummary)
      ? parsed.marketSummary.filter(
          (item: unknown) => typeof item === "string" && item.trim() !== ""
        )
      : [];

    const safeImprovementPoints = Array.isArray(parsed?.improvementPoints)
      ? parsed.improvementPoints.map((point: any, index: number) => ({
          priority: Number(point?.priority) || index + 1,
          title: point?.title || "",
          reason: point?.reason || "",
          recommendation: point?.recommendation || "",
        }))
      : [];

    const safeJob = {
      title: parsed?.job?.title || "",

      catchCopy: parsed?.job?.catchCopy || "",

      description: parsed?.job?.description || "",

      requirements: parsed?.job?.requirements || "",

      salary: parsed?.job?.salary || "",

      workingHours: parsed?.job?.workingHours || "",

      location: parsed?.job?.location || "",

      employmentType: parsed?.job?.employmentType || "",

      benefits: parsed?.job?.benefits || "",

      appealPoints: parsed?.job?.appealPoints || "",
    };

    /* =========================
         最終レスポンス
      ========================= */

    const result = {
      success: true,
      nearestStations: safeNearestStations,
      score: safeScore,
      marketSummary: safeMarketSummary,
      improvementPoints: safeImprovementPoints,
      job: safeJob,
    };

    console.log("========================================");
    console.log("求人生成完了");
    console.log("レスポンス:", result);
    console.log("========================================");

    return res.status(200).json(result);
  } catch (error) {
    console.error("========================================");
    console.error("求人生成エラー");
    console.error(error);
    console.error("========================================");

    const message =
      error instanceof Error ? error.message : "AIによる求人生成に失敗しました";

    return res.status(500).json({
      success: false,
      message,
    });
  }
}
