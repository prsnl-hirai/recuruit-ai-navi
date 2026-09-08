import { useEffect, useState } from "react";
import liff from "@line/liff";
import "./JobManagement.css";

type Job = {
  id: number;
  public_id?: string;
  status: "0" | "1" | "9";

  title?: string;
  ai_title?: string;

  company_name?: string;

  prefecture?: string;
  city?: string;
  street_address?: string;

  employment_type?: string;
  ai_employment_type?: string;

  salary?: string;
  ai_salary?: string;

  created_at?: string;
  updated_at?: string;
};

type Props = {
  onCreateJob: () => void;
  onEditJob: (jobId: number) => void;
};

export default function JobManagement({ onCreateJob, onEditJob }: Props) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");

  /*
   * 求人一覧取得
   */
  const loadJobs = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      if (!liff.isLoggedIn()) {
        throw new Error("LINEにログインしていません。");
      }

      const profile = await liff.getProfile();

      console.log("求人管理 LINE userId:", profile.userId);

      const response = await fetch(
        `/api/job-list?userId=${encodeURIComponent(profile.userId)}`,
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "求人一覧を取得できませんでした。");
      }

      console.log("求人一覧:", data.jobs);

      setJobs(data.jobs ?? []);
    } catch (error) {
      console.error("求人一覧取得エラー:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "求人一覧を取得できませんでした。",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadJobs();
  }, []);

  /*
   * 公開ページを開く
   */
  const openPublicJob = (publicId?: string) => {
    if (!publicId) {
      return;
    }

    window.location.href = `/jobs/${publicId}`;
  };

  /*
   * ステータス表示
   */
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "1":
        return "公開中";

      case "9":
        return "非公開";

      default:
        return "下書き";
    }
  };

  /*
   * 住所
   */
  const getLocation = (job: Job) => {
    return [job.prefecture, job.city, job.street_address]
      .filter(Boolean)
      .join("");
  };

  /*
   * 日付
   */
  const formatDate = (value?: string) => {
    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString("ja-JP");
  };

  /*
   * トグルボタン切り替え
   */
  const handleTogglePublish = async (job: Job) => {
    const newStatus = job.status === "1" ? "0" : "1";

    try {
      const response = await fetch("/api/jobs", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: job.id,
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "公開状態を変更できませんでした。");
      }

      setJobs((prev) =>
        prev.map((item) =>
          item.id === job.id
            ? {
                ...item,
                status: newStatus,
              }
            : item,
        ),
      );
    } catch (error) {
      console.error("公開状態変更エラー:", error);

      alert("公開状態を変更できませんでした。");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f6f7f9",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          padding: "16px",
          borderBottom: "1px solid #eeeeee",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: "700px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "20px",
                fontWeight: 700,
              }}
            >
              📋 求人管理
            </div>

            <div
              style={{
                marginTop: "2px",
                color: "#777",
                fontSize: "12px",
              }}
            >
              作成した求人を管理できます
            </div>
          </div>

          <button
            type="button"
            onClick={onCreateJob}
            style={{
              border: "none",
              borderRadius: "8px",
              padding: "9px 14px",
              background: "#06c755",
              color: "#ffffff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ＋ 求人作成
          </button>
        </div>
      </div>

      <main
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          padding: "18px 12px 60px",
        }}
      >
        {loading && (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: "#777",
            }}
          >
            求人を読み込んでいます...
          </div>
        )}

        {!loading && errorMessage && (
          <div
            style={{
              padding: "18px",
              background: "#fff",
              borderRadius: "10px",
              color: "#dc2626",
            }}
          >
            {errorMessage}
          </div>
        )}

        {!loading && !errorMessage && jobs.length === 0 && (
          <div
            style={{
              padding: "40px 20px",
              background: "#ffffff",
              borderRadius: "12px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "42px",
              }}
            >
              📝
            </div>

            <h2
              style={{
                margin: "12px 0 6px",
                fontSize: "18px",
              }}
            >
              まだ求人がありません
            </h2>

            <p
              style={{
                margin: "0 0 20px",
                color: "#777",
                fontSize: "14px",
              }}
            >
              最初の求人を作成してみましょう
            </p>

            <button
              type="button"
              onClick={onCreateJob}
              style={{
                border: "none",
                borderRadius: "8px",
                padding: "12px 20px",
                background: "#06c755",
                color: "#ffffff",
                fontWeight: 700,
              }}
            >
              求人を作成する
            </button>
          </div>
        )}

        {!loading &&
          jobs.map((job) => {
            const title = job.ai_title || job.title || "求人タイトル未設定";

            const location = getLocation(job);

            const employmentType =
              job.ai_employment_type || job.employment_type || "";

            const salary = job.ai_salary || job.salary || "";

            return (
              <article
                key={job.id}
                style={{
                  marginBottom: "12px",
                  padding: "18px",
                  background: "#ffffff",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 8px",
                        marginBottom: "8px",
                        borderRadius: "999px",
                        background: job.status === "1" ? "#dcfce7" : "#f3f4f6",
                        color: job.status === "1" ? "#15803d" : "#555",
                        fontSize: "11px",
                        fontWeight: 700,
                      }}
                    >
                      {getStatusLabel(job.status)}
                    </span>

                    <div
                      style={{
                        fontSize: "17px",
                        fontWeight: 700,
                        lineHeight: 1.5,
                      }}
                    >
                      {title}
                    </div>

                    {job.company_name && (
                      <div
                        style={{
                          marginTop: "5px",
                          color: "#555",
                          fontSize: "13px",
                        }}
                      >
                        {job.company_name}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "12px",
                    display: "grid",
                    gap: "5px",
                    color: "#666",
                    fontSize: "13px",
                  }}
                >
                  {location && <div>📍 {location}</div>}

                  {employmentType && <div>🏢 {employmentType}</div>}

                  {salary && <div>💰 {salary}</div>}

                  {job.created_at && (
                    <div>
                      📅 作成日：
                      {formatDate(job.created_at)}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    marginTop: "16px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onEditJob(job.id)}
                    style={{
                      flex: 1,
                      padding: "10px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      background: "#ffffff",
                      fontWeight: 700,
                    }}
                  >
                    ✏️ 編集
                  </button>
                  <label className="publish-switch">
                    <input
                      type="checkbox"
                      checked={job.status === "1"}
                      onChange={() => handleTogglePublish(job)}
                    />

                    <span className="publish-slider" />

                    <span className="publish-label">
                      {job.status === "1" ? "公開" : "非公開"}
                    </span>
                  </label>
                  {job.status === "1" && job.public_id && (
                    <button onClick={() => openPublicJob(job.public_id!)}>
                      🌐 公開ページ
                    </button>
                  )}
                </div>
              </article>
            );
          })}
      </main>
    </div>
  );
}
