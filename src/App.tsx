import { useEffect, useState } from "react";
import liff from "@line/liff";
import "./App.css";

type WorkType = "固定時間" | "シフト制";
type SalaryType = "時給" | "日給" | "月給" | "年俸";

type JobForm = {
  // 基本情報
  storeName: string;
  industry: string;
  jobTitle: string;
  employmentType: string;
  recruitmentCount: string;
  location: string;

  // 仕事内容
  jobDescription: string;

  // 勤務条件
  workType: WorkType;
  startTime: string;
  endTime: string;
  breakTime: string;
  holidays: string;
  minDaysPerWeek: string;
  minHoursPerDay: string;
  overtime: string;
  shiftExample: string;

  // 雇用条件
  salaryType: SalaryType;
  salary: string;
  raise: string;
  bonus: string;
  trialPeriod: string;
  contractPeriod: string;

  // 応募資格
  requiredConditions: string[];
  welcomeConditions: string[];
  experience: string;
  qualifications: string[];

  // 福利厚生
  benefits: string[];
  socialInsurance: string;
  transportationAllowance: string;
  allowances: string[];
  otherBenefits: string;

  // 職場環境
  workplaceAtmosphere: string[];
  ageGroup: string[];
  genderRatio: string;

  // アピールポイント
  appealPoints: string[];

  // AIへのリクエスト
  aiRequest: string;
};

type Score = {
  total: number;
  salary: number;
  workConditions: number;
  benefits: number;
  accessibility: number;
  appeal: number;
};

type AnalysisResult = {
  nearestStations: {
    stationName: string;
    lineName: string;
    estimatedDistance: string;
  }[];

  score: Score;

  marketSummary: string[];

  improvementPoints: {
    priority: number;
    title: string;
    reason: string;
    recommendation: string;
  }[];

  job: {
    title: string;
    catchCopy: string;
    description: string;
    requirements: string;
    salary: string;
    workingHours: string;
    location: string;
    employmentType: string;
    benefits: string;
    appealPoints: string;
  };
};

/* ========================================
   選択肢
======================================== */

const industries = [
  "飲食店",
  "美容",
  "小売",
  "ホテル・宿泊",
  "介護",
  "医療",
  "建設",
  "IT",
  "物流・運送",
  "教育",
  "不動産",
  "その他",
];

const jobTitlesByIndustry: Record<string, string[]> = {
  飲食店: [
    "ホールスタッフ",
    "キッチンスタッフ",
    "店長候補",
    "調理師・調理スタッフ",
    "洗い場スタッフ",
  ],

  美容: [
    "美容師",
    "アシスタント",
    "スタイリスト",
    "アイリスト",
    "ネイリスト",
    "受付スタッフ",
  ],

  小売: [
    "販売スタッフ",
    "レジスタッフ",
    "品出しスタッフ",
    "店舗スタッフ",
    "店長候補",
  ],

  "ホテル・宿泊": [
    "フロントスタッフ",
    "ホテルスタッフ",
    "清掃スタッフ",
    "レストランスタッフ",
    "宿泊スタッフ",
  ],

  介護: [
    "介護スタッフ",
    "介護職員",
    "生活相談員",
    "ケアマネージャー",
    "看護スタッフ",
  ],

  医療: [
    "看護師",
    "准看護師",
    "医療事務",
    "受付スタッフ",
    "歯科衛生士",
    "歯科助手",
  ],

  建設: [
    "現場作業員",
    "施工管理",
    "建築スタッフ",
    "土木作業員",
    "設備スタッフ",
  ],

  IT: [
    "システムエンジニア",
    "プログラマー",
    "Webエンジニア",
    "Webデザイナー",
    "ITサポート",
  ],

  "物流・運送": [
    "ドライバー",
    "配送スタッフ",
    "倉庫スタッフ",
    "仕分けスタッフ",
    "フォークリフトスタッフ",
  ],

  教育: ["講師", "塾講師", "家庭教師", "スクールスタッフ", "保育スタッフ"],

  不動産: [
    "営業スタッフ",
    "不動産事務",
    "営業アシスタント",
    "物件管理スタッフ",
  ],
};

const employmentTypes = [
  "アルバイト・パート",
  "正社員",
  "契約社員",
  "派遣社員",
];

const recruitmentCounts = ["1名", "2～3名", "4～5名", "6～10名", "10名以上"];

const workTypes: WorkType[] = ["固定時間", "シフト制"];

const breakTimes = ["なし", "30分", "45分", "60分", "90分", "120分"];

const holidaysOptions = [
  "シフト制",
  "週休2日制",
  "土日休み",
  "土日祝休み",
  "平日休み",
  "月8日以上",
  "会社カレンダーによる",
];

const minDaysOptions = ["週1日～", "週2日～", "週3日～", "週4日～", "週5日～"];

const minHoursOptions = [
  "1日2時間～",
  "1日3時間～",
  "1日4時間～",
  "1日5時間～",
  "1日6時間～",
  "1日7時間～",
  "1日8時間～",
];

const overtimeOptions = [
  "ほぼなし",
  "少なめ",
  "月10時間程度",
  "月20時間程度",
  "月20時間以上",
];

const raiseOptions = ["なし", "あり", "業績による", "年1回", "年2回"];

const bonusOptions = ["なし", "あり", "業績による", "年1回", "年2回"];

const trialPeriodOptions = ["なし", "1ヶ月", "2ヶ月", "3ヶ月", "6ヶ月"];

const contractPeriodOptions = [
  "無期雇用",
  "期間の定めなし",
  "3ヶ月",
  "6ヶ月",
  "1年",
];

const requiredConditionOptions = [
  "特になし",
  "高卒以上",
  "短大・専門卒以上",
  "大卒以上",
  "普通自動車免許",
  "基本的なPC操作",
];

const welcomeConditionOptions = [
  "未経験歓迎",
  "経験者歓迎",
  "学生歓迎",
  "主婦・主夫歓迎",
  "フリーター歓迎",
  "第二新卒歓迎",
  "ブランクOK",
  "WワークOK",
  "シニア歓迎",
];

const experienceOptions = ["未経験OK", "経験者優遇", "経験必須", "経験不問"];

const qualificationOptions = [
  "資格不要",
  "普通自動車免許",
  "介護職員初任者研修",
  "実務者研修",
  "介護福祉士",
  "看護師免許",
  "美容師免許",
  "調理師免許",
  "フォークリフト免許",
  "その他",
];

const benefitsList = [
  "交通費支給",
  "まかない無料",
  "制服貸与",
  "髪色自由",
  "髪型自由",
  "ピアスOK",
  "ネイルOK",
  "未経験OK",
  "学生歓迎",
  "主婦・主夫歓迎",
  "WワークOK",
  "社割あり",
  "昇給あり",
  "賞与あり",
  "社員登用あり",
  "駅チカ",
  "車通勤OK",
  "バイク通勤OK",
  "駐車場あり",
  "研修あり",
  "資格取得支援",
  "まかない・食事補助",
];

const socialInsuranceOptions = [
  "なし",
  "雇用保険",
  "社会保険完備",
  "勤務条件による",
];

const allowanceOptions = [
  "住宅手当",
  "家族手当",
  "資格手当",
  "役職手当",
  "残業手当",
  "深夜手当",
  "皆勤手当",
];

const workplaceAtmosphereOptions = [
  "アットホーム",
  "スタッフ同士仲が良い",
  "落ち着いた雰囲気",
  "活気がある",
  "チームワーク重視",
  "個人で集中して働ける",
  "未経験でも馴染みやすい",
];

const ageGroupOptions = [
  "10代～20代中心",
  "20代～30代中心",
  "30代～40代中心",
  "40代～50代中心",
  "幅広い年代が活躍",
];

const genderRatioOptions = [
  "男性が多い",
  "女性が多い",
  "男女半々くらい",
  "男女ともに活躍",
];

const appealPointOptions = [
  "未経験から始めやすい",
  "研修が充実",
  "働きやすい",
  "シフトの融通が利く",
  "高収入",
  "安定して働ける",
  "キャリアアップできる",
  "駅から近い",
  "車通勤できる",
  "スタッフ同士の雰囲気が良い",
  "若手が活躍",
  "幅広い年代が活躍",
  "家庭と両立しやすい",
  "学業と両立しやすい",
];

/* ========================================
   Initial Form
======================================== */

const initialForm: JobForm = {
  storeName: "",
  industry: "",
  jobTitle: "",
  employmentType: "アルバイト・パート",
  recruitmentCount: "1名",
  location: "",

  jobDescription: "",

  workType: "シフト制",
  startTime: "",
  endTime: "",
  breakTime: "60分",
  holidays: "シフト制",
  minDaysPerWeek: "週2日～",
  minHoursPerDay: "1日3時間～",
  overtime: "ほぼなし",
  shiftExample: "",

  salaryType: "時給",
  salary: "",
  raise: "なし",
  bonus: "なし",
  trialPeriod: "なし",
  contractPeriod: "無期雇用",

  requiredConditions: [],
  welcomeConditions: [],
  experience: "未経験OK",
  qualifications: ["資格不要"],

  benefits: [],
  socialInsurance: "勤務条件による",
  transportationAllowance: "なし",
  allowances: [],
  otherBenefits: "",

  workplaceAtmosphere: [],
  ageGroup: [],
  genderRatio: "",

  appealPoints: [],

  aiRequest: "",
};

/* ========================================
   Helper
======================================== */

const formatText = (text: string | undefined) => {
  if (!text) {
    return "";
  }

  return text.replace(/\\n/g, "\n").replace(/\\r/g, "").trim();
};

/* ========================================
   App
======================================== */

function App() {
  const [form, setForm] = useState<JobForm>(initialForm);

  /* 仕事内容候補 */
  const [jobOptions, setJobOptions] = useState<string[]>([]);
  const [selectedJobOptions, setSelectedJobOptions] = useState<string[]>([]);
  const [jobDescriptionOther, setJobDescriptionOther] = useState("");

  const [loadingJobOptions, setLoadingJobOptions] = useState(false);

  /* 求人生成 */
  const [loading, setLoading] = useState(false);

  /* 結果 */
  const [result, setResult] = useState<AnalysisResult | null>(null);

  /* エラー */
  const [errorMessage, setErrorMessage] = useState("");

  /* ========================================
     LIFF
  ======================================== */

  useEffect(() => {
    const initLiff = async () => {
      try {
        await liff.init({
          // liffId: "2011376548-9M89rhkF",
          liffId: "",
        });

        console.log("LIFF initialized");
        console.log("isLoggedIn:", liff.isLoggedIn());
        console.log("isInClient:", liff.isInClient());

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        console.log("LINEログイン成功");
      } catch (error) {
        console.error("LIFF initialization error:", error);
      }
    };

    initLiff();
  }, []);

  /* ========================================
     Job Options
  ======================================== */

  const generateJobOptions = async (industry: string, jobTitle: string) => {
    if (!industry || !jobTitle) {
      setJobOptions([]);
      setSelectedJobOptions([]);
      return;
    }

    try {
      setLoadingJobOptions(true);
      setErrorMessage("");

      const response = await fetch("/api/job-options", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          industry,
          jobTitle,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "仕事内容候補の取得に失敗しました");
      }

      const options = Array.isArray(data.options)
        ? data.options.filter(
            (item: unknown): item is string =>
              typeof item === "string" && item.trim() !== ""
          )
        : [];

      setJobOptions(options);
      setSelectedJobOptions([]);
      setJobDescriptionOther("");
    } catch (error) {
      console.error("仕事内容候補生成エラー:", error);

      setJobOptions([]);
      setSelectedJobOptions([]);

      setErrorMessage(
        "仕事内容候補の生成に失敗しました。もう一度お試しください。"
      );
    } finally {
      setLoadingJobOptions(false);
    }
  };

  /* ========================================
     Industry Change
  ======================================== */

  const handleIndustryChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      industry: value,
      jobTitle: "",
      jobDescription: "",
    }));

    setJobOptions([]);
    setSelectedJobOptions([]);
    setJobDescriptionOther("");
  };

  /* ========================================
     Job Title Change
  ======================================== */

  const handleJobTitleChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      jobTitle: value,
      jobDescription: "",
    }));

    setJobOptions([]);
    setSelectedJobOptions([]);
    setJobDescriptionOther("");
  };

  /* ========================================
     Single Selection
  ======================================== */

  const setSingleValue = (field: keyof JobForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /* ========================================
     Multi Selection
  ======================================== */

  const toggleArrayValue = (
    field:
      | "requiredConditions"
      | "welcomeConditions"
      | "qualifications"
      | "benefits"
      | "allowances"
      | "workplaceAtmosphere"
      | "ageGroup"
      | "appealPoints",
    value: string
  ) => {
    setForm((prev) => {
      const current = prev[field];

      const exists = current.includes(value);

      return {
        ...prev,
        [field]: exists
          ? current.filter((item) => item !== value)
          : [...current, value],
      };
    });
  };

  /* ========================================
     Benefit
  ======================================== */

  const toggleBenefit = (benefit: string) => {
    toggleArrayValue("benefits", benefit);
  };

  /* ========================================
     Job Option
  ======================================== */

  const toggleJobOption = (option: string) => {
    setSelectedJobOptions((prev) => {
      if (prev.includes(option)) {
        return prev.filter((item) => item !== option);
      }

      return [...prev, option];
    });
  };

  /* ========================================
     Generate Job
  ======================================== */

  const handleGenerateJob = async () => {
    try {
      setErrorMessage("");

      /* 必須チェック */

      if (!form.storeName.trim()) {
        setErrorMessage("店舗名・会社名を入力してください。");
        return;
      }

      if (!form.industry) {
        setErrorMessage("業種を選択してください。");
        return;
      }

      if (!form.jobTitle) {
        setErrorMessage("募集職種を選択してください。");
        return;
      }

      if (!form.location.trim()) {
        setErrorMessage("勤務地を入力してください。");
        return;
      }

      if (!form.salary.trim()) {
        setErrorMessage("給与を入力してください。");
        return;
      }

      /* ------------------------------------
         仕事内容をまとめる
      ------------------------------------ */

      const selectedDescription = [
        ...selectedJobOptions,
        ...(jobDescriptionOther.trim() ? [jobDescriptionOther.trim()] : []),
      ].join("\n");

      if (!selectedDescription.trim()) {
        setErrorMessage(
          "仕事内容を1つ以上選択するか、その他の仕事内容を入力してください。"
        );
        return;
      }

      /* ------------------------------------
         AIへ送るデータ
      ------------------------------------ */

      const requestForm: JobForm = {
        ...form,
        jobDescription: selectedDescription,
      };

      console.log("求人生成リクエスト:", requestForm);

      setLoading(true);

      const response = await fetch("/api/generate-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestForm),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "求人の生成に失敗しました");
      }

      /* ------------------------------------
         AIレスポンスを安全に整形
      ------------------------------------ */

      const safeResult: AnalysisResult = {
        nearestStations: Array.isArray(data.nearestStations)
          ? data.nearestStations
          : [],

        score: {
          total: data.score?.total ?? 0,
          salary: data.score?.salary ?? 0,
          workConditions: data.score?.workConditions ?? 0,
          benefits: data.score?.benefits ?? 0,
          accessibility: data.score?.accessibility ?? 0,
          appeal: data.score?.appeal ?? 0,
        },

        marketSummary: Array.isArray(data.marketSummary)
          ? data.marketSummary
          : [],

        improvementPoints: Array.isArray(data.improvementPoints)
          ? data.improvementPoints
          : [],

        job: {
          title: data.job?.title ?? "",
          catchCopy: data.job?.catchCopy ?? "",
          description: data.job?.description ?? "",
          requirements: data.job?.requirements ?? "",
          salary: data.job?.salary ?? "",
          workingHours: data.job?.workingHours ?? "",
          location: data.job?.location ?? "",
          employmentType: data.job?.employmentType ?? "",
          benefits: data.job?.benefits ?? "",
          appealPoints: data.job?.appealPoints ?? "",
        },
      };

      setResult(safeResult);

      /* 結果までスクロール */

      setTimeout(() => {
        document.getElementById("analysis-result")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    } catch (error: any) {
      console.error("求人生成エラー:", error);

      setErrorMessage(error?.message || "AIによる求人生成に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  /* ========================================
     Reset
  ======================================== */

  const handleReset = () => {
    setResult(null);
    setErrorMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* ========================================
     Render
  ======================================== */

  return (
    <>
      {/* ====================================
          Header
      ==================================== */}

      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <div className="logo-icon">🤖</div>

            <div>
              <div className="logo-title">求人AIナビ</div>

              <div className="logo-subtitle">AIで応募されやすい求人を作成</div>
            </div>
          </div>
        </div>
      </header>

      {/* ====================================
          Intro
      ==================================== */}

      <div className="intro">
        <h1>
          AIに任せて、
          <br />
          応募されやすい求人を作ろう
        </h1>

        <p>必要な情報を選択・入力するだけ。 AIが求人内容を最適化します。</p>
      </div>

      {/* ====================================
          Main
      ==================================== */}

      <main className="container">
        {/* ==================================
            Error
        ================================== */}

        {errorMessage && <div className="error-message">{errorMessage}</div>}

        {/* ==================================
            基本情報
        ================================== */}

        <section className="card">
          <div className="section-title">
            <span>📌</span>
            <h2>基本情報</h2>
          </div>

          {/* 店舗名 */}
          <div className="form-group">
            <label>
              店舗名・会社名
              <span className="required">必須</span>
            </label>

            <input
              type="text"
              value={form.storeName}
              onChange={(e) => setSingleValue("storeName", e.target.value)}
              placeholder="例：カフェ○○"
            />
          </div>

          {/* 業種 */}
          <div className="form-group">
            <label>
              業種
              <span className="required">必須</span>
            </label>

            <select
              value={form.industry}
              onChange={(e) => handleIndustryChange(e.target.value)}
            >
              <option value="">業種を選択してください</option>

              {industries.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
          </div>

          {/* 職種 */}
          <div className="form-group">
            <label>
              募集職種
              <span className="required">必須</span>
            </label>

            {form.industry && jobTitlesByIndustry[form.industry] ? (
              <select
                value={form.jobTitle}
                onChange={(e) => {
                  const value = e.target.value;

                  handleJobTitleChange(value);

                  if (value && form.industry) {
                    generateJobOptions(form.industry, value);
                  }
                }}
              >
                <option value="">募集職種を選択してください</option>

                {jobTitlesByIndustry[form.industry].map((jobTitle) => (
                  <option key={jobTitle} value={jobTitle}>
                    {jobTitle}
                  </option>
                ))}

                <option value="その他">その他</option>
              </select>
            ) : (
              <input
                type="text"
                value={form.jobTitle}
                onChange={(e) => handleJobTitleChange(e.target.value)}
                onBlur={() => {
                  if (form.industry && form.jobTitle.trim()) {
                    generateJobOptions(form.industry, form.jobTitle.trim());
                  }
                }}
                placeholder="例：ホールスタッフ"
              />
            )}

            {form.jobTitle === "その他" && (
              <input
                type="text"
                value=""
                onChange={(e) => {
                  handleJobTitleChange(e.target.value);
                }}
                placeholder="募集する職種を入力してください"
                style={{ marginTop: "10px" }}
              />
            )}

            <p className="help-text">
              職種を選択すると、AIが仕事内容を提案します。
            </p>
          </div>

          {/* 雇用形態 */}
          <div className="form-group">
            <label>
              雇用形態
              <span className="required">必須</span>
            </label>

            <div className="button-group">
              {employmentTypes.map((type) => (
                <button
                  type="button"
                  key={type}
                  className={`select-button ${
                    form.employmentType === type ? "active" : ""
                  }`}
                  onClick={() => setSingleValue("employmentType", type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* 募集人数 */}
          <div className="form-group">
            <label>募集人数</label>

            <div className="button-group">
              {recruitmentCounts.map((count) => (
                <button
                  type="button"
                  key={count}
                  className={`select-button ${
                    form.recruitmentCount === count ? "active" : ""
                  }`}
                  onClick={() => setSingleValue("recruitmentCount", count)}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ==================================
            仕事内容
        ================================== */}

        <section className="card">
          <div className="section-title">
            <span>💼</span>
            <h2>仕事内容</h2>
          </div>

          <p className="section-description">
            職種からAIが仕事内容を提案します。 該当するものを選択してください。
          </p>

          {!form.industry || !form.jobTitle ? (
            <div className="job-options-empty">
              業種と職種を選択すると、 AIが仕事内容を提案します。
            </div>
          ) : loadingJobOptions ? (
            <div className="job-options-loading">
              <span className="small-spinner"></span>
              AIが仕事内容を考えています...
            </div>
          ) : jobOptions.length > 0 ? (
            <>
              <div className="job-options-grid">
                {jobOptions.map((option) => {
                  const selected = selectedJobOptions.includes(option);

                  return (
                    <button
                      type="button"
                      key={option}
                      className={`job-option-button ${
                        selected ? "active" : ""
                      }`}
                      onClick={() => toggleJobOption(option)}
                    >
                      <span className="job-option-check">
                        {selected ? "✓" : ""}
                      </span>

                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>

              <div className="job-description-other">
                <label>その他の仕事内容</label>

                <textarea
                  value={jobDescriptionOther}
                  onChange={(e) => setJobDescriptionOther(e.target.value)}
                  placeholder="AIの候補にない仕事内容があれば入力してください"
                  rows={3}
                />
              </div>

              {selectedJobOptions.length > 0 && (
                <p className="help-text">
                  {selectedJobOptions.length}
                  件の仕事内容を選択中
                </p>
              )}
            </>
          ) : (
            <div className="job-options-empty">
              仕事内容候補を取得できませんでした。
            </div>
          )}
        </section>

        {/* ==================================
            勤務条件
        ================================== */}

        <section className="card">
          <div className="section-title">
            <span>🕐</span>
            <h2>勤務条件</h2>
          </div>

          {/* 勤務地 */}
          <div className="form-group">
            <label>
              勤務地
              <span className="required">必須</span>
            </label>

            <input
              type="text"
              value={form.location}
              onChange={(e) => setSingleValue("location", e.target.value)}
              placeholder="例：愛知県名古屋市中区栄"
            />

            <p className="help-text">最寄り駅もAIが分析します。</p>
          </div>

          {/* 勤務形態 */}
          <div className="form-group">
            <label>
              勤務形態
              <span className="required">必須</span>
            </label>

            <div className="button-group">
              {workTypes.map((type) => (
                <button
                  type="button"
                  key={type}
                  className={`select-button ${
                    form.workType === type ? "active" : ""
                  }`}
                  onClick={() => setSingleValue("workType", type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* 時間 */}
          <div className="form-row">
            <div className="form-group">
              <label>開始時間</label>

              <input
                type="time"
                step="900"
                value={form.startTime}
                onChange={(e) => setSingleValue("startTime", e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>終了時間</label>

              <input
                type="time"
                step="900"
                value={form.endTime}
                onChange={(e) => setSingleValue("endTime", e.target.value)}
              />
            </div>
          </div>

          {/* 休憩 */}
          <div className="form-group">
            <label>休憩時間</label>

            <div className="button-group">
              {breakTimes.map((time) => (
                <button
                  type="button"
                  key={time}
                  className={`select-button ${
                    form.breakTime === time ? "active" : ""
                  }`}
                  onClick={() => setSingleValue("breakTime", time)}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* シフト制 */}
          {form.workType === "シフト制" && (
            <>
              <div className="form-group">
                <label>シフト例</label>

                <textarea
                  value={form.shiftExample}
                  onChange={(e) =>
                    setSingleValue("shiftExample", e.target.value)
                  }
                  placeholder={"例：9:00～14:00、17:00～22:00"}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>最低勤務日数</label>

                <div className="button-group">
                  {minDaysOptions.map((option) => (
                    <button
                      type="button"
                      key={option}
                      className={`select-button ${
                        form.minDaysPerWeek === option ? "active" : ""
                      }`}
                      onClick={() => setSingleValue("minDaysPerWeek", option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>最低勤務時間</label>

                <div className="button-group">
                  {minHoursOptions.map((option) => (
                    <button
                      type="button"
                      key={option}
                      className={`select-button ${
                        form.minHoursPerDay === option ? "active" : ""
                      }`}
                      onClick={() => setSingleValue("minHoursPerDay", option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 休日 */}
          <div className="form-group">
            <label>休日</label>

            <div className="button-group">
              {holidaysOptions.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={`select-button ${
                    form.holidays === option ? "active" : ""
                  }`}
                  onClick={() => setSingleValue("holidays", option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* 残業 */}
          <div className="form-group">
            <label>残業</label>

            <div className="button-group">
              {overtimeOptions.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={`select-button ${
                    form.overtime === option ? "active" : ""
                  }`}
                  onClick={() => setSingleValue("overtime", option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* 給与 */}
          <div className="form-group">
            <label>
              給与
              <span className="required">必須</span>
            </label>

            <div className="form-row">
              <select
                value={form.salaryType}
                onChange={(e) => setSingleValue("salaryType", e.target.value)}
              >
                <option value="時給">時給</option>
                <option value="日給">日給</option>
                <option value="月給">月給</option>
                <option value="年俸">年俸</option>
              </select>

              <input
                type="number"
                value={form.salary}
                onChange={(e) => setSingleValue("salary", e.target.value)}
                placeholder={
                  form.salaryType === "時給"
                    ? "1500"
                    : form.salaryType === "日給"
                    ? "12000"
                    : form.salaryType === "月給"
                    ? "250000"
                    : "4000000"
                }
              />
            </div>
          </div>
        </section>

        {/* ==================================
            雇用条件
        ================================== */}

        <section className="card">
          <div className="section-title">
            <span>🏢</span>
            <h2>雇用条件</h2>
          </div>

          {/* 昇給 */}
          <div className="form-group">
            <label>昇給</label>

            <div className="button-group">
              {raiseOptions.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={`select-button ${
                    form.raise === option ? "active" : ""
                  }`}
                  onClick={() => setSingleValue("raise", option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* 賞与 */}
          <div className="form-group">
            <label>賞与</label>

            <div className="button-group">
              {bonusOptions.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={`select-button ${
                    form.bonus === option ? "active" : ""
                  }`}
                  onClick={() => setSingleValue("bonus", option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* 試用期間 */}
          <div className="form-group">
            <label>試用期間</label>

            <div className="button-group">
              {trialPeriodOptions.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={`select-button ${
                    form.trialPeriod === option ? "active" : ""
                  }`}
                  onClick={() => setSingleValue("trialPeriod", option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* 契約期間 */}
          <div className="form-group">
            <label>契約期間</label>

            <div className="button-group">
              {contractPeriodOptions.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={`select-button ${
                    form.contractPeriod === option ? "active" : ""
                  }`}
                  onClick={() => setSingleValue("contractPeriod", option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ==================================
            応募資格
        ================================== */}

        <section className="card">
          <div className="section-title">
            <span>🎓</span>
            <h2>応募資格</h2>
          </div>

          {/* 経験 */}
          <div className="form-group">
            <label>経験</label>

            <div className="button-group">
              {experienceOptions.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={`select-button ${
                    form.experience === option ? "active" : ""
                  }`}
                  onClick={() => setSingleValue("experience", option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* 必須条件 */}
          <div className="form-group">
            <label>必須条件</label>

            <div className="benefit-grid">
              {requiredConditionOptions.map((option) => {
                const selected = form.requiredConditions.includes(option);

                return (
                  <button
                    type="button"
                    key={option}
                    className={`benefit-button ${selected ? "active" : ""}`}
                    onClick={() =>
                      toggleArrayValue("requiredConditions", option)
                    }
                  >
                    <span className="benefit-check">{selected ? "✓" : ""}</span>

                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 歓迎条件 */}
          <div className="form-group">
            <label>歓迎条件</label>

            <div className="benefit-grid">
              {welcomeConditionOptions.map((option) => {
                const selected = form.welcomeConditions.includes(option);

                return (
                  <button
                    type="button"
                    key={option}
                    className={`benefit-button ${selected ? "active" : ""}`}
                    onClick={() =>
                      toggleArrayValue("welcomeConditions", option)
                    }
                  >
                    <span className="benefit-check">{selected ? "✓" : ""}</span>

                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 資格 */}
          <div className="form-group">
            <label>資格</label>

            <div className="benefit-grid">
              {qualificationOptions.map((option) => {
                const selected = form.qualifications.includes(option);

                return (
                  <button
                    type="button"
                    key={option}
                    className={`benefit-button ${selected ? "active" : ""}`}
                    onClick={() => toggleArrayValue("qualifications", option)}
                  >
                    <span className="benefit-check">{selected ? "✓" : ""}</span>

                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ==================================
            福利厚生
        ================================== */}

        <section className="card">
          <div className="section-title">
            <span>🎁</span>
            <h2>福利厚生</h2>
          </div>

          <p className="section-description">
            当てはまるものを選択してください。
          </p>

          {/* 福利厚生 */}
          <div className="form-group">
            <label>待遇・福利厚生</label>

            <div className="benefit-grid">
              {benefitsList.map((benefit) => {
                const selected = form.benefits.includes(benefit);

                return (
                  <button
                    type="button"
                    key={benefit}
                    className={`benefit-button ${selected ? "active" : ""}`}
                    onClick={() => toggleBenefit(benefit)}
                  >
                    <span className="benefit-check">{selected ? "✓" : ""}</span>

                    {benefit}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 社会保険 */}
          <div className="form-group">
            <label>社会保険</label>

            <div className="button-group">
              {socialInsuranceOptions.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={`select-button ${
                    form.socialInsurance === option ? "active" : ""
                  }`}
                  onClick={() => setSingleValue("socialInsurance", option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* 交通費 */}
          <div className="form-group">
            <label>交通費</label>

            <div className="button-group">
              {["なし", "規定支給", "全額支給"].map((option) => (
                <button
                  type="button"
                  key={option}
                  className={`select-button ${
                    form.transportationAllowance === option ? "active" : ""
                  }`}
                  onClick={() =>
                    setSingleValue("transportationAllowance", option)
                  }
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* 手当 */}
          <div className="form-group">
            <label>各種手当</label>

            <div className="benefit-grid">
              {allowanceOptions.map((option) => {
                const selected = form.allowances.includes(option);

                return (
                  <button
                    type="button"
                    key={option}
                    className={`benefit-button ${selected ? "active" : ""}`}
                    onClick={() => toggleArrayValue("allowances", option)}
                  >
                    <span className="benefit-check">{selected ? "✓" : ""}</span>

                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          {/* その他 */}
          <div className="form-group">
            <label>その他の福利厚生</label>

            <textarea
              value={form.otherBenefits}
              onChange={(e) => setSingleValue("otherBenefits", e.target.value)}
              placeholder="他にあれば入力してください"
              rows={3}
            />
          </div>
        </section>

        {/* ==================================
            職場環境
        ================================== */}

        <section className="card">
          <div className="section-title">
            <span>👥</span>
            <h2>職場環境</h2>
          </div>

          <p className="section-description">
            当てはまるものを選択してください。
            選択内容をもとにAIが求人の魅力を作成します。
          </p>

          {/* 雰囲気 */}
          <div className="form-group">
            <label>職場の雰囲気</label>

            <div className="benefit-grid">
              {workplaceAtmosphereOptions.map((option) => {
                const selected = form.workplaceAtmosphere.includes(option);

                return (
                  <button
                    type="button"
                    key={option}
                    className={`benefit-button ${selected ? "active" : ""}`}
                    onClick={() =>
                      toggleArrayValue("workplaceAtmosphere", option)
                    }
                  >
                    <span className="benefit-check">{selected ? "✓" : ""}</span>

                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 年代 */}
          <div className="form-group">
            <label>活躍している年代</label>

            <div className="benefit-grid">
              {ageGroupOptions.map((option) => {
                const selected = form.ageGroup.includes(option);

                return (
                  <button
                    type="button"
                    key={option}
                    className={`benefit-button ${selected ? "active" : ""}`}
                    onClick={() => toggleArrayValue("ageGroup", option)}
                  >
                    <span className="benefit-check">{selected ? "✓" : ""}</span>

                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 男女比 */}
          <div className="form-group">
            <label>男女比</label>

            <div className="button-group">
              {genderRatioOptions.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={`select-button ${
                    form.genderRatio === option ? "active" : ""
                  }`}
                  onClick={() => setSingleValue("genderRatio", option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ==================================
            アピールポイント
        ================================== */}

        <section className="card">
          <div className="section-title">
            <span>✨</span>
            <h2>アピールポイント</h2>
          </div>

          <p className="section-description">
            求人で特にアピールしたいポイントを選択してください。
            選択しなくてもAIが内容から自動で判断します。
          </p>

          <div className="benefit-grid">
            {appealPointOptions.map((option) => {
              const selected = form.appealPoints.includes(option);

              return (
                <button
                  type="button"
                  key={option}
                  className={`benefit-button ${selected ? "active" : ""}`}
                  onClick={() => toggleArrayValue("appealPoints", option)}
                >
                  <span className="benefit-check">{selected ? "✓" : ""}</span>

                  {option}
                </button>
              );
            })}
          </div>
        </section>

        {/* ==================================
            AIへのリクエスト
        ================================== */}

        <section className="card">
          <div className="section-title">
            <span>🤖</span>
            <h2>AIへのリクエスト</h2>
          </div>

          <p className="section-description">
            特にAIへ伝えたいことがあれば入力してください。
            空欄でもAIが自動で求人を作成します。
          </p>

          <textarea
            value={form.aiRequest}
            onChange={(e) => setSingleValue("aiRequest", e.target.value)}
            placeholder={
              "例：学生さんにたくさん応募してほしい\n" +
              "未経験でも安心して働けることを強調してほしい"
            }
            rows={4}
          />
        </section>

        {/* ==================================
            AI生成
        ================================== */}

        <section className="generate-section">
          <button
            type="button"
            className="generate-button"
            onClick={handleGenerateJob}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                AIが求人市場を分析しています...
              </>
            ) : (
              <>✨ AIで求人票を作成・分析</>
            )}
          </button>

          <p className="generate-note">
            求人票の作成だけでなく、
            応募を増やすための改善ポイントもAIが分析します。
          </p>
        </section>

        {/* ==================================
            結果
        ================================== */}

        {result && (
          <section id="analysis-result" className="card generated-card">
            <div className="section-title">
              <span>🎉</span>
              <h2>AI分析結果</h2>
            </div>

            {/* スコア */}
            <div className="result-block">
              <h3>🎯 求人AIスコア</h3>

              <div className="score-total">
                <strong>{result.score?.total ?? 0}</strong>

                <span>/100</span>
              </div>

              <div className="score-grid">
                <div>
                  <span>給与</span>
                  <strong>{result.score?.salary ?? 0}</strong>
                </div>

                <div>
                  <span>勤務条件</span>
                  <strong>{result.score?.workConditions ?? 0}</strong>
                </div>

                <div>
                  <span>待遇</span>
                  <strong>{result.score?.benefits ?? 0}</strong>
                </div>

                <div>
                  <span>訴求力</span>
                  <strong>{result.score?.appeal ?? 0}</strong>
                </div>
              </div>
            </div>

            {/* 市場傾向 */}
            <div className="result-block">
              <h3>📊 求人市場の傾向</h3>

              <ul>
                {result.marketSummary.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* 改善ポイント */}
            <div className="result-block">
              <h3>🚀 応募を増やすための改善ポイント</h3>

              {result.improvementPoints.map((point) => (
                <div className="improvement-item" key={point.priority}>
                  <div className="improvement-priority">
                    優先度 {point.priority}
                  </div>

                  <h4>{formatText(point.title)}</h4>

                  <p>
                    <strong>理由：</strong>
                    {formatText(point.reason)}
                  </p>

                  <p>
                    <strong>おすすめ：</strong>
                    {formatText(point.recommendation)}
                  </p>
                </div>
              ))}
            </div>

            {/* 求人票 */}
            <div className="result-block">
              <h3>📝 AIが作成した求人票</h3>

              <div className="generated-job">
                <h4>{result.job.title}</h4>

                <p className="catch-copy">{result.job.catchCopy}</p>

                <h4>仕事内容</h4>
                <p>{result.job.description}</p>

                <h4>応募資格・求める人物像</h4>
                <p>{result.job.requirements}</p>

                <h4>給与</h4>
                <p>{result.job.salary}</p>

                <h4>勤務時間</h4>
                <p>{result.job.workingHours}</p>

                <h4>勤務地</h4>
                <p>{result.job.location}</p>

                <h4>雇用形態</h4>
                <p>{result.job.employmentType}</p>

                <h4>待遇・福利厚生</h4>
                <p>{result.job.benefits}</p>

                <h4>この求人の魅力</h4>
                <p>{result.job.appealPoints}</p>
              </div>
            </div>

            {/* ボタン */}
            <div className="generated-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setResult(null)}
              >
                作り直す
              </button>

              <button
                type="button"
                className="save-button"
                onClick={() => {
                  alert("保存機能は次のステップで実装します。");
                }}
              >
                💾 この求人を保存
              </button>
            </div>
          </section>
        )}
      </main>

      {/* ====================================
          Footer
      ==================================== */}

      <footer className="footer">
        求人AIナビ
        <br />
        AIで、求人作成をもっと簡単に。
      </footer>
    </>
  );
}

export default App;
