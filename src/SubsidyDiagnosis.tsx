import { useEffect, useMemo, useState } from "react";
import liff from "@line/liff";

type AnswerValue = string | string[];
type Answers = Record<string, AnswerValue>;

type Question = {
  id: number;
  question_key: string;
  question_text: string;
  question_type: "single" | "multi" | "number" | "yes_no_unknown" | string;
  industry: string | null;
  options: string[] | null;
  sort_order: number;
};

type Subsidy = {
  id: number;
  code: string;
  name: string;
  course_name: string | null;
  fiscal_year: number;
  category: string | null;
  description: string | null;
  official_url: string | null;
  application_authority: string | null;
  valid_from: string | null;
  valid_to: string | null;
};

type Condition = {
  id: number;
  subsidy_id: number;
  condition_key: string;
  operator: string;
  condition_value: string | null;
  weight: number;
  required: boolean;
  sort_order: number;
};

type AmountRule = {
  id: number;
  subsidy_id: number;
  fiscal_year: number;
  rule_key: string;
  amount_type: string;
  amount_display: string;
  min_amount_yen: number | null;
  max_amount_yen: number | null;
  rate_min: number | null;
  rate_max: number | null;
  unit: string | null;
  calculation_note: string | null;
  source_url: string | null;
};

type Candidate = {
  amountRule?: AmountRule;
  subsidy: Subsidy;
  score: number;
  matchLevel: "high" | "medium" | "low";
  reasons: string[];
  checks: string[];
};

type MasterResponse = {
  success: boolean;
  fiscalYear?: number;
  questions?: Question[];
  subsidies?: Subsidy[];
  conditions?: Condition[];
  amountRules?: AmountRule[];
  message?: string;
};

const FISCAL_YEAR = 2026;

function normalizeOptions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

function parseConditionArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function conditionMatches(
  condition: Condition,
  answer: AnswerValue | undefined,
): boolean {
  const expected = condition.condition_value ?? "";

  switch (condition.operator) {
    case "eq":
      return typeof answer === "string" && answer === expected;

    case "neq":
      return typeof answer === "string" && answer !== expected;

    case "in":
      return (
        typeof answer === "string" &&
        parseConditionArray(expected).includes(answer)
      );

    case "contains":
      return Array.isArray(answer) && answer.includes(expected);

    case "contains_any": {
      if (!Array.isArray(answer)) return false;
      const expectedValues = parseConditionArray(expected);
      return expectedValues.some((item) => answer.includes(item));
    }

    case "gte":
      return Number(answer) >= Number(expected);

    case "lte":
      return Number(answer) <= Number(expected);

    case "gt":
      return Number(answer) > Number(expected);

    case "lt":
      return Number(answer) < Number(expected);

    default:
      return false;
  }
}

function displayAnswer(answer: AnswerValue | undefined): string {
  if (Array.isArray(answer)) return answer.join("、");
  return answer || "";
}

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

function QuestionCard({
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

export default function SubsidyDiagnosis(_props: { onBack?: () => void }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subsidies, setSubsidies] = useState<Subsidy[]>([]);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [amountRules, setAmountRules] = useState<AmountRule[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [showConsultation, setShowConsultation] = useState(false);
  const [consultationSending, setConsultationSending] = useState(false);
  const [consultationDone, setConsultationDone] = useState(false);
  const [consultationError, setConsultationError] = useState("");
  const [selectedConsultationSubsidyIds, setSelectedConsultationSubsidyIds] =
    useState<number[]>([]);
  const [consultationForm, setConsultationForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    prefecture: "",
    message: "",
    consent: false,
  });

  useEffect(() => {
    const loadMaster = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/job-options", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "subsidy-master",
            fiscalYear: FISCAL_YEAR,
          }),
        });

        const data: MasterResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "助成金診断データを取得できませんでした",
          );
        }

        setQuestions(
          (data.questions ?? []).map((item) => ({
            ...item,
            id: Number(item.id),
            sort_order: Number(item.sort_order ?? 0),
            options: normalizeOptions(item.options),
          })),
        );
        setSubsidies(
          (data.subsidies ?? []).map((item) => ({
            ...item,
            id: Number(item.id),
            fiscal_year: Number(item.fiscal_year),
          })),
        );
        setConditions(
          (data.conditions ?? []).map((item) => ({
            ...item,
            id: Number(item.id),
            subsidy_id: Number(item.subsidy_id),
            weight: Number(item.weight ?? 0),
            required: Boolean(item.required),
            sort_order: Number(item.sort_order ?? 0),
          })),
        );
        setAmountRules(
          (data.amountRules ?? []).map((item) => ({
            ...item,
            id: Number(item.id),
            subsidy_id: Number(item.subsidy_id),
            fiscal_year: Number(item.fiscal_year),
            min_amount_yen:
              item.min_amount_yen == null ? null : Number(item.min_amount_yen),
            max_amount_yen:
              item.max_amount_yen == null ? null : Number(item.max_amount_yen),
            rate_min: item.rate_min == null ? null : Number(item.rate_min),
            rate_max: item.rate_max == null ? null : Number(item.rate_max),
          })),
        );
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "助成金診断データを取得できませんでした");
      } finally {
        setLoading(false);
      }
    };

    loadMaster();
  }, []);

  const setAnswer = (key: string, value: AnswerValue) => {
    setShowResult(false);
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const toggleMulti = (key: string, value: string) => {
    setShowResult(false);
    setAnswers((prev) => {
      const current = Array.isArray(prev[key]) ? (prev[key] as string[]) : [];
      const exclusiveValues = ["該当なし", "わからない"];

      if (exclusiveValues.includes(value)) {
        return {
          ...prev,
          [key]: current.includes(value) ? [] : [value],
        };
      }

      const withoutExclusive = current.filter(
        (item) => !exclusiveValues.includes(item),
      );
      return {
        ...prev,
        [key]: withoutExclusive.includes(value)
          ? withoutExclusive.filter((item) => item !== value)
          : [...withoutExclusive, value],
      };
    });
  };

  const questionMap = useMemo(
    () =>
      new Map(questions.map((question) => [question.question_key, question])),
    [questions],
  );

  const selectedIndustry =
    typeof answers.industry === "string" ? answers.industry : "";

  const shouldShowQuestion = (question: Question) => {
    if (question.industry && question.industry !== selectedIndustry)
      return false;

    const key = question.question_key;

    if (["plans_trial_hiring", "target_hiring"].includes(key)) {
      return answers.plans_hiring === "はい";
    }

    if (
      [
        "plans_regularization",
        "plans_wage_increase",
        "plans_common_wage_rules",
        "plans_bonus_retirement",
        "plans_social_insurance_support",
        "plans_worktime_extension",
      ].includes(key)
    ) {
      return answers.has_non_regular === "はい";
    }

    if (["plans_digital_training", "plans_reskilling"].includes(key)) {
      return (
        answers.plans_training === "はい" || answers.plans_training === "検討中"
      );
    }

    return true;
  };

  const visibleQuestions = useMemo(
    () => questions.filter(shouldShowQuestion),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [questions, answers, selectedIndustry],
  );

  // 最初の診断を開始するための最低限の必須項目。
  // 詳細制度の質問は未回答でも候補抽出できます。
  const requiredKeys = [
    "industry",
    "employee_count",
    "capital",
    "has_employees",
    "plans_hiring",
  ];
  const canDiagnose = requiredKeys.every((key) => {
    const value = answers[key];
    return Array.isArray(value)
      ? value.length > 0
      : String(value ?? "").trim() !== "";
  });

  const candidates = useMemo<Candidate[]>(() => {
    const list: Candidate[] = [];

    for (const subsidy of subsidies) {
      const subsidyConditions = conditions.filter(
        (condition) => condition.subsidy_id === subsidy.id,
      );
      if (subsidyConditions.length === 0) continue;

      const requiredConditions = subsidyConditions.filter(
        (condition) => condition.required,
      );
      const requiredMatched = requiredConditions.every((condition) =>
        conditionMatches(condition, answers[condition.condition_key]),
      );

      if (!requiredMatched) continue;

      const totalWeight = subsidyConditions.reduce(
        (sum, condition) => sum + Math.max(condition.weight, 0),
        0,
      );
      const matched = subsidyConditions.filter((condition) =>
        conditionMatches(condition, answers[condition.condition_key]),
      );
      const matchedWeight = matched.reduce(
        (sum, condition) => sum + Math.max(condition.weight, 0),
        0,
      );
      const score =
        totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : 100;

      const reasons = matched.map((condition) => {
        const question = questionMap.get(condition.condition_key);
        const answer = displayAnswer(answers[condition.condition_key]);
        return question
          ? `${question.question_text} → ${answer}`
          : `${condition.condition_key} → ${answer}`;
      });

      const checks: string[] = [
        "対象となる事業主・労働者の詳細要件",
        "雇用保険など共通支給要件",
        "計画提出・申請期限などの手続要件",
      ];

      if (subsidy.application_authority) {
        checks.push(`申請窓口：${subsidy.application_authority}`);
      }

      const matchLevel: Candidate["matchLevel"] =
        score >= 80 ? "high" : score >= 55 ? "medium" : "low";

      const amountRule = amountRules.find(
        (rule) => rule.subsidy_id === subsidy.id && rule.rule_key === "summary",
      );

      list.push({
        subsidy,
        amountRule,
        score,
        matchLevel,
        reasons,
        checks,
      });
    }

    return list
      .sort((a, b) => b.score - a.score || a.subsidy.id - b.subsidy.id)
      .slice(0, 8);
  }, [subsidies, conditions, amountRules, answers, questionMap]);

  const reset = () => {
    setAnswers({});
    setShowResult(false);
    setShowConsultation(false);
    setConsultationDone(false);
    setConsultationError("");
    setSelectedConsultationSubsidyIds([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitConsultation = async () => {
    if (
      !consultationForm.companyName.trim() ||
      !consultationForm.contactName.trim() ||
      !consultationForm.email.trim() ||
      !consultationForm.prefecture.trim()
    ) {
      setConsultationError(
        "会社名・担当者名・メールアドレス・都道府県を入力してください",
      );
      return;
    }

    if (selectedConsultationSubsidyIds.length === 0) {
      setConsultationError("相談したい助成金を1つ以上選択してください");
      return;
    }

    if (!consultationForm.consent) {
      setConsultationError("専門家への情報提供に同意してください");
      return;
    }

    try {
      setConsultationSending(true);
      setConsultationError("");

      const response = await fetch("/api/job-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "subsidy-consultation",
          fiscalYear: FISCAL_YEAR,
          userId:
            liff.getContext()?.userId ?? liff.getDecodedIDToken()?.sub ?? null,
          companyName: consultationForm.companyName.trim(),
          contactName: consultationForm.contactName.trim(),
          email: consultationForm.email.trim(),
          phone: consultationForm.phone.trim(),
          prefecture: consultationForm.prefecture.trim(),
          consultationMessage: consultationForm.message.trim(),
          answers,
          subsidyIds: selectedConsultationSubsidyIds,
          results: candidates
            .filter((item) =>
              selectedConsultationSubsidyIds.includes(item.subsidy.id),
            )
            .map((item) => ({
              subsidyId: item.subsidy.id,
              matchLevel: item.matchLevel,
              score: item.score,
              reasons: item.reasons,
              checks: item.checks,
            })),
          consentToShare: consultationForm.consent,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "相談申込みに失敗しました");
      }

      setConsultationDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      setConsultationError(e?.message || "相談申込みに失敗しました");
    } finally {
      setConsultationSending(false);
    }
  };

  const renderQuestion = (question: Question) => {
    const value = answers[question.question_key];
    const options = question.options ?? [];

    if (question.question_type === "number") {
      return (
        <input
          type="number"
          min="0"
          inputMode="numeric"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => setAnswer(question.question_key, e.target.value)}
          placeholder={
            question.question_key === "capital" ? "例：10000000" : "例：10"
          }
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "11px 12px",
            border: "1px solid #d1d5db",
            borderRadius: "10px",
            fontSize: "16px",
          }}
        />
      );
    }

    if (question.question_type === "multi") {
      const selected = Array.isArray(value) ? value : [];
      return (
        <>
          {options.map((option) => (
            <OptionButton
              key={option}
              selected={selected.includes(option)}
              onClick={() => toggleMulti(question.question_key, option)}
            >
              {option}
            </OptionButton>
          ))}
        </>
      );
    }

    return (
      <>
        {options.map((option) => (
          <OptionButton
            key={option}
            selected={value === option}
            onClick={() => setAnswer(question.question_key, option)}
          >
            {option}
          </OptionButton>
        ))}
      </>
    );
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f6f7f9",
          padding: "40px 16px",
          textAlign: "center",
        }}
      >
        助成金診断を読み込んでいます...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f6f7f9",
          padding: "24px 12px",
        }}
      >
        <div
          style={{
            maxWidth: "700px",
            margin: "0 auto",
            background: "#fff",
            padding: "20px",
            borderRadius: "12px",
          }}
        >
          <div style={{ color: "#dc2626", fontWeight: 800 }}>
            助成金診断データを取得できませんでした
          </div>
          <div style={{ marginTop: "8px", color: "#4b5563", fontSize: "13px" }}>
            {error}
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ marginTop: "16px", padding: "10px 14px" }}
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

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
            <div>
              <div style={{ fontSize: "18px", fontWeight: 800 }}>
                💰 助成金診断結果
              </div>
              <div
                style={{ marginTop: "2px", color: "#6b7280", fontSize: "11px" }}
              >
                令和8年度（2026年度）の登録済み制度から候補を表示しています
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
            この結果は簡易診断です。「条件一致度」は受給確率や支給決定を示すものではありません。制度の詳細要件・申請時期・最新情報を必ず公式資料や専門家に確認してください。
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
              現在の回答では候補を絞り込めませんでした。
              <br />
              回答内容を変更して再診断してください。
            </div>
          ) : (
            candidates.map((item, index) => (
              <article
                key={item.subsidy.id}
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
                      background: "#ecfdf3",
                      color: "#047857",
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
                  {item.subsidy.name}
                </div>
                {item.subsidy.course_name && (
                  <div
                    style={{
                      marginTop: "4px",
                      color: "#4b5563",
                      fontSize: "13px",
                      fontWeight: 700,
                    }}
                  >
                    {item.subsidy.course_name}
                  </div>
                )}

                <div
                  style={{
                    marginTop: "12px",
                    fontSize: "14px",
                    fontWeight: 800,
                  }}
                >
                  条件一致度：{item.score}%
                </div>
                <div
                  style={{
                    marginTop: "4px",
                    color:
                      item.matchLevel === "high"
                        ? "#047857"
                        : item.matchLevel === "medium"
                          ? "#b45309"
                          : "#6b7280",
                    fontSize: "12px",
                    fontWeight: 800,
                  }}
                >
                  {item.matchLevel === "high"
                    ? "該当可能性：高"
                    : item.matchLevel === "medium"
                      ? "該当可能性：中"
                      : "追加確認が必要"}
                </div>

                {item.amountRule && (
                  <div
                    style={{
                      marginTop: "14px",
                      padding: "14px",
                      background: "#fffbeb",
                      border: "1px solid #fde68a",
                      borderRadius: "12px",
                    }}
                  >
                    <div
                      style={{
                        color: "#92400e",
                        fontSize: "12px",
                        fontWeight: 800,
                      }}
                    >
                      💰 支給額の目安
                    </div>
                    <div
                      style={{
                        marginTop: "5px",
                        color: "#111827",
                        fontSize: "16px",
                        fontWeight: 800,
                        lineHeight: 1.5,
                      }}
                    >
                      {item.amountRule.amount_display}
                    </div>
                    {item.amountRule.calculation_note && (
                      <div
                        style={{
                          marginTop: "7px",
                          color: "#6b7280",
                          fontSize: "11px",
                          lineHeight: 1.6,
                        }}
                      >
                        {item.amountRule.calculation_note}
                      </div>
                    )}
                    <div
                      style={{
                        marginTop: "7px",
                        color: "#92400e",
                        fontSize: "10px",
                        lineHeight: 1.5,
                      }}
                    >
                      ※支給額は簡易的な目安です。企業規模・対象者・取組内容・申請時期などにより異なります。
                    </div>
                  </div>
                )}

                {item.subsidy.description && (
                  <div
                    style={{
                      marginTop: "10px",
                      color: "#4b5563",
                      fontSize: "12px",
                      lineHeight: 1.7,
                    }}
                  >
                    {item.subsidy.description}
                  </div>
                )}

                <div
                  style={{
                    marginTop: "14px",
                    fontSize: "12px",
                    fontWeight: 800,
                  }}
                >
                  今回一致した回答
                </div>
                <ul
                  style={{
                    margin: "6px 0 0",
                    paddingLeft: "20px",
                    color: "#374151",
                    fontSize: "12px",
                    lineHeight: 1.8,
                  }}
                >
                  {item.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>

                <div
                  style={{
                    marginTop: "12px",
                    fontSize: "12px",
                    fontWeight: 800,
                  }}
                >
                  詳細確認が必要
                </div>
                <ul
                  style={{
                    margin: "6px 0 0",
                    paddingLeft: "20px",
                    color: "#6b7280",
                    fontSize: "12px",
                    lineHeight: 1.8,
                  }}
                >
                  {item.checks.map((check) => (
                    <li key={check}>{check}</li>
                  ))}
                </ul>

                {item.subsidy.official_url && (
                  <a
                    href={item.subsidy.official_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-block",
                      marginTop: "12px",
                      color: "#2563eb",
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    厚生労働省等の公式情報を確認 ↗
                  </a>
                )}
              </article>
            ))
          )}

          {!showConsultation && !consultationDone && candidates.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setShowConsultation(true);
                setConsultationError("");
                setSelectedConsultationSubsidyIds([]);
              }}
              style={{
                width: "100%",
                marginTop: "6px",
                marginBottom: "10px",
                padding: "14px",
                border: "none",
                borderRadius: "12px",
                background: "#06c755",
                color: "#fff",
                fontSize: "15px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              👨‍💼 専門家に相談する
            </button>
          )}

          {showConsultation && !consultationDone && (
            <section
              style={{
                marginTop: "8px",
                marginBottom: "14px",
                padding: "18px",
                background: "#fff",
                border: "1px solid #d1fae5",
                borderRadius: "14px",
              }}
            >
              <div style={{ fontSize: "17px", fontWeight: 800 }}>
                👨‍💼 専門家への相談申込み
              </div>
              <div
                style={{
                  marginTop: "6px",
                  color: "#6b7280",
                  fontSize: "12px",
                  lineHeight: 1.6,
                }}
              >
                診断結果を引き継いで、相談内容に応じた社会保険労務士または専門家への相談を受け付けます。
              </div>

              {[
                ["companyName", "会社名", "株式会社○○"],
                ["contactName", "担当者名", "山田 太郎"],
                ["email", "メールアドレス", "example@example.com"],
                ["phone", "電話番号（任意）", "090-1234-5678"],
                ["prefecture", "都道府県", "愛知県"],
              ].map(([key, label, placeholder]) => (
                <label
                  key={key}
                  style={{ display: "block", marginTop: "12px" }}
                >
                  <div
                    style={{
                      marginBottom: "5px",
                      fontSize: "12px",
                      fontWeight: 800,
                    }}
                  >
                    {label}
                  </div>
                  <input
                    type={
                      key === "email"
                        ? "email"
                        : key === "phone"
                          ? "tel"
                          : "text"
                    }
                    value={String(
                      consultationForm[key as keyof typeof consultationForm] ??
                        "",
                    )}
                    onChange={(e) =>
                      setConsultationForm((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    placeholder={placeholder}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "11px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "10px",
                      fontSize: "14px",
                    }}
                  />
                </label>
              ))}

              <div style={{ marginTop: "14px" }}>
                <div
                  style={{
                    marginBottom: "7px",
                    fontSize: "12px",
                    fontWeight: 800,
                  }}
                >
                  相談したい助成金
                </div>
                <div style={{ display: "grid", gap: "8px" }}>
                  {candidates.map((item) => {
                    const subsidyId = item.subsidy.id;
                    const checked =
                      selectedConsultationSubsidyIds.includes(subsidyId);

                    return (
                      <label
                        key={subsidyId}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "10px",
                          padding: "11px 12px",
                          background: checked ? "#ecfdf3" : "#f9fafb",
                          border: checked
                            ? "1px solid #86efac"
                            : "1px solid #e5e7eb",
                          borderRadius: "10px",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedConsultationSubsidyIds((prev) =>
                              prev.includes(subsidyId)
                                ? prev.filter((id) => id !== subsidyId)
                                : [...prev, subsidyId],
                            )
                          }
                          style={{
                            appearance: "auto",
                            WebkitAppearance: "checkbox",
                            width: "18px",
                            height: "18px",
                            minWidth: "18px",
                            flex: "0 0 18px",
                            margin: "1px 0 0 0",
                            padding: 0,
                            cursor: "pointer",
                            accentColor: "#06c755",
                          }}
                        />
                        <span style={{ flex: 1 }}>
                          <span
                            style={{
                              display: "block",
                              color: "#111827",
                              fontSize: "12px",
                              fontWeight: 800,
                              lineHeight: 1.5,
                            }}
                          >
                            {item.subsidy.name}
                          </span>
                          {item.subsidy.course_name && (
                            <span
                              style={{
                                display: "block",
                                marginTop: "2px",
                                color: "#6b7280",
                                fontSize: "11px",
                                lineHeight: 1.5,
                              }}
                            >
                              {item.subsidy.course_name}
                            </span>
                          )}
                          <span
                            style={{
                              display: "block",
                              marginTop: "3px",
                              color: "#047857",
                              fontSize: "10px",
                              fontWeight: 700,
                            }}
                          >
                            条件一致度 {item.score}%
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <label style={{ display: "block", marginTop: "12px" }}>
                <div
                  style={{
                    marginBottom: "5px",
                    fontSize: "12px",
                    fontWeight: 800,
                  }}
                >
                  相談内容（任意）
                </div>
                <textarea
                  value={consultationForm.message}
                  onChange={(e) =>
                    setConsultationForm((prev) => ({
                      ...prev,
                      message: e.target.value,
                    }))
                  }
                  placeholder="例：キャリアアップ助成金について詳しく相談したい"
                  rows={4}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "10px",
                    fontSize: "14px",
                    resize: "vertical",
                  }}
                />
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                  marginTop: "14px",
                  padding: "12px",
                  background: "#f9fafb",
                  borderRadius: "10px",
                  fontSize: "11px",
                  lineHeight: 1.6,
                }}
              >
                <input
                  type="checkbox"
                  checked={consultationForm.consent}
                  onChange={(e) =>
                    setConsultationForm((prev) => ({
                      ...prev,
                      consent: e.target.checked,
                    }))
                  }
                  style={{
                    appearance: "auto",
                    WebkitAppearance: "checkbox",
                    width: "16px",
                    height: "16px",
                    minWidth: "16px",
                    maxWidth: "16px",
                    minHeight: "16px",
                    maxHeight: "16px",
                    flex: "0 0 16px",
                    margin: "2px 0 0 0",
                    padding: 0,
                    border: "none",
                    borderRadius: 0,
                    boxSizing: "border-box",
                    cursor: "pointer",
                    accentColor: "#06c755",
                  }}
                />
                <span style={{ flex: 1, minWidth: 0 }}>
                  診断結果および入力した会社・連絡先情報を、相談対応のため提携する社会保険労務士または専門家へ提供することに同意します。
                </span>
              </label>

              {consultationError && (
                <div
                  style={{
                    marginTop: "10px",
                    color: "#dc2626",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  {consultationError}
                </div>
              )}

              <button
                type="button"
                disabled={consultationSending}
                onClick={submitConsultation}
                style={{
                  width: "100%",
                  marginTop: "14px",
                  padding: "13px",
                  border: "none",
                  borderRadius: "12px",
                  background: consultationSending ? "#9ca3af" : "#06c755",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: consultationSending ? "not-allowed" : "pointer",
                }}
              >
                {consultationSending ? "送信中..." : "専門家に相談を申し込む"}
              </button>
            </section>
          )}

          {consultationDone && (
            <div
              style={{
                marginBottom: "14px",
                padding: "18px",
                background: "#ecfdf3",
                border: "1px solid #a7f3d0",
                borderRadius: "14px",
                color: "#065f46",
                lineHeight: 1.7,
              }}
            >
              <div style={{ fontSize: "16px", fontWeight: 800 }}>
                相談申込みを受け付けました
              </div>
              <div style={{ marginTop: "5px", fontSize: "12px" }}>
                診断結果と相談内容を保存しました。担当者が内容を確認します。
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowResult(false)}
            style={{
              width: "100%",
              marginTop: "6px",
              padding: "13px",
              border: "1px solid #d1d5db",
              borderRadius: "12px",
              background: "#fff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            回答を修正する
          </button>

          <button
            type="button"
            onClick={reset}
            style={{
              width: "100%",
              marginTop: "10px",
              padding: "13px",
              border: "none",
              borderRadius: "12px",
              background: "#111827",
              color: "#fff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            最初から診断する
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
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div>
            <div style={{ fontSize: "18px", fontWeight: 800 }}>
              💰 助成金診断
            </div>
            <div
              style={{ marginTop: "2px", color: "#6b7280", fontSize: "11px" }}
            >
              令和8年度（2026年度）・DB連携版
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
            background: "#ecfdf3",
            border: "1px solid #a7f3d0",
            borderRadius: "12px",
            color: "#065f46",
            fontSize: "12px",
            lineHeight: 1.7,
          }}
        >
          会社の状況に近い項目を選択してください。業種に応じて必要な質問だけを表示します。
        </div>

        {visibleQuestions.map((question) => (
          <QuestionCard
            key={question.id}
            title={question.question_text}
            required={requiredKeys.includes(question.question_key)}
          >
            {renderQuestion(question)}
          </QuestionCard>
        ))}

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
