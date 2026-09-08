import { useEffect, useMemo, useState } from "react";

type Consultation = {
  id: number;
  diagnosis_id: number | null;
  company_name: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  prefecture: string | null;
  consultation_message: string | null;
  status: string;
  consent_to_share: boolean;
  consented_at: string | null;
  created_at: string;
  industry: string | null;
  employee_count: string | null;
  capital: string | null;
  answers: Record<string, unknown> | null;
  subsidies: {
    id: number;
    name: string;
    course_name: string | null;
    match_level: string | null;
    score: number | null;
    matched_reasons: string[];
    required_checks: string[];
  }[];
};

const STATUS_OPTIONS = [
  { value: "new", label: "新規" },
  { value: "contacting", label: "連絡中" },
  { value: "consulting", label: "相談中" },
  { value: "assigned", label: "専門家割当済" },
  { value: "completed", label: "完了" },
  { value: "closed", label: "終了" },
];

const statusLabel = (value: string) =>
  STATUS_OPTIONS.find((item) => item.value === value)?.label ?? value;

export default function SubsidyConsultationManagement({
  onBack,
}: {
  onBack?: () => void;
}) {
  const [items, setItems] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filter, setFilter] = useState("all");
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/job-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "subsidy-consultation-list" }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "相談一覧を取得できませんでした");
      }
      setItems(data.consultations ?? []);
    } catch (e: any) {
      setError(e?.message || "相談一覧を取得できませんでした");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      filter === "all" ? items : items.filter((item) => item.status === filter),
    [items, filter],
  );

  const selected = items.find((item) => item.id === selectedId) ?? null;

  const updateStatus = async (id: number, status: string) => {
    try {
      setSavingId(id);
      setError("");
      const response = await fetch("/api/job-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "subsidy-consultation-status",
          consultationId: id,
          status,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "ステータスを更新できませんでした");
      }
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status } : item)),
      );
    } catch (e: any) {
      setError(e?.message || "ステータスを更新できませんでした");
    } finally {
      setSavingId(null);
    }
  };

  const fmt = (value: string | null | undefined) =>
    value ? new Date(value).toLocaleString("ja-JP") : "-";

  return (
    <main
      style={{ maxWidth: 980, margin: "0 auto", padding: "18px 14px 60px" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 18,
        }}
      >
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              border: "1px solid #d1d5db",
              background: "#fff",
              borderRadius: 10,
              padding: "9px 12px",
              cursor: "pointer",
            }}
          >
            ← 戻る
          </button>
        )}
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>💰 助成金相談管理</h1>
          <div style={{ marginTop: 4, color: "#6b7280", fontSize: 12 }}>
            助成金診断から申し込まれた相談を管理します
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          marginBottom: 14,
          paddingBottom: 2,
        }}
      >
        {[{ value: "all", label: "すべて" }, ...STATUS_OPTIONS].map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            style={{
              whiteSpace: "nowrap",
              border:
                filter === item.value
                  ? "1px solid #06c755"
                  : "1px solid #d1d5db",
              background: filter === item.value ? "#ecfdf3" : "#fff",
              color: filter === item.value ? "#047857" : "#374151",
              borderRadius: 999,
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div
          style={{
            marginBottom: 12,
            padding: 12,
            background: "#fef2f2",
            color: "#b91c1c",
            borderRadius: 10,
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 30, textAlign: "center" }}>読み込み中...</div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: 30,
            textAlign: "center",
            color: "#6b7280",
            background: "#fff",
            borderRadius: 14,
          }}
        >
          相談申込みはありません
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((item) => (
            <article
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              style={{
                padding: 15,
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>
                    {item.company_name || "会社名未登録"}
                  </div>
                  <div style={{ marginTop: 4, color: "#6b7280", fontSize: 12 }}>
                    {item.contact_name || "-"} ・ {item.prefecture || "-"}
                  </div>
                </div>
                <span
                  style={{
                    flexShrink: 0,
                    alignSelf: "flex-start",
                    padding: "5px 9px",
                    borderRadius: 999,
                    background: item.status === "new" ? "#fff7ed" : "#f3f4f6",
                    color: item.status === "new" ? "#c2410c" : "#374151",
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {statusLabel(item.status)}
                </span>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: "#374151" }}>
                {item.subsidies.length > 0
                  ? item.subsidies
                      .map((s) =>
                        [s.name, s.course_name].filter(Boolean).join(" / "),
                      )
                      .join("、")
                  : "相談助成金未登録"}
              </div>
              <div style={{ marginTop: 8, color: "#9ca3af", fontSize: 11 }}>
                受付：{fmt(item.created_at)}
              </div>
            </article>
          ))}
        </div>
      )}

      {selected && (
        <div
          onClick={() => setSelectedId(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,.35)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 760,
              maxHeight: "88vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: "18px 18px 0 0",
              padding: 18,
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 18, fontWeight: 900 }}>
                  {selected.company_name}
                </div>
                <div style={{ marginTop: 3, color: "#6b7280", fontSize: 12 }}>
                  相談ID #{selected.id}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                style={{
                  border: 0,
                  background: "transparent",
                  fontSize: 24,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
                ステータス
              </div>
              <select
                value={selected.status}
                disabled={savingId === selected.id}
                onChange={(e) => updateStatus(selected.id, e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px",
                  border: "1px solid #d1d5db",
                  borderRadius: 10,
                  background: "#fff",
                }}
              >
                {STATUS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <Section title="連絡先">
              <Row label="担当者" value={selected.contact_name} />
              <Row label="メール" value={selected.email} />
              <Row label="電話" value={selected.phone} />
              <Row label="都道府県" value={selected.prefecture} />
              <Row label="同意日時" value={fmt(selected.consented_at)} />
            </Section>

            <Section title="相談したい助成金">
              {selected.subsidies.length === 0 ? (
                <div style={{ color: "#6b7280", fontSize: 12 }}>
                  登録されていません
                </div>
              ) : (
                selected.subsidies.map((subsidy) => (
                  <div
                    key={subsidy.id}
                    style={{
                      marginBottom: 9,
                      padding: 11,
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 800 }}>
                      {subsidy.name}
                    </div>
                    {subsidy.course_name && (
                      <div
                        style={{ marginTop: 2, fontSize: 11, color: "#6b7280" }}
                      >
                        {subsidy.course_name}
                      </div>
                    )}
                    {subsidy.score != null && (
                      <div
                        style={{
                          marginTop: 5,
                          fontSize: 11,
                          color: "#047857",
                          fontWeight: 700,
                        }}
                      >
                        診断スコア {subsidy.score}%
                      </div>
                    )}
                  </div>
                ))
              )}
            </Section>

            <Section title="相談内容">
              <div
                style={{
                  whiteSpace: "pre-wrap",
                  fontSize: 13,
                  lineHeight: 1.7,
                }}
              >
                {selected.consultation_message || "相談内容の記入はありません"}
              </div>
            </Section>

            <Section title="診断時の会社情報">
              <Row label="業種" value={selected.industry} />
              <Row label="従業員数" value={selected.employee_count} />
              <Row label="資本金" value={selected.capital} />
            </Section>

            <div
              style={{
                marginTop: 18,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              {selected.phone && (
                <a
                  href={`tel:${selected.phone}`}
                  style={{
                    textAlign: "center",
                    padding: 12,
                    background: "#fff",
                    border: "1px solid #d1d5db",
                    borderRadius: 10,
                    color: "#111827",
                    textDecoration: "none",
                    fontWeight: 800,
                  }}
                >
                  📞 電話
                </a>
              )}
              {selected.email && (
                <a
                  href={`mailto:${selected.email}`}
                  style={{
                    textAlign: "center",
                    padding: 12,
                    background: "#06c755",
                    border: "1px solid #06c755",
                    borderRadius: 10,
                    color: "#fff",
                    textDecoration: "none",
                    fontWeight: 800,
                  }}
                >
                  ✉️ メール
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{ marginTop: 18, paddingTop: 15, borderTop: "1px solid #e5e7eb" }}
    >
      <div style={{ marginBottom: 9, fontSize: 14, fontWeight: 900 }}>
        {title}
      </div>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: unknown }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "90px 1fr",
        gap: 8,
        marginBottom: 7,
        fontSize: 12,
      }}
    >
      <div style={{ color: "#6b7280" }}>{label}</div>
      <div style={{ color: "#111827", wordBreak: "break-word" }}>
        {value == null || value === "" ? "-" : String(value)}
      </div>
    </div>
  );
}
