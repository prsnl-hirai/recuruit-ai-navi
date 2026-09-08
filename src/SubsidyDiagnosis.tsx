import { useMemo, useState } from "react";

type YesNo = "" | "yes" | "no";

type FormState = {
  industry: string;
  employeeCount: string;
  capital: string;
  hasEmployees: YesNo;
  plansHiring: YesNo;
  hasNonRegular: YesNo;
  plansRegularization: YesNo;
  plansTraining: YesNo;
  plansWageIncrease: YesNo;
  plansWorkplaceImprovement: YesNo;
  plansChildcareSupport: YesNo;
  plansTelework: YesNo;
  plansForeignWorkerSupport: YesNo;
  plansTrialHiring: YesNo;
  targetHiring: string[];
  constructionYoungWomen: YesNo;
  constructionTraining: YesNo;
  constructionCCUS: YesNo;
};

type Candidate = {
  id: string;
  name: string;
  course?: string;
  score: number;
  reasons: string[];
  checks: string[];
  officialUrl: string;
};

const initialForm: FormState = {
  industry: "",
  employeeCount: "",
  capital: "",
  hasEmployees: "",
  plansHiring: "",
  hasNonRegular: "",
  plansRegularization: "",
  plansTraining: "",
  plansWageIncrease: "",
  plansWorkplaceImprovement: "",
  plansChildcareSupport: "",
  plansTelework: "",
  plansForeignWorkerSupport: "",
  plansTrialHiring: "",
  targetHiring: [],
  constructionYoungWomen: "",
  constructionTraining: "",
  constructionCCUS: "",
};

const industries = [
  "飲食店",
  "美容",
  "小売",
  "ホテル・宿泊",
  "介護",
  "医療",
  "建設",
  "IT",
  "製造",
  "運輸",
  "その他",
];

const employeeCounts = [
  "0人",
  "1〜5人",
  "6〜20人",
  "21〜50人",
  "51〜100人",
  "101〜300人",
  "301人以上",
];
const capitals = [
  "個人事業主",
  "1,000万円以下",
  "5,000万円以下",
  "1億円以下",
  "3億円以下",
  "3億円超",
  "わからない",
];

const targetOptions = [
  "高齢者",
  "障害者",
  "ひとり親",
  "就職が困難な方",
  "35歳未満の若年者",
  "女性",
];

const official = {
  all: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/kyufukin/index_00057.html",
  target:
    "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/kyufukin/index_00058.html",
  action:
    "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/kyufukin/index_00059.html",
  construction:
    "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/kensetsu-kouwan/kensetsu-kaizen.html",
};

function OptionButton({
  selected,
  children,
  onClick,
}: {
  selected: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "10px 12px",
        border: selected ? "2px solid #06c755" : "1px solid #d1d5db",
        borderRadius: "10px",
        background: selected ? "#ecfdf3" : "#fff",
        color: selected ? "#047857" : "#374151",
        fontSize: "13px",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Question({
  title,
  children,
  required,
}: {
  title: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <section
      style={{
        marginBottom: "14px",
        padding: "16px",
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
      }}
    >
      <div style={{ fontSize: "14px", fontWeight: 800, color: "#111827" }}>
        {title}
        {required && (
          <span
            style={{ marginLeft: "6px", color: "#dc2626", fontSize: "11px" }}
          >
            必須
          </span>
        )}
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          marginTop: "10px",
        }}
      >
        {children}
      </div>
    </section>
  );
}

function yesNoButtons(value: YesNo, onChange: (value: YesNo) => void) {
  return (
    <>
      <OptionButton selected={value === "yes"} onClick={() => onChange("yes")}>
        はい
      </OptionButton>
      <OptionButton selected={value === "no"} onClick={() => onChange("no")}>
        いいえ
      </OptionButton>
    </>
  );
}

export default function SubsidyDiagnosis({ onBack }: { onBack?: () => void }) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [showResult, setShowResult] = useState(false);

  const setValue = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setShowResult(false);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleTarget = (value: string) => {
    setShowResult(false);
    setForm((prev) => ({
      ...prev,
      targetHiring: prev.targetHiring.includes(value)
        ? prev.targetHiring.filter((item) => item !== value)
        : [...prev.targetHiring, value],
    }));
  };

  const candidates = useMemo<Candidate[]>(() => {
    const list: Candidate[] = [];

    const push = (candidate: Candidate) => {
      if (candidate.score >= 35) {
        list.push({ ...candidate, score: Math.min(candidate.score, 95) });
      }
    };

    let score = 20;
    const reasons: string[] = [];
    const checks: string[] = [
      "対象労働者・事業主の要件",
      "雇用保険の適用状況",
      "申請前後の手続期限",
    ];
    if (form.hasNonRegular === "yes") {
      score += 25;
      reasons.push("非正規雇用の従業員がいる");
    }
    if (form.plansRegularization === "yes") {
      score += 40;
      reasons.push("正社員化を予定している");
    }
    if (form.plansWageIncrease === "yes") {
      score += 15;
      reasons.push("賃金改善を予定している");
    }
    push({
      id: "career-up",
      name: "キャリアアップ助成金",
      course: "正社員化・処遇改善に関するコース等",
      score,
      reasons,
      checks: [...checks, "就業規則・転換制度", "転換前後の賃金・雇用条件"],
      officialUrl: official.all,
    });

    score = 15;
    const trialReasons: string[] = [];
    if (form.plansHiring === "yes") {
      score += 30;
      trialReasons.push("新規採用を予定している");
    }
    if (form.plansTrialHiring === "yes") {
      score += 45;
      trialReasons.push("トライアル雇用を検討している");
    }
    if (
      form.industry === "建設" &&
      (form.targetHiring.includes("35歳未満の若年者") ||
        form.targetHiring.includes("女性"))
    ) {
      score += 10;
      trialReasons.push("建設分野で若年者・女性の採用を検討している");
    }
    push({
      id: "trial",
      name: "トライアル雇用助成金",
      course:
        form.industry === "建設"
          ? "一般トライアル／若年・女性建設労働者トライアル等"
          : "一般トライアルコース等",
      score,
      reasons: trialReasons,
      checks: [
        "対象となる求職者の要件",
        "ハローワーク等の紹介要件",
        "試行雇用期間・実施計画",
      ],
      officialUrl: official.all,
    });

    score = 15;
    const targetReasons: string[] = [];
    if (form.plansHiring === "yes") {
      score += 20;
      targetReasons.push("採用予定がある");
    }
    if (
      form.targetHiring.some((x) =>
        ["高齢者", "障害者", "ひとり親", "就職が困難な方"].includes(x),
      )
    ) {
      score += 55;
      targetReasons.push("対象となり得る求職者層の採用を検討している");
    }
    push({
      id: "special-hire",
      name: "特定求職者雇用開発助成金",
      score,
      reasons: targetReasons,
      checks: ["対象労働者の区分", "職業紹介経路", "継続雇用の見込み"],
      officialUrl: official.target,
    });

    score = 15;
    const trainingReasons: string[] = [];
    if (form.hasEmployees === "yes") {
      score += 15;
      trainingReasons.push("従業員を雇用している");
    }
    if (form.plansTraining === "yes") {
      score += 60;
      trainingReasons.push("従業員への研修・訓練を予定している");
    }
    if (form.industry === "IT") {
      score += 10;
      trainingReasons.push(
        "IT・デジタル人材育成と相性のあるコースを確認できる",
      );
    }
    if (form.industry === "建設" && form.constructionTraining === "yes") {
      score += 15;
      trainingReasons.push("建設労働者への技能実習・訓練を予定している");
    }
    push({
      id: "human-dev",
      name: "人材開発支援助成金",
      course:
        form.industry === "建設"
          ? "人材育成支援／建設労働者技能実習・認定訓練等"
          : form.industry === "IT"
            ? "人材育成支援／人への投資促進／リスキリング等"
            : "人材育成支援／人への投資促進／リスキリング等",
      score,
      reasons: trainingReasons,
      checks: [
        "訓練内容・時間数",
        "訓練開始前の計画届等",
        "対象経費・賃金助成の要件",
      ],
      officialUrl:
        form.industry === "建設" ? official.construction : official.all,
    });

    score = 15;
    const retentionReasons: string[] = [];
    if (form.plansWorkplaceImprovement === "yes") {
      score += 50;
      retentionReasons.push("雇用管理・職場環境の改善を予定している");
    }
    if (form.plansForeignWorkerSupport === "yes") {
      score += 35;
      retentionReasons.push("外国人労働者の就労環境整備を予定している");
    }
    if (form.plansTelework === "yes") {
      score += 30;
      retentionReasons.push("テレワーク導入・改善を予定している");
    }
    push({
      id: "retention",
      name: "人材確保等支援助成金",
      course:
        "雇用管理制度・雇用環境整備／外国人労働者就労環境整備／テレワーク等",
      score,
      reasons: retentionReasons,
      checks: [
        "対象となる制度・設備",
        "計画認定・実施期間",
        "離職率等の要件があるコースの確認",
      ],
      officialUrl: official.action,
    });

    score = 15;
    const familyReasons: string[] = [];
    if (form.plansChildcareSupport === "yes") {
      score += 70;
      familyReasons.push("育児・介護等と仕事の両立支援を予定している");
    }
    push({
      id: "family",
      name: "両立支援等助成金",
      score,
      reasons: familyReasons,
      checks: [
        "就業規則・両立支援制度",
        "対象労働者の取得・復帰状況",
        "コースごとの実施要件",
      ],
      officialUrl: official.all,
    });

    score = 10;
    const seniorReasons: string[] = [];
    if (form.targetHiring.includes("高齢者")) {
      score += 45;
      seniorReasons.push("高齢者の採用を検討している");
    }
    if (form.plansWorkplaceImprovement === "yes") {
      score += 20;
      seniorReasons.push("継続雇用・雇用管理の改善を検討している");
    }
    push({
      id: "senior",
      name: "65歳超雇用推進助成金",
      score,
      reasons: seniorReasons,
      checks: [
        "定年・継続雇用制度",
        "対象労働者の雇用状況",
        "コース別の年齢・制度要件",
      ],
      officialUrl: official.all,
    });

    if (form.industry === "建設") {
      score = 20;
      const constructionReasons: string[] = ["業種が建設業"];
      if (form.constructionYoungWomen === "yes") {
        score += 55;
        constructionReasons.push("若年者・女性の入職・定着施策を予定している");
      }
      if (
        form.targetHiring.includes("35歳未満の若年者") ||
        form.targetHiring.includes("女性")
      ) {
        score += 15;
        constructionReasons.push("若年者・女性の採用を検討している");
      }
      push({
        id: "construction-attract",
        name: "人材確保等支援助成金",
        course: "若年者及び女性に魅力ある職場づくり事業コース（建設分野）",
        score,
        reasons: constructionReasons,
        checks: [
          "建設事業主等の対象要件",
          "対象となる取組内容",
          "実施計画・申請時期",
        ],
        officialUrl: official.construction,
      });

      score = 20;
      const ccusReasons: string[] = ["業種が建設業"];
      if (form.constructionCCUS === "yes") {
        score += 65;
        ccusReasons.push("CCUSを活用した雇用管理改善を予定している");
      }
      push({
        id: "construction-ccus",
        name: "人材確保等支援助成金",
        course: "建設キャリアアップシステム等活用促進コース",
        score,
        reasons: ccusReasons,
        checks: [
          "中小建設事業主等の対象区分",
          "CCUS活用内容",
          "助成対象経費・取組期間",
        ],
        officialUrl: official.construction,
      });
    }

    return list.sort((a, b) => b.score - a.score).slice(0, 6);
  }, [form]);

  const canDiagnose =
    !!form.industry &&
    !!form.employeeCount &&
    !!form.capital &&
    !!form.hasEmployees &&
    !!form.plansHiring;

  const reset = () => {
    setForm(initialForm);
    setShowResult(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (showResult) {
    return (
      <div style={{ minHeight: "100vh", background: "#f6f7f9" }}>
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            background: "#fff",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              maxWidth: "700px",
              margin: "0 auto",
              padding: "14px 12px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <button
              type="button"
              onClick={() => setShowResult(false)}
              style={{
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                background: "#fff",
                padding: "8px 10px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ← 戻る
            </button>
            <div>
              <div style={{ fontSize: "18px", fontWeight: 800 }}>
                💰 助成金診断結果
              </div>
              <div
                style={{ marginTop: "2px", color: "#6b7280", fontSize: "11px" }}
              >
                利用できる可能性がある制度を表示しています
              </div>
            </div>
          </div>
        </header>

        <main
          style={{
            maxWidth: "700px",
            margin: "0 auto",
            padding: "18px 12px 60px",
          }}
        >
          <div
            style={{
              marginBottom: "14px",
              padding: "14px",
              borderRadius: "12px",
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              color: "#9a3412",
              fontSize: "12px",
              lineHeight: 1.7,
            }}
          >
            この結果は簡易診断です。「利用可能性」は支給を保証するものではありません。申請前に必ず最新の厚生労働省資料・支給要領・申請窓口で確認してください。
          </div>

          {candidates.length === 0 ? (
            <div
              style={{
                padding: "30px 18px",
                background: "#fff",
                borderRadius: "12px",
                textAlign: "center",
              }}
            >
              現在の回答では、候補を絞り込めませんでした。
              <br />
              回答内容を変更して再診断してください。
            </div>
          ) : (
            candidates.map((item, index) => (
              <article
                key={item.id}
                style={{
                  marginBottom: "14px",
                  padding: "18px",
                  background: "#fff",
                  border:
                    index === 0 ? "2px solid #06c755" : "1px solid #e5e7eb",
                  borderRadius: "14px",
                }}
              >
                {index === 0 && (
                  <div
                    style={{
                      display: "inline-block",
                      marginBottom: "8px",
                      padding: "4px 8px",
                      borderRadius: "999px",
                      background: "#06c755",
                      color: "#fff",
                      fontSize: "11px",
                      fontWeight: 800,
                    }}
                  >
                    最有力候補
                  </div>
                )}

                <div
                  style={{
                    fontSize: "17px",
                    fontWeight: 800,
                    color: "#111827",
                  }}
                >
                  {item.name}
                </div>
                {item.course && (
                  <div
                    style={{
                      marginTop: "4px",
                      color: "#374151",
                      fontSize: "13px",
                      fontWeight: 700,
                    }}
                  >
                    {item.course}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                    marginTop: "12px",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    background:
                      item.score >= 75
                        ? "#ecfdf3"
                        : item.score >= 55
                          ? "#eff6ff"
                          : "#f9fafb",
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: 700 }}>
                    利用可能性
                  </span>
                  <strong
                    style={{
                      fontSize: "20px",
                      color: item.score >= 75 ? "#047857" : "#1f2937",
                    }}
                  >
                    {item.score}%
                  </strong>
                </div>

                {item.reasons.length > 0 && (
                  <div style={{ marginTop: "14px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 800 }}>
                      候補になる理由
                    </div>
                    <div
                      style={{
                        marginTop: "6px",
                        display: "grid",
                        gap: "5px",
                        fontSize: "12px",
                        color: "#374151",
                      }}
                    >
                      {item.reasons.map((reason) => (
                        <div key={reason}>✓ {reason}</div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: "14px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 800 }}>
                    申請前に確認すること
                  </div>
                  <div
                    style={{
                      marginTop: "6px",
                      display: "grid",
                      gap: "5px",
                      fontSize: "12px",
                      color: "#6b7280",
                    }}
                  >
                    {item.checks.map((check) => (
                      <div key={check}>・{check}</div>
                    ))}
                  </div>
                </div>

                <a
                  href={item.officialUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "block",
                    marginTop: "14px",
                    padding: "10px",
                    borderRadius: "8px",
                    background: "#f3f4f6",
                    color: "#2563eb",
                    textAlign: "center",
                    textDecoration: "none",
                    fontSize: "12px",
                    fontWeight: 800,
                  }}
                >
                  厚生労働省の公式情報を確認 →
                </a>
              </article>
            ))
          )}

          <button
            type="button"
            onClick={reset}
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #d1d5db",
              borderRadius: "10px",
              background: "#fff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            もう一度診断する
          </button>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f6f7f9" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            maxWidth: "700px",
            margin: "0 auto",
            padding: "14px 12px",
            position: "relative",
            textAlign: "center",
          }}
        >
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                background: "#fff",
                padding: "7px 9px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ← 戻る
            </button>
          )}
          <div style={{ fontSize: "19px", fontWeight: 800 }}>
            💰 助成金かんたん診断
          </div>
          <div style={{ marginTop: "3px", color: "#6b7280", fontSize: "11px" }}>
            業種や雇用状況に合わせて質問が変わります
          </div>
        </div>
      </header>

      <main
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          padding: "18px 12px 70px",
        }}
      >
        <div
          style={{
            marginBottom: "14px",
            padding: "14px",
            borderRadius: "12px",
            background: "#ecfdf3",
            border: "1px solid #bbf7d0",
            color: "#065f46",
            fontSize: "12px",
            lineHeight: 1.7,
          }}
        >
          約1分で診断できます。まず会社の状況を教えてください。
        </div>

        <Question title="業種は？" required>
          {industries.map((item) => (
            <OptionButton
              key={item}
              selected={form.industry === item}
              onClick={() => setValue("industry", item)}
            >
              {item}
            </OptionButton>
          ))}
        </Question>

        <Question title="従業員数は？" required>
          {employeeCounts.map((item) => (
            <OptionButton
              key={item}
              selected={form.employeeCount === item}
              onClick={() => setValue("employeeCount", item)}
            >
              {item}
            </OptionButton>
          ))}
        </Question>

        <Question title="資本金は？" required>
          {capitals.map((item) => (
            <OptionButton
              key={item}
              selected={form.capital === item}
              onClick={() => setValue("capital", item)}
            >
              {item}
            </OptionButton>
          ))}
        </Question>

        <Question title="現在、従業員を雇用していますか？" required>
          {yesNoButtons(form.hasEmployees, (value) =>
            setValue("hasEmployees", value),
          )}
        </Question>

        <Question title="今後、新しく人を採用する予定がありますか？" required>
          {yesNoButtons(form.plansHiring, (value) =>
            setValue("plansHiring", value),
          )}
        </Question>

        {form.hasEmployees === "yes" && (
          <>
            <Question title="パート・契約社員などの非正規雇用者がいますか？">
              {yesNoButtons(form.hasNonRegular, (value) =>
                setValue("hasNonRegular", value),
              )}
            </Question>

            {form.hasNonRegular === "yes" && (
              <Question title="非正規雇用者を正社員にする予定がありますか？">
                {yesNoButtons(form.plansRegularization, (value) =>
                  setValue("plansRegularization", value),
                )}
              </Question>
            )}

            <Question title="従業員に研修・職業訓練を受けさせる予定がありますか？">
              {yesNoButtons(form.plansTraining, (value) =>
                setValue("plansTraining", value),
              )}
            </Question>

            <Question title="賃金の引き上げや処遇改善を予定していますか？">
              {yesNoButtons(form.plansWageIncrease, (value) =>
                setValue("plansWageIncrease", value),
              )}
            </Question>

            <Question title="雇用管理や職場環境を改善する予定がありますか？">
              {yesNoButtons(form.plansWorkplaceImprovement, (value) =>
                setValue("plansWorkplaceImprovement", value),
              )}
            </Question>

            <Question title="育児・介護と仕事を両立しやすい制度を整える予定がありますか？">
              {yesNoButtons(form.plansChildcareSupport, (value) =>
                setValue("plansChildcareSupport", value),
              )}
            </Question>

            {(form.industry === "IT" ||
              form.industry === "その他" ||
              form.industry === "製造") && (
              <Question title="テレワークの導入・改善を予定していますか？">
                {yesNoButtons(form.plansTelework, (value) =>
                  setValue("plansTelework", value),
                )}
              </Question>
            )}

            <Question title="外国人労働者の就労環境整備を予定していますか？">
              {yesNoButtons(form.plansForeignWorkerSupport, (value) =>
                setValue("plansForeignWorkerSupport", value),
              )}
            </Question>
          </>
        )}

        {form.plansHiring === "yes" && (
          <>
            <Question title="トライアル雇用を検討していますか？">
              {yesNoButtons(form.plansTrialHiring, (value) =>
                setValue("plansTrialHiring", value),
              )}
            </Question>

            <Question title="採用予定者に当てはまるものはありますか？（複数選択）">
              {targetOptions.map((item) => (
                <OptionButton
                  key={item}
                  selected={form.targetHiring.includes(item)}
                  onClick={() => toggleTarget(item)}
                >
                  {item}
                </OptionButton>
              ))}
            </Question>
          </>
        )}

        {form.industry === "建設" && (
          <div
            style={{
              marginBottom: "14px",
              padding: "4px 0 0",
            }}
          >
            <div
              style={{
                marginBottom: "10px",
                padding: "10px 12px",
                borderRadius: "10px",
                background: "#eff6ff",
                color: "#1d4ed8",
                fontSize: "13px",
                fontWeight: 800,
              }}
            >
              🏗 建設業向け追加診断
            </div>

            <Question title="若年者・女性が働きやすい職場づくりを予定していますか？">
              {yesNoButtons(form.constructionYoungWomen, (value) =>
                setValue("constructionYoungWomen", value),
              )}
            </Question>

            <Question title="建設労働者に技能実習・認定訓練を受講させる予定がありますか？">
              {yesNoButtons(form.constructionTraining, (value) =>
                setValue("constructionTraining", value),
              )}
            </Question>

            <Question title="建設キャリアアップシステム（CCUS）を活用した雇用管理改善を予定していますか？">
              {yesNoButtons(form.constructionCCUS, (value) =>
                setValue("constructionCCUS", value),
              )}
            </Question>
          </div>
        )}

        <button
          type="button"
          disabled={!canDiagnose}
          onClick={() => {
            setShowResult(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          style={{
            width: "100%",
            padding: "14px",
            border: "none",
            borderRadius: "12px",
            background: canDiagnose ? "#06c755" : "#d1d5db",
            color: "#fff",
            fontSize: "15px",
            fontWeight: 800,
            cursor: canDiagnose ? "pointer" : "not-allowed",
          }}
        >
          🔍 助成金を診断する
        </button>

        {!canDiagnose && (
          <div
            style={{
              marginTop: "8px",
              color: "#6b7280",
              fontSize: "11px",
              textAlign: "center",
            }}
          >
            必須項目を入力すると診断できます
          </div>
        )}
      </main>
    </div>
  );
}
