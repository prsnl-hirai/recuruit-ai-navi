import { useEffect, useMemo, useState } from "react";
import liff from "@line/liff";

type Application = {
  id: number;
  job_id: number;

  name?: string;
  email?: string;
  phone?: string;
  message?: string;

  status?: string;
  source?: string;

  created_at?: string;

  public_id?: string;

  title?: string;
  ai_title?: string;
  company_name?: string;
};

type Props = {
  jobId?: number | null;
  onBack: () => void;
};

export default function ApplicantManagement({ jobId = null, onBack }: Props) {
  const [applications, setApplications] = useState<Application[]>([]);

  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");

  const [selectedApplication, setSelectedApplication] =
    useState<Application | null>(null);

  const [savingStatusId, setSavingStatusId] = useState<number | null>(null);

  /*
   * 応募者一覧取得
   */
  const loadApplications = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      let userId = "";

      if (liff.isLoggedIn()) {
        const profile = await liff.getProfile();
        userId = profile.userId;
      }

      if (!userId) {
        throw new Error("LINEユーザー情報を取得できませんでした。");
      }

      const params = new URLSearchParams({
        userId,
      });

      if (jobId !== null) {
        params.set("jobId", String(jobId));
      }

      const response = await fetch(`/api/applications?${params.toString()}`);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "応募者一覧を取得できませんでした。");
      }

      setApplications(
        Array.isArray(data.applications) ? data.applications : [],
      );
    } catch (error) {
      console.error("応募者一覧取得エラー:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "応募者一覧を取得できませんでした。",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, [jobId]);

  /*
   * 応募日表示
   */
  const formatDateTime = (value?: string) => {
    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /*
   * 求人タイトル
   */
  const getJobTitle = (application: Application) => {
    return application.ai_title || application.title || "求人タイトル未設定";
  };

  /*
   * 応募ステータス
   *
   * 現在のapplicationsテーブルでは
   * status = "0" で保存されているため、
   * まずは「未対応」として表示する。
   *
   * 後で
   * 0: 未対応
   * 1: 連絡済み
   * 2: 面接予定
   * 3: 採用
   * 4: 不採用
   * などへ拡張可能。
   */
  const handleStatusChange = async (
    application: Application,
    newStatus: string,
  ) => {
    const previousStatus = application.status ?? "0";

    try {
      setSavingStatusId(application.id);
      setErrorMessage("");

      let userId = "";

      if (liff.isLoggedIn()) {
        const profile = await liff.getProfile();
        userId = profile.userId;
      }

      if (!userId) {
        throw new Error("LINEユーザー情報を取得できませんでした。");
      }

      // 画面を先に更新
      setApplications((prev) =>
        prev.map((item) =>
          item.id === application.id ? { ...item, status: newStatus } : item,
        ),
      );

      setSelectedApplication((prev) =>
        prev?.id === application.id ? { ...prev, status: newStatus } : prev,
      );

      const response = await fetch("/api/applications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: application.id,
          userId,
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "応募ステータスを更新できませんでした。",
        );
      }
    } catch (error) {
      console.error("応募ステータス更新エラー:", error);

      // 更新失敗時は元の状態へ戻す
      setApplications((prev) =>
        prev.map((item) =>
          item.id === application.id
            ? { ...item, status: previousStatus }
            : item,
        ),
      );

      setSelectedApplication((prev) =>
        prev?.id === application.id
          ? { ...prev, status: previousStatus }
          : prev,
      );

      alert(
        error instanceof Error
          ? error.message
          : "応募ステータスを更新できませんでした。",
      );
    } finally {
      setSavingStatusId(null);
    }
  };

  const groupedApplications = useMemo(() => {
    if (jobId !== null) {
      return [];
    }

    const map = new Map<
      number,
      {
        jobId: number;
        title: string;
        companyName: string;
        applications: Application[];
      }
    >();

    applications.forEach((application) => {
      const current = map.get(application.job_id);

      if (current) {
        current.applications.push(application);
        return;
      }

      map.set(application.job_id, {
        jobId: application.job_id,
        title: getJobTitle(application),
        companyName: application.company_name || "",
        applications: [application],
      });
    });

    return Array.from(map.values());
  }, [applications, jobId]);

  const renderApplicationCard = (application: Application) => {
    return (
      <article
        key={application.id}
        style={{
          marginBottom: "12px",
          padding: "18px",
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: "17px",
                fontWeight: 700,
                color: "#111827",
              }}
            >
              👤 {application.name || "氏名未設定"}
            </div>

            <div
              style={{
                marginTop: "7px",
                display: "grid",
                gap: "5px",
                color: "#555",
                fontSize: "13px",
              }}
            >
              {application.email && <div>✉️ {application.email}</div>}

              {application.phone && <div>📞 {application.phone}</div>}

              {application.created_at && (
                <div>
                  📅 応募日：
                  {formatDateTime(application.created_at)}
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              flexShrink: 0,
              minWidth: "110px",
            }}
          >
            <select
              value={application.status ?? "0"}
              disabled={savingStatusId === application.id}
              onChange={(e) => handleStatusChange(application, e.target.value)}
              aria-label={`${application.name || "応募者"}の選考状況`}
              style={{
                width: "100%",
                padding: "7px 8px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                background: "#ffffff",
                color: "#374151",
                fontSize: "12px",
                fontWeight: 700,
                cursor: savingStatusId === application.id ? "wait" : "pointer",
              }}
            >
              <option value="0">未対応</option>
              <option value="1">連絡済み</option>
              <option value="2">面接予定</option>
              <option value="3">採用</option>
              <option value="4">不採用</option>
            </select>

            {savingStatusId === application.id && (
              <div
                style={{
                  marginTop: "4px",
                  color: "#777",
                  fontSize: "10px",
                  textAlign: "center",
                }}
              >
                保存中...
              </div>
            )}
          </div>
        </div>

        {jobId === null && (
          <div
            style={{
              marginTop: "13px",
              paddingTop: "12px",
              borderTop: "1px solid #f0f0f0",
              color: "#555",
              fontSize: "13px",
            }}
          >
            求人：{getJobTitle(application)}
          </div>
        )}

        {application.message && (
          <div
            style={{
              marginTop: "13px",
              padding: "12px",
              background: "#f8fafc",
              borderRadius: "8px",
              color: "#374151",
              fontSize: "13px",
              whiteSpace: "pre-wrap",
            }}
          >
            {application.message}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "14px",
          }}
        >
          {application.email && (
            <a
              href={`mailto:${application.email}`}
              style={{
                flex: 1,
                padding: "10px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                background: "#ffffff",
                color: "#374151",
                fontSize: "13px",
                fontWeight: 700,
                textAlign: "center",
                textDecoration: "none",
              }}
            >
              ✉️ メール
            </a>
          )}

          {application.phone && (
            <a
              href={`tel:${application.phone}`}
              style={{
                flex: 1,
                padding: "10px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                background: "#ffffff",
                color: "#374151",
                fontSize: "13px",
                fontWeight: 700,
                textAlign: "center",
                textDecoration: "none",
              }}
            >
              📞 電話
            </a>
          )}

          <button
            type="button"
            onClick={() => setSelectedApplication(application)}
            style={{
              flex: 1,
              padding: "10px",
              border: "none",
              borderRadius: "8px",
              background: "#06c755",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            詳細を見る
          </button>
        </div>
      </article>
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f6f7f9",
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          padding: "16px",
          background: "#ffffff",
          borderBottom: "1px solid #eeeeee",
        }}
      >
        <div
          style={{
            maxWidth: "700px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <button
            type="button"
            onClick={onBack}
            style={{
              border: "none",
              background: "transparent",
              padding: "6px 0",
              color: "#2563eb",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ← 求人管理
          </button>

          <div>
            <div
              style={{
                fontSize: "20px",
                fontWeight: 700,
              }}
            >
              👤 応募者管理
            </div>

            <div
              style={{
                marginTop: "2px",
                color: "#777",
                fontSize: "12px",
              }}
            >
              応募者情報を確認できます
            </div>
          </div>
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
            応募者を読み込んでいます...
          </div>
        )}

        {!loading && errorMessage && (
          <div
            style={{
              padding: "18px",
              background: "#ffffff",
              borderRadius: "10px",
              color: "#dc2626",
            }}
          >
            {errorMessage}
          </div>
        )}

        {!loading && !errorMessage && applications.length === 0 && (
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
              👤
            </div>

            <h2
              style={{
                margin: "12px 0 6px",
                fontSize: "18px",
              }}
            >
              まだ応募はありません
            </h2>

            <p
              style={{
                margin: 0,
                color: "#777",
                fontSize: "14px",
              }}
            >
              応募があるとここに表示されます
            </p>
          </div>
        )}

        {!loading &&
          !errorMessage &&
          jobId !== null &&
          applications.length > 0 && (
            <>
              <div
                style={{
                  marginBottom: "12px",
                  color: "#555",
                  fontSize: "13px",
                }}
              >
                応募者 {applications.length}名
              </div>

              {applications.map(renderApplicationCard)}
            </>
          )}

        {!loading &&
          !errorMessage &&
          jobId === null &&
          groupedApplications.map((group) => (
            <section
              key={group.jobId}
              style={{
                marginBottom: "22px",
              }}
            >
              <div
                style={{
                  marginBottom: "10px",
                  padding: "0 4px",
                }}
              >
                <div
                  style={{
                    fontSize: "17px",
                    fontWeight: 700,
                    color: "#111827",
                  }}
                >
                  {group.title}
                </div>

                {group.companyName && (
                  <div
                    style={{
                      marginTop: "3px",
                      color: "#777",
                      fontSize: "12px",
                    }}
                  >
                    {group.companyName}
                  </div>
                )}

                <div
                  style={{
                    marginTop: "4px",
                    color: "#555",
                    fontSize: "12px",
                  }}
                >
                  応募者 {group.applications.length}名
                </div>
              </div>

              {group.applications.map(renderApplicationCard)}
            </section>
          ))}
      </main>

      {/* 詳細モーダル */}
      {selectedApplication && (
        <div
          onClick={() => setSelectedApplication(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            background: "rgba(0, 0, 0, 0.45)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "520px",
              maxHeight: "80vh",
              overflowY: "auto",
              padding: "22px",
              background: "#ffffff",
              borderRadius: "14px",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "19px",
                    fontWeight: 700,
                  }}
                >
                  {selectedApplication.name || "氏名未設定"}
                </div>

                <div
                  style={{
                    marginTop: "4px",
                    color: "#777",
                    fontSize: "12px",
                  }}
                >
                  {getJobTitle(selectedApplication)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedApplication(null)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "22px",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                marginTop: "18px",
                display: "grid",
                gap: "12px",
                color: "#374151",
                fontSize: "14px",
              }}
            >
              <div>
                <strong>選考状況</strong>

                <select
                  value={selectedApplication.status ?? "0"}
                  disabled={savingStatusId === selectedApplication.id}
                  onChange={(e) =>
                    handleStatusChange(selectedApplication, e.target.value)
                  }
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: "7px",
                    padding: "10px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    background: "#ffffff",
                    color: "#374151",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  <option value="0">未対応</option>
                  <option value="1">連絡済み</option>
                  <option value="2">面接予定</option>
                  <option value="3">採用</option>
                  <option value="4">不採用</option>
                </select>

                {savingStatusId === selectedApplication.id && (
                  <div
                    style={{
                      marginTop: "5px",
                      color: "#777",
                      fontSize: "11px",
                    }}
                  >
                    保存中...
                  </div>
                )}
              </div>

              {selectedApplication.email && (
                <div>
                  <strong>メールアドレス</strong>
                  <br />
                  {selectedApplication.email}
                </div>
              )}

              {selectedApplication.phone && (
                <div>
                  <strong>電話番号</strong>
                  <br />
                  {selectedApplication.phone}
                </div>
              )}

              {selectedApplication.created_at && (
                <div>
                  <strong>応募日時</strong>
                  <br />
                  {formatDateTime(selectedApplication.created_at)}
                </div>
              )}

              {selectedApplication.message && (
                <div>
                  <strong>応募メッセージ</strong>

                  <div
                    style={{
                      marginTop: "6px",
                      padding: "12px",
                      background: "#f8fafc",
                      borderRadius: "8px",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {selectedApplication.message}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedApplication(null)}
              style={{
                width: "100%",
                marginTop: "22px",
                padding: "12px",
                border: "none",
                borderRadius: "8px",
                background: "#f3f4f6",
                color: "#374151",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
