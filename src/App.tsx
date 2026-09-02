import { useEffect, useState } from "react";
import liff from "@line/liff";
import "./App.css";

type JobForm = {
  storeName: string;
  industry: string;
  jobTitle: string;
  jobDescription: string;
  employmentType: string;
  location: string;
  startTime: string;
  endTime: string;
  salaryType: "時給" | "月給";
  salary: string;
  benefits: string[];
  aiRequest: string;
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
    startTime: "",
    endTime: "",
    salaryType: "時給",
    salary: "",
    benefits: [],
    aiRequest: "",
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedJob, setGeneratedJob] = useState("");

  // LIFF初期化
  useEffect(() => {
    const initLiff = async () => {
      try {
        // ★ここを実際のLIFF IDに変更してください
        await liff.init({
          liffId: "2011376548-9M89rhkF",
        });

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const profile = await liff.getProfile();

        console.log("LINEユーザー:", profile.displayName);
        console.log("LINEユーザーID:", profile.userId);
      } catch (error) {
        console.error("LIFF initialization error:", error);
      }
    };

    initLiff();
  }, []);

  // 入力変更
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

  // 待遇・特徴の選択
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

  // AIで求人票を作成
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

    setIsGenerating(true);
    setGeneratedJob("");

    try {
      const response = await fetch("/api/generate-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error("求人生成APIの呼び出しに失敗しました");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "求人の生成に失敗しました");
      }

      setGeneratedJob(data.job);

      // AI生成結果までスクロール
      setTimeout(() => {
        document.getElementById("generated-job")?.scrollIntoView({
          behavior: "smooth",
        });
      }, 100);
    } catch (error) {
      console.error("求人生成エラー:", error);

      alert(
        "求人の作成に失敗しました。\n" +
          "バックエンドAPIが起動しているか確認してください。"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="app">
      {/* ヘッダー */}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">🤖</span>

            <div>
              <div className="logo-title">求人AIナビ</div>

              <div className="logo-subtitle">AIが求人作成をサポート</div>
            </div>
          </div>
        </div>
      </header>

      <main className="container">
        {/* 説明 */}
        <section className="intro">
          <h1>求人を作成しましょう</h1>

          <p>
            いくつかの質問に答えるだけで、
            <br />
            AIが応募されやすい求人票を作成します。
          </p>
        </section>

        {/* 店舗・会社情報 */}
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
              placeholder="例：お客様のご案内、料理の提供、レジ対応などをお願いします。"
              rows={5}
            />

            <p className="help-text">
              箇条書きでも大丈夫です。AIが読みやすい求人文章に整えます。
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
              placeholder="例：愛知県名古屋市中区"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>勤務開始時間</label>

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

          {/* 給与 */}
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

        {/* 待遇・特徴 */}
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
            求人でアピールしたいことなどを自由に入力してください。
          </p>

          <div className="form-group">
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
          </div>
        </section>

        {/* AI生成ボタン */}
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
                AIが求人票を作成しています...
              </>
            ) : (
              <>✨ AIで求人票を作成</>
            )}
          </button>

          <p className="generate-note">
            入力内容をAIが整理して、 応募されやすい求人票を作成します。
          </p>
        </section>

        {/* AI生成結果 */}
        {generatedJob && (
          <section id="generated-job" className="card generated-card">
            <div className="section-title">
              <span>🎉</span>
              <h2>AIが作成した求人票</h2>
            </div>

            <p className="section-description">
              内容を確認して、必要に応じて編集してください。
            </p>

            <div className="form-group">
              <textarea
                value={generatedJob}
                onChange={(e) => setGeneratedJob(e.target.value)}
                rows={25}
              />
            </div>

            <div className="generated-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setGeneratedJob("")}
              >
                作り直す
              </button>

              <button
                type="button"
                className="save-button"
                onClick={() => {
                  alert("保存処理はこれから実装します。");
                }}
              >
                💾 この求人を保存
              </button>
            </div>
          </section>
        )}
      </main>

      {/* フッター */}
      <footer className="footer">
        <p>求人AIナビ</p>
      </footer>
    </div>
  );
}

export default App;
