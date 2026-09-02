import { useEffect, useState } from "react";
import liff from "@line/liff";
import "./App.css";

type WorkType = "固定時間" | "シフト制";
type SalaryType = "時給" | "月給";

type JobForm = {
  storeName: string;
  industry: string;
  jobTitle: string;
  jobDescription: string;
  employmentType: string;

  location: string;

  workType: WorkType;

  startTime: string;
  endTime: string;

  shiftExample: string;
  minDaysPerWeek: string;
  minHoursPerDay: string;

  salaryType: SalaryType;
  salary: string;

  benefits: string[];

  aiRequest: string;
};

type AnalysisResult = {
  nearestStations: {
    stationName: string;
    lineName: string;
    estimatedDistance: string;
  }[];

  score: {
    total: number;
    salary: number;
    workConditions: number;
    benefits: number;
    accessibility: number;
    title: number;
    appeal: number;
  };

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

const industries = [
  "飲食店",
  "美容",
  "小売",
  "ホテル・宿泊",
  "介護",
  "医療",
  "建設",
  "IT",
  "その他",
];

const employmentTypes = [
  "アルバイト・パート",
  "正社員",
  "契約社員",
  "派遣社員",
];

const benefitOptions = [
  "交通費支給",
  "まかない無料",
  "制服貸与",
  "髪色自由",
  "髪型自由",
  "ピアスOK",
  "未経験OK",
  "学生歓迎",
  "主婦・主夫歓迎",
  "WワークOK",
  "社割あり",
  "昇給あり",
  "社員登用あり",
  "駅チカ",
  "車通勤OK",
];

function App() {
  const [form, setForm] = useState<JobForm>({
    storeName: "",
    industry: "",
    jobTitle: "",
    jobDescription: "",
    employmentType: "アルバイト・パート",

    location: "",

    workType: "シフト制",

    startTime: "",
    endTime: "",

    shiftExample: "",
    minDaysPerWeek: "",
    minHoursPerDay: "",

    salaryType: "時給",
    salary: "",

    benefits: [],

    aiRequest: "",
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    const initLiff = async () => {
      try {
        await liff.init({
          liffId: "2011376548-9M89rhkF",
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

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleBenefit = (benefit: string) => {
    setForm((prev) => {
      const exists = prev.benefits.includes(benefit);

      return {
        ...prev,
        benefits: exists
          ? prev.benefits.filter((item) => item !== benefit)
          : [...prev.benefits, benefit],
      };
    });
  };

  const createJob = async () => {
    if (!form.storeName.trim()) {
      alert("店舗名・会社名を入力してください");
      return;
    }

    if (!form.industry) {
      alert("業種を選択してください");
      return;
    }

    if (!form.jobTitle.trim()) {
      alert("募集職種を入力してください");
      return;
    }

    if (!form.jobDescription.trim()) {
      alert("仕事内容を入力してください");
      return;
    }

    if (!form.location.trim()) {
      alert("勤務地を入力してください");
      return;
    }

    if (!form.salary.trim()) {
      alert(`${form.salaryType}を入力してください`);
      return;
    }

    if (
      form.workType === "シフト制" &&
      !form.startTime &&
      !form.endTime &&
      !form.shiftExample
    ) {
      alert("シフトの勤務時間帯またはシフト例を入力してください");
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      const response = await fetch("/api/generate-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "求人の生成に失敗しました");
      }

      setResult(data);

      setTimeout(() => {
        document.getElementById("analysis-result")?.scrollIntoView({
          behavior: "smooth",
        });
      }, 100);
    } catch (error) {
      console.error("求人生成エラー:", error);

      alert(
        error instanceof Error ? error.message : "求人の作成に失敗しました"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">🤖</span>

            <div>
              <div className="logo-title">求人AIナビ</div>

              <div className="logo-subtitle">
                AIが応募されやすい求人作成をサポート
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container">
        <section className="intro">
          <h1>求人を作成しましょう</h1>

          <p>
            質問に答えるだけで、
            <br />
            AIが求人票を作成し、
            <br />
            「応募を増やすための改善ポイント」まで提案します。
          </p>
        </section>

        {/* 会社情報 */}
        <section className="card">
          <div className="section-title">
            <span>🏢</span>
            <h2>店舗・会社情報</h2>
          </div>

          <div className="form-group">
            <label>
              店舗名・会社名
              <span className="required">必須</span>
            </label>

            <input
              type="text"
              name="storeName"
              value={form.storeName}
              onChange={handleChange}
              placeholder="例：カフェ○○"
            />
          </div>

          <div className="form-group">
            <label>
              業種
              <span className="required">必須</span>
            </label>

            <select
              name="industry"
              value={form.industry}
              onChange={handleChange}
            >
              <option value="">業種を選択してください</option>

              {industries.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* 募集内容 */}
        <section className="card">
          <div className="section-title">
            <span>👤</span>
            <h2>募集内容</h2>
          </div>

          <div className="form-group">
            <label>
              募集職種
              <span className="required">必須</span>
            </label>

            <input
              type="text"
              name="jobTitle"
              value={form.jobTitle}
              onChange={handleChange}
              placeholder="例：ホールスタッフ"
            />
          </div>

          <div className="form-group">
            <label>
              仕事内容
              <span className="required">必須</span>
            </label>

            <textarea
              name="jobDescription"
              value={form.jobDescription}
              onChange={handleChange}
              placeholder="例：お客様のご案内、料理の提供、レジ対応など"
              rows={5}
            />

            <p className="help-text">
              箇条書きでも大丈夫です。 AIが読みやすい求人文章に整えます。
            </p>
          </div>

          <div className="form-group">
            <label>雇用形態</label>

            <div className="button-group">
              {employmentTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={
                    form.employmentType === type
                      ? "select-button active"
                      : "select-button"
                  }
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      employmentType: type,
                    }))
                  }
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 勤務条件 */}
        <section className="card">
          <div className="section-title">
            <span>📍</span>
            <h2>勤務条件</h2>
          </div>

          <div className="form-group">
            <label>
              勤務地
              <span className="required">必須</span>
            </label>

            <input
              type="text"
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="例：愛知県名古屋市中区栄3-15-33"
            />

            <p className="help-text">
              住所を入力すると、AIが最寄り駅候補を推定します。
            </p>
          </div>

          <div className="form-group">
            <label>勤務形態</label>

            <div className="button-group">
              <button
                type="button"
                className={
                  form.workType === "固定時間"
                    ? "select-button active"
                    : "select-button"
                }
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    workType: "固定時間",
                  }))
                }
              >
                固定時間
              </button>

              <button
                type="button"
                className={
                  form.workType === "シフト制"
                    ? "select-button active"
                    : "select-button"
                }
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    workType: "シフト制",
                  }))
                }
              >
                シフト制
              </button>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                {form.workType === "シフト制" ? "勤務開始時間" : "勤務開始時間"}
              </label>

              <input
                type="time"
                name="startTime"
                value={form.startTime}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>勤務終了時間</label>

              <input
                type="time"
                name="endTime"
                value={form.endTime}
                onChange={handleChange}
              />
            </div>
          </div>

          {form.workType === "シフト制" && (
            <>
              <div className="form-group">
                <label>シフト例</label>

                <textarea
                  name="shiftExample"
                  value={form.shiftExample}
                  onChange={handleChange}
                  placeholder={
                    "例：9:00～14:00、17:00～22:00\n" +
                    "学校終わりの17時から勤務OK"
                  }
                  rows={4}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>週の勤務日数</label>

                  <input
                    type="text"
                    name="minDaysPerWeek"
                    value={form.minDaysPerWeek}
                    onChange={handleChange}
                    placeholder="例：週2日～"
                  />
                </div>

                <div className="form-group">
                  <label>1日の勤務時間</label>

                  <input
                    type="text"
                    name="minHoursPerDay"
                    value={form.minHoursPerDay}
                    onChange={handleChange}
                    placeholder="例：1日3時間～"
                  />
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label>
              給与
              <span className="required">必須</span>
            </label>

            <div className="button-group">
              <button
                type="button"
                className={
                  form.salaryType === "時給"
                    ? "select-button active"
                    : "select-button"
                }
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    salaryType: "時給",
                    salary: "",
                  }))
                }
              >
                時給
              </button>

              <button
                type="button"
                className={
                  form.salaryType === "月給"
                    ? "select-button active"
                    : "select-button"
                }
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    salaryType: "月給",
                    salary: "",
                  }))
                }
              >
                月給
              </button>
            </div>

            <div className="input-with-unit">
              <input
                type="number"
                name="salary"
                value={form.salary}
                onChange={handleChange}
                placeholder={form.salaryType === "時給" ? "1200" : "250000"}
              />

              <span>円</span>
            </div>
          </div>
        </section>

        {/* 待遇 */}
        <section className="card">
          <div className="section-title">
            <span>✨</span>
            <h2>待遇・特徴</h2>
          </div>

          <p className="section-description">
            当てはまるものを選択してください。
          </p>

          <div className="benefit-grid">
            {benefitOptions.map((benefit) => {
              const selected = form.benefits.includes(benefit);

              return (
                <button
                  key={benefit}
                  type="button"
                  className={
                    selected ? "benefit-button active" : "benefit-button"
                  }
                  onClick={() => toggleBenefit(benefit)}
                >
                  {selected ? "✓ " : ""}
                  {benefit}
                </button>
              );
            })}
          </div>
        </section>

        {/* AIへのリクエスト */}
        <section className="card">
          <div className="section-title">
            <span>🤖</span>
            <h2>AIへのリクエスト</h2>
          </div>

          <p className="section-description">
            どんな人に応募してほしいか、
            求人でアピールしたいことを自由に入力してください。
          </p>

          <textarea
            name="aiRequest"
            value={form.aiRequest}
            onChange={handleChange}
            placeholder={
              "例：学生さんにたくさん応募してほしいです。\n" +
              "スタッフ同士が仲が良いことをアピールしてください。\n" +
              "未経験でも安心して働けることを伝えてください。"
            }
            rows={7}
          />
        </section>

        {/* AI生成 */}
        <section className="generate-section">
          <button
            type="button"
            className="generate-button"
            onClick={createJob}
            disabled={isGenerating}
          >
            {isGenerating ? (
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

        {/* 結果 */}
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

                  <h4>{point.title}</h4>

                  <p>
                    <strong>理由：</strong>
                    {point.reason}
                  </p>

                  <p>
                    <strong>おすすめ：</strong>
                    {point.recommendation}
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

      <footer className="footer">
        <p>求人AIナビ</p>
      </footer>
    </div>
  );
}

export default App;
