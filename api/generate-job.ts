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

    if (!job.postalCode?.trim()) {
      return res.status(400).json({
        success: false,
        message: "郵便番号が入力されていません",
      });
    }

    if (!job.prefecture?.trim()) {
      return res.status(400).json({
        success: false,
        message: "都道府県が入力されていません",
      });
    }

    if (!job.city?.trim()) {
      return res.status(400).json({
        success: false,
        message: "市町村が入力されていません",
      });
    }

    if (!job.streetAddress?.trim()) {
      return res.status(400).json({
        success: false,
        message: "町名・番地が入力されていません",
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

    const targetAudience = Array.isArray(job.targetAudience)
      ? job.targetAudience
      : [];

    const appealPriorities = Array.isArray(job.appealPriorities)
      ? job.appealPriorities
      : [];

    const appealPoints = Array.isArray(job.appealPoints)
      ? job.appealPoints
      : [];

    /* =========================
         AIへの入力情報
      ========================= */

    const prompt = `
  あなたは日本の求人広告・採用マーケティングに精通した、
  プロの求人コピーライター兼採用アドバイザーです。

  入力された求人情報をもとに、
  「情報を並べただけの求人」ではなく、
  指定された採用ターゲットが「ここなら働いてみたい」と感じ、
  応募につながる求人原稿を作成してください。
  
  「求人AIナビ」のユーザーが入力・選択した求人情報をもとに、
  
  1. 応募者にとって分かりやすい求人票を作成する
  2. 採用ターゲットに刺さる訴求内容を考える
  3. 地域・職種・雇用形態を踏まえた求人市場の傾向を整理する
  4. 応募を増やすための実践的な採用アドバイスを提案する
  
  という4つを行ってください。

  求人を点数化・採点・ランク付けしてはいけません。
  
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
  最寄り駅がある場合は、他の徒歩10分以上の駅は記載しないでください。
  
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

  採用したいターゲット層：
  ${targetAudience.length > 0 ? targetAudience.join("、") : "特に指定なし"}

  特に訴求したいポイント：
  ${appealPriorities.length > 0 ? appealPriorities.join("、") : "特に指定なし"}
  
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
  ・求人を点数化、採点、ランク付けしない
  ・採用ターゲットが指定されている場合、その層が重視しやすい条件を優先して訴求する
  ・ただし年齢・性別・国籍などによる不適切な応募制限につながる表現は作らない
  ・市場分析では、勤務地の地域、職種、雇用形態、給与形態を考慮する
  ・市場分析で存在しない具体的な統計値、求人件数、平均給与を作らない
  ・外部のリアルタイム求人データを参照しているかのような表現をしない
  ・給与相場はAIが持つ一般的な知識をもとにした「目安」として扱い、断定しない
  ・給与については現在の給与と比較し、応募を集めやすくするために検討できる目安レンジを提示する
  ・給与以外にも、シフト、勤務日数、福利厚生、応募条件、仕事内容の見せ方など、追加すると効果が期待できる条件を提案する
  ・提案内容は「変更すべき」と断定せず、「検討するとよい」「応募を集めやすくなる可能性がある」などアドバイスとして表現する
  ・入力されていない待遇や制度を、現在すでに存在する条件として求人票へ追加してはいけない
  
  ━━━━━━━━━━━━━━━━━━━━
  【ターゲット分析と文章設計】
  ━━━━━━━━━━━━━━━━━━━━

  求人原稿を作る前に、指定された採用ターゲットごとに内部的に次を整理してください。

  1. 仕事を探す際に重視しやすいポイント
  2. 応募前に不安に感じやすいポイント
  3. この求人情報の中でターゲットに最も響く事実
  4. 応募をためらう可能性がある要素
  5. どの情報を冒頭で伝えると応募意欲が高まりやすいか

  求人情報をすべて同じ強さで紹介するのではなく、
  ターゲットにとって重要度の高い情報から優先して伝えてください。

  ターゲットが複数指定されている場合は、全員に同じ訴求をするのではなく、
  それぞれに響くメリットを整理して文章へ自然に組み込んでください。

  ターゲット別の考え方の例：
  ・学生：授業との両立、シフト、未経験、同世代、働きやすさ
  ・主婦・主夫：家庭との両立、勤務時間、短時間、予定との調整しやすさ
  ・フリーター：収入、勤務日数、安定して働けるか、社員登用
  ・未経験者：仕事内容の分かりやすさ、研修・サポート、始めやすさ
  ・経験者：経験を活かせる業務、待遇、裁量、キャリア
  ・Wワーク：シフト調整、勤務時間、曜日、短時間勤務
  ・シニア：業務内容の分かりやすさ、勤務時間、負担、経験を活かせる点

  ただし、入力情報に存在しないメリットを推測して求人原稿へ記載してはいけません。
  存在しない条件は「追加を検討できる条件」として採用アドバイスにのみ記載してください。

  【キャッチコピーの作り方】
  ・「未経験歓迎！スタッフ募集！」のような一般的な表現だけで終わらせない
  ・ターゲットが魅力に感じる具体的な条件・メリットを1〜2個入れる
  ・求人一覧で続きを読みたくなる文章にする
  ・可能であれば、時給、週○日、1日○時間など、実際に入力されている数字を優先する
  ・入力されていない条件や数字は作らない

  悪い例：働きやすい職場です！
  良い例：週2日・1日4h〜｜授業終わりから働けるホールスタッフ
  ※良い例の条件は、実際の入力情報に存在する場合のみ使用してください。

  【仕事内容の書き方】
  ・応募者が実際に働く姿を想像できるよう、具体的かつ分かりやすく説明する
  ・専門用語を必要以上に使わない
  ・未経験者がターゲットの場合は「自分にもできそう」と感じられる説明を優先する

  【応募への不安を減らす】
  入力情報の中に、未経験OK、研修あり、シフト相談可能、交通費支給、駅から近い、短時間勤務可能など
  不安解消につながる事実があれば積極的に使用してください。
  ただし、存在しない情報を補完してはいけません。

  ━━━━━━━━━━━━━━━━━━━━
  【採用アドバイス】
  ━━━━━━━━━━━━━━━━━━━━
  
  求人を採点するのではなく、応募を増やすために検討できる内容をアドバイスしてください。

  salaryAdvice：
  ・勤務地の地域、職種、雇用形態、給与形態を考慮する
  ・現在の給与を明記する
  ・応募を集めやすくするために検討できる給与レンジを「目安」として提示する
  ・なぜその水準を検討するとよいかを簡潔に説明する
  ・確かな相場を判断できない場合は無理に具体的な金額を作らず、その旨を明記する

  conditionSuggestions：
  ・現在入力されていない条件の中から、追加を検討すると応募につながりやすそうなものを最大5件提案する
  ・例：シフト相談、短時間勤務、交通費、研修、まかない、社員登用など
  ・ただし「現在ある」とは書かず、必ず追加・変更の提案として扱う
  ・選択されたターゲット層がいる場合は、そのターゲットへの効果も説明する

  contentAdvice：
  ・条件変更をしなくても改善できる求人文章・見せ方のアドバイスを最大3件提案する
  ・仕事内容の具体化、1日の流れ、職場の雰囲気、未経験者への説明などを検討する

  marketSummary：
  ・この地域・職種で応募者が比較しやすいポイントを最大3件にまとめる
  ・リアルタイムデータや具体的な統計を確認しているかのような断定は禁止

  targetAdvice：
  ・指定された採用ターゲットごとに、刺さりやすい訴求ポイントを整理する
  ・求人情報に存在する事実だけを求人原稿へ反映する
  ・存在しない条件は「追加を検討できる条件」としてのみ提案する

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
    "marketSummary": [
      "市場傾向1",
      "市場傾向2",
      "市場傾向3"
    ],
    "targetAnalysis": [
      {
        "target": "ターゲット層",
        "keyNeeds": ["重視しやすいポイント"],
        "effectiveAppeals": ["この求人で刺さりやすい事実"],
        "concerns": ["応募前に不安になりやすい点"],
        "recommendedMessage": "求人で優先して伝えるメッセージ"
      }
    ],
    "catchCopyCandidates": [
      "キャッチコピー案1",
      "キャッチコピー案2",
      "キャッチコピー案3"
    ],
    "advice": {
      "salaryAdvice": {
        "currentSalary": "現在の給与",
        "suggestedRange": "応募を集めやすくするために検討できる給与目安",
        "reason": "理由",
        "note": "相場は目安であることなどの注意事項"
      },
      "conditionSuggestions": [
        {
          "title": "追加を検討できる条件",
          "reason": "期待できる効果",
          "target": "特に効果が期待できるターゲット層"
        }
      ],
      "contentAdvice": [
        {
          "title": "文章・見せ方の改善案",
          "recommendation": "具体的な提案"
        }
      ],
      "targetAdvice": [
        {
          "target": "ターゲット層",
          "effectiveAppeals": ["刺さりやすい訴求ポイント"],
          "message": "求人で優先して伝える内容"
        }
      ]
    },
    "job": {
      "title": "求人タイトル",
      "catchCopy": "キャッチコピー",
      "description": "仕事内容",
      "requirements": "応募資格・求める人物像",
      "salary": "給与",
      "workingHours": "勤務時間",
      "location": "勤務地",
      "employmentType": "雇用形態",
      "benefits": ["待遇・福利厚生"],
      "appealPoints": ["この求人の魅力"]
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

    const safeNearestStations = Array.isArray(parsed?.nearestStations)
      ? parsed.nearestStations.map((station: any) => ({
          stationName: station?.stationName || "",
          lineName: station?.lineName || "",
          estimatedDistance: station?.estimatedDistance || "",
        }))
      : [];

    const safeMarketSummary = Array.isArray(parsed?.marketSummary)
      ? parsed.marketSummary.filter(
          (item: unknown) => typeof item === "string" && item.trim() !== "",
        )
      : [];

    const safeTargetAnalysis = Array.isArray(parsed?.targetAnalysis)
      ? parsed.targetAnalysis.map((item: any) => ({
          target: item?.target || "",
          keyNeeds: Array.isArray(item?.keyNeeds) ? item.keyNeeds : [],
          effectiveAppeals: Array.isArray(item?.effectiveAppeals)
            ? item.effectiveAppeals
            : [],
          concerns: Array.isArray(item?.concerns) ? item.concerns : [],
          recommendedMessage: item?.recommendedMessage || "",
        }))
      : [];

    const safeCatchCopyCandidates = Array.isArray(parsed?.catchCopyCandidates)
      ? parsed.catchCopyCandidates.filter(
          (item: unknown) => typeof item === "string" && item.trim() !== "",
        )
      : [];

    const safeAdvice = {
      salaryAdvice: {
        currentSalary: parsed?.advice?.salaryAdvice?.currentSalary || "",
        suggestedRange: parsed?.advice?.salaryAdvice?.suggestedRange || "",
        reason: parsed?.advice?.salaryAdvice?.reason || "",
        note: parsed?.advice?.salaryAdvice?.note || "",
      },
      conditionSuggestions: Array.isArray(parsed?.advice?.conditionSuggestions)
        ? parsed.advice.conditionSuggestions.map((item: any) => ({
            title: item?.title || "",
            reason: item?.reason || "",
            target: item?.target || "",
          }))
        : [],
      contentAdvice: Array.isArray(parsed?.advice?.contentAdvice)
        ? parsed.advice.contentAdvice.map((item: any) => ({
            title: item?.title || "",
            recommendation: item?.recommendation || "",
          }))
        : [],
      targetAdvice: Array.isArray(parsed?.advice?.targetAdvice)
        ? parsed.advice.targetAdvice.map((item: any) => ({
            target: item?.target || "",
            effectiveAppeals: Array.isArray(item?.effectiveAppeals)
              ? item.effectiveAppeals
              : [],
            message: item?.message || "",
          }))
        : [],
    };

    const safeJob = {
      title: parsed?.job?.title || "",

      catchCopy: parsed?.job?.catchCopy || "",

      description: parsed?.job?.description || "",

      requirements: parsed?.job?.requirements || "",

      salary: parsed?.job?.salary || "",

      workingHours: parsed?.job?.workingHours || "",

      location: parsed?.job?.location || "",

      employmentType: parsed?.job?.employmentType || "",

      benefits: Array.isArray(parsed?.job?.benefits)
        ? parsed.job.benefits
        : parsed?.job?.benefits
          ? [parsed.job.benefits]
          : [],

      appealPoints: Array.isArray(parsed?.job?.appealPoints)
        ? parsed.job.appealPoints
        : parsed?.job?.appealPoints
          ? [parsed.job.appealPoints]
          : [],
    };

    /* =========================
         最終レスポンス
      ========================= */

    const result = {
      success: true,
      nearestStations: safeNearestStations,
      marketSummary: safeMarketSummary,
      targetAnalysis: safeTargetAnalysis,
      catchCopyCandidates: safeCatchCopyCandidates,
      advice: safeAdvice,
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
