import { useEffect, useState } from "react";
import liff from "@line/liff";
import "./App.css";

type JobForm = {
  storeName: string;
  industry: string;
  jobTitle: string;
  employmentType: string;
  location: string;
  startTime: string;
  endTime: string;
  hourlyWage: string;
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
  const [liffReady, setLiffReady] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<JobForm>({
    storeName: "",
    industry: "",
    jobTitle: "",
    employmentType: "アルバイト・パート",
    location: "",
    startTime: "",
    endTime: "",
    hourlyWage: "",
    benefits: [],
    aiRequest: "",
  });

  useEffect(() => {
    const initLiff = async () => {
      try {
        // LIFF IDを自分のものに変更してください
        await liff.init({
          liffId: "YOUR_LIFF_ID",
        });

        setLiffReady(true);
      } catch (error) {
        console.error("LIFF initialization failed:", error);
      }
    };

    initLiff();
  }, []);

  const handleChange = (field: keyof JobForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
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
    if (!form.storeName) {
      alert("店舗名を入力してください。");
      return;
    }

    if (!form.industry) {
      alert("業種を選択してください。");
      return;
    }

    if (!form.jobTitle) {
      alert("応募職種を入力してください。");
      return;
    }

    if (!form.location) {
      alert("勤務地を入力してください。");
      return;
    }

    if (!form.hourlyWage) {
      alert("時給を入力してください。");
      return;
    }

    setLoading(true);

    try {
      /*
       * 後でバックエンドを作ったら、
       * ここからOpenAI APIを呼び出します。
       *
       * 例：
       *
       * const response = await fetch(
       *   "https://あなたのAPI/api/jobs/generate",
       *   {
       *     method: "POST",
       *     headers: {
       *       "Content-Type": "application/json",
       *     },
       *     body: JSON.stringify(form),
       *   }
       * );
       *
       * const result = await response.json();
       */

      console.log("求人情報:", form);

      // 現段階では確認用
      await new Promise((resolve) => setTimeout(resolve, 1000));

      alert(
        "求人情報を受け付けました！\n次のステップでAIが求人票を作成します。"
      );
    } catch (error) {
      console.error(error);
      alert("求人作成中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <main className="container">
        <section className="intro">
          <h1>求人を作成する</h1>
          <p>
            かんたんな質問に答えるだけ。
            <br />
            AIが応募したくなる求人票を作成します。
          </p>
        </section>

        {/* 基本情報 */}
        <section className="card">
          <h2>店舗・会社情報</h2>

          <label>
            店舗名 <span className="required">必須</span>
          </label>

          <input
            type="text"
            placeholder="例：カフェ〇〇"
            value={form.storeName}
            onChange={(e) => handleChange("storeName", e.target.value)}
          />

          <label>
            業種 <span className="required">必須</span>
          </label>

          <div className="button-grid">
            {industries.map((industry) => (
              <button
                key={industry}
                type="button"
                className={
                  form.industry === industry
                    ? "select-button active"
                    : "select-button"
                }
                onClick={() => handleChange("industry", industry)}
              >
                {industry}
              </button>
            ))}
          </div>
        </section>

        {/* 募集内容 */}
        <section className="card">
          <h2>募集内容</h2>

          <label>
            応募職種 <span className="required">必須</span>
          </label>

          <input
            type="text"
            placeholder="例：ホールスタッフ"
            value={form.jobTitle}
            onChange={(e) => handleChange("jobTitle", e.target.value)}
          />

          <label>雇用形態</label>

          <div className="button-grid">
            {employmentTypes.map((type) => (
              <button
                key={type}
                type="button"
                className={
                  form.employmentType === type
                    ? "select-button active"
                    : "select-button"
                }
                onClick={() => handleChange("employmentType", type)}
              >
                {type}
              </button>
            ))}
          </div>
        </section>

        {/* 勤務条件 */}
        <section className="card">
          <h2>勤務条件</h2>

          <label>
            勤務地 <span className="required">必須</span>
          </label>

          <input
            type="text"
            placeholder="例：愛知県名古屋市中区栄1-1-1"
            value={form.location}
            onChange={(e) => handleChange("location", e.target.value)}
          />

          <label>勤務時間</label>

          <div className="time-row">
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => handleChange("startTime", e.target.value)}
            />

            <span>〜</span>

            <input
              type="time"
              value={form.endTime}
              onChange={(e) => handleChange("endTime", e.target.value)}
            />
          </div>

          <label>
            時給 <span className="required">必須</span>
          </label>

          <div className="wage-row">
            <input
              type="number"
              placeholder="1,200"
              value={form.hourlyWage}
              onChange={(e) => handleChange("hourlyWage", e.target.value)}
            />
            <span>円〜</span>
          </div>
        </section>

        {/* 待遇 */}
        <section className="card">
          <h2>待遇・特徴</h2>

          <p className="description">当てはまるものを選択してください。</p>

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
                  {selected && "✓ "}
                  {benefit}
                </button>
              );
            })}
          </div>
        </section>

        {/* AIへのリクエスト */}
        <section className="card ai-card">
          <h2>✨ AIへのリクエスト</h2>

          <p className="description">
            求人票に入れてほしいことや、
            お店のアピールポイントを自由に入力してください。
          </p>

          <textarea
            rows={6}
            placeholder={
              "例：\n" +
              "学生さんにたくさん応募してほしいです。\n" +
              "スタッフ同士が仲が良いことをアピールしてください。\n" +
              "未経験でも安心して働けることを伝えてください。"
            }
            value={form.aiRequest}
            onChange={(e) => handleChange("aiRequest", e.target.value)}
          />
        </section>

        {/* 作成ボタン */}
        <button
          type="button"
          className="create-button"
          onClick={createJob}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              AIが求人票を作成しています...
            </>
          ) : (
            <>✨ AIで求人票を作成</>
          )}
        </button>

        {!liffReady && (
          <p className="liff-warning">※ LIFFの初期化を確認中です</p>
        )}

        <p className="footer-text">
          求人AIナビ
          <br />
          AIで、もっと伝わる求人へ。
        </p>
      </main>
    </div>
  );
}

export default App;
