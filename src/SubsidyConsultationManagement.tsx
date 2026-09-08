import { useEffect, useMemo, useState } from "react";

type Subsidy = {
  id: number;
  name: string;
  course_name: string | null;
  match_level: string | null;
  score: number | null;
  matched_reasons: string[];
  required_checks: string[];
};

type Assignment = {
  id: number;
  status: string;
  assigned_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  completed_at: string | null;
  note: string | null;
  expert_id: number;
  expert_type: string;
  expert_company_name: string | null;
  expert_name: string;
  expert_email: string | null;
  expert_phone: string | null;
  expert_prefecture: string | null;
  expert_website_url: string | null;
  expert_license_number: string | null;
};

type Activity = {
  id: number;
  contact_type: string;
  contacted_at: string;
  memo: string | null;
  created_at: string;
  expert_id: number | null;
  expert_name: string | null;
  expert_company_name: string | null;
};

type Expert = {
  id: number;
  expert_type: string;
  company_name: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  postal_code: string | null;
  prefecture: string | null;
  city: string | null;
  address: string | null;
  website_url: string | null;
  license_number: string | null;
  introduction: string | null;
  active: boolean;
};

type Consultation = {
  id: number;
  diagnosis_id: number | null;
  company_name: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  prefecture: string | null;
  consultation_message: string | null;
  admin_memo: string | null;
  status: string;
  consent_to_share: boolean;
  consented_at: string | null;
  created_at: string;
  industry: string | null;
  employee_count: string | null;
  capital: string | null;
  answers: Record<string, unknown> | null;
  subsidies: Subsidy[];
  assignments: Assignment[];
  activities: Activity[];
};

const STATUS_OPTIONS = [
  { value: "new", label: "新規" },
  { value: "contacting", label: "連絡中" },
  { value: "consulting", label: "相談中" },
  { value: "assigned", label: "専門家割当済" },
  { value: "completed", label: "完了" },
  { value: "closed", label: "終了" },
];

const CONTACT_TYPES = [
  { value: "phone", label: "電話" },
  { value: "email", label: "メール" },
  { value: "line", label: "LINE" },
  { value: "online_meeting", label: "オンライン面談" },
  { value: "visit", label: "訪問" },
  { value: "other", label: "その他" },
];

const statusLabel = (value: string) =>
  STATUS_OPTIONS.find((item) => item.value === value)?.label ?? value;

const contactTypeLabel = (value: string) =>
  CONTACT_TYPES.find((item) => item.value === value)?.label ?? value;

const expertTypeLabel = (value: string) => {
  if (value === "social_insurance_consultant") return "社会保険労務士";
  if (value === "subsidy_consultant") return "助成金コンサル";
  return "専門家";
};

const nowLocalInput = () => {
  const d = new Date();
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
};

export default function SubsidyConsultationManagement() {
  const [items, setItems] = useState<Consultation[]>([]);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filter, setFilter] = useState("all");
  const [savingId, setSavingId] = useState<number | null>(null);

  const [expertId, setExpertId] = useState("");
  const [assignmentNote, setAssignmentNote] = useState("");
  const [activityType, setActivityType] = useState("phone");
  const [activityAt, setActivityAt] = useState(nowLocalInput());
  const [activityMemo, setActivityMemo] = useState("");
  const [activityExpertId, setActivityExpertId] = useState("");
  const [adminMemo, setAdminMemo] = useState("");
  const [adminTab, setAdminTab] = useState<"consultations" | "experts">(
    "consultations",
  );
  const [editingExpertId, setEditingExpertId] = useState<number | null>(null);
  const [showExpertForm, setShowExpertForm] = useState(false);
  const [expertForm, setExpertForm] = useState({
    expertType: "social_insurance_consultant",
    name: "",
    companyName: "",
    email: "",
    phone: "",
    postalCode: "",
    prefecture: "",
    city: "",
    address: "",
    websiteUrl: "",
    licenseNumber: "",
    introduction: "",
  });

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const [consultationResponse, expertResponse] = await Promise.all([
        fetch("/api/job-options", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "subsidy-consultation-list" }),
        }),
        fetch("/api/job-options", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "subsidy-expert-list" }),
        }),
      ]);

      const consultationData = await consultationResponse.json();
      const expertData = await expertResponse.json();

      if (!consultationResponse.ok || !consultationData.success) {
        throw new Error(
          consultationData.message || "相談一覧を取得できませんでした",
        );
      }

      if (!expertResponse.ok || !expertData.success) {
        throw new Error(
          expertData.message || "専門家一覧を取得できませんでした",
        );
      }

      setItems(consultationData.consultations ?? []);
      setExperts(expertData.experts ?? []);
    } catch (e: any) {
      setError(e?.message || "管理データを取得できませんでした");
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
  const currentAssignment = selected?.assignments?.[0] ?? null;

  useEffect(() => {
    if (!selected) return;

    setAdminMemo(selected.admin_memo ?? "");
    setExpertId(currentAssignment ? String(currentAssignment.expert_id) : "");
    setAssignmentNote("");
    setActivityType("phone");
    setActivityAt(nowLocalInput());
    setActivityMemo("");
    setActivityExpertId(
      currentAssignment ? String(currentAssignment.expert_id) : "",
    );
  }, [selectedId]);

  const postAction = async (body: Record<string, unknown>) => {
    const response = await fetch("/api/job-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "処理に失敗しました");
    }

    return data;
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      setSavingId(id);
      setError("");
      await postAction({
        action: "subsidy-consultation-status",
        consultationId: id,
        status,
      });
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status } : item)),
      );
    } catch (e: any) {
      setError(e?.message || "ステータスを更新できませんでした");
    } finally {
      setSavingId(null);
    }
  };

  const assignExpert = async () => {
    if (!selected) return;
    if (!expertId) {
      setError("専門家を選択してください");
      return;
    }

    try {
      setSavingId(selected.id);
      setError("");
      await postAction({
        action: "subsidy-assign-expert",
        consultationId: selected.id,
        expertId: Number(expertId),
        note: assignmentNote,
      });
      await load();
      setSelectedId(selected.id);
    } catch (e: any) {
      setError(e?.message || "専門家を割り当てできませんでした");
    } finally {
      setSavingId(null);
    }
  };

  const addActivity = async () => {
    if (!selected) return;
    if (!activityAt) {
      setError("連絡日時を入力してください");
      return;
    }

    try {
      setSavingId(selected.id);
      setError("");
      await postAction({
        action: "subsidy-consultation-activity-add",
        consultationId: selected.id,
        expertId: activityExpertId ? Number(activityExpertId) : null,
        contactType: activityType,
        contactedAt: activityAt,
        memo: activityMemo,
      });
      await load();
      setSelectedId(selected.id);
      setActivityAt(nowLocalInput());
      setActivityMemo("");
    } catch (e: any) {
      setError(e?.message || "対応履歴を追加できませんでした");
    } finally {
      setSavingId(null);
    }
  };

  const saveAdminMemo = async () => {
    if (!selected) return;

    try {
      setSavingId(selected.id);
      setError("");
      await postAction({
        action: "subsidy-consultation-memo",
        consultationId: selected.id,
        adminMemo,
      });
      setItems((prev) =>
        prev.map((item) =>
          item.id === selected.id ? { ...item, admin_memo: adminMemo } : item,
        ),
      );
    } catch (e: any) {
      setError(e?.message || "管理メモを保存できませんでした");
    } finally {
      setSavingId(null);
    }
  };

  const resetExpertForm = () => {
    setEditingExpertId(null);
    setExpertForm({
      expertType: "social_insurance_consultant",
      name: "",
      companyName: "",
      email: "",
      phone: "",
      postalCode: "",
      prefecture: "",
      city: "",
      address: "",
      websiteUrl: "",
      licenseNumber: "",
      introduction: "",
    });
  };

  const openNewExpert = () => {
    resetExpertForm();
    setShowExpertForm(true);
  };

  const openEditExpert = (expert: Expert) => {
    setEditingExpertId(expert.id);
    setExpertForm({
      expertType: expert.expert_type,
      name: expert.name ?? "",
      companyName: expert.company_name ?? "",
      email: expert.email ?? "",
      phone: expert.phone ?? "",
      postalCode: expert.postal_code ?? "",
      prefecture: expert.prefecture ?? "",
      city: expert.city ?? "",
      address: expert.address ?? "",
      websiteUrl: expert.website_url ?? "",
      licenseNumber: expert.license_number ?? "",
      introduction: expert.introduction ?? "",
    });
    setShowExpertForm(true);
  };

  const saveExpert = async () => {
    if (!expertForm.name.trim()) {
      setError("専門家の氏名を入力してください");
      return;
    }
    try {
      setError("");
      await postAction({
        action: editingExpertId
          ? "subsidy-expert-update"
          : "subsidy-expert-create",
        expertId: editingExpertId ?? undefined,
        ...expertForm,
      });
      setShowExpertForm(false);
      resetExpertForm();
      await load();
      setAdminTab("experts");
    } catch (e: any) {
      setError(e?.message || "専門家を保存できませんでした");
    }
  };

  const toggleExpert = async (expert: Expert) => {
    try {
      setError("");
      await postAction({
        action: "subsidy-expert-status",
        expertId: expert.id,
        active: !expert.active,
      });
      await load();
      setAdminTab("experts");
    } catch (e: any) {
      setError(e?.message || "専門家の状態を変更できませんでした");
    }
  };

  const fmt = (value: string | null | undefined) =>
    value ? new Date(value).toLocaleString("ja-JP") : "-";

  return (
    <main
      style={{
        maxWidth: 1050,
        margin: "0 auto",
        padding: "24px 14px 60px",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>💰 助成金相談管理</h1>
        <div style={{ marginTop: 5, color: "#6b7280", fontSize: 12 }}>
          相談内容・専門家割当・対応履歴を一元管理します
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <button
          type="button"
          onClick={() => setAdminTab("consultations")}
          style={adminTab === "consultations" ? tabActive : tabButton}
        >
          💬 相談管理
        </button>
        <button
          type="button"
          onClick={() => setAdminTab("experts")}
          style={adminTab === "experts" ? tabActive : tabButton}
        >
          👤 専門家管理
        </button>
      </div>

      {adminTab === "consultations" && (
        <>
          <div
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              marginBottom: 14,
              paddingBottom: 2,
            }}
          >
            {[{ value: "all", label: "すべて" }, ...STATUS_OPTIONS].map(
              (item) => (
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
              ),
            )}
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
            <div style={{ padding: 30, textAlign: "center" }}>
              読み込み中...
            </div>
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
              {filtered.map((item) => {
                const latestAssignment = item.assignments?.[0];

                return (
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
                        <div
                          style={{
                            marginTop: 4,
                            color: "#6b7280",
                            fontSize: 12,
                          }}
                        >
                          {item.contact_name || "-"} ・ {item.prefecture || "-"}
                        </div>
                      </div>

                      <span
                        style={{
                          flexShrink: 0,
                          alignSelf: "flex-start",
                          padding: "5px 9px",
                          borderRadius: 999,
                          background:
                            item.status === "new" ? "#fff7ed" : "#f3f4f6",
                          color: item.status === "new" ? "#c2410c" : "#374151",
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        {statusLabel(item.status)}
                      </span>
                    </div>

                    <div
                      style={{ marginTop: 10, fontSize: 12, color: "#374151" }}
                    >
                      {item.subsidies.length > 0
                        ? item.subsidies
                            .map((s) =>
                              [s.name, s.course_name]
                                .filter(Boolean)
                                .join(" / "),
                            )
                            .join("、")
                        : "相談助成金未登録"}
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        display: "flex",
                        gap: 12,
                        flexWrap: "wrap",
                        color: "#6b7280",
                        fontSize: 11,
                      }}
                    >
                      <span>受付：{fmt(item.created_at)}</span>
                      <span>
                        専門家：
                        {latestAssignment
                          ? latestAssignment.expert_name
                          : "未割当"}
                      </span>
                      <span>
                        最終連絡：
                        {item.activities?.[0]
                          ? fmt(item.activities[0].contacted_at)
                          : "未連絡"}
                      </span>
                    </div>
                  </article>
                );
              })}
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
                  maxWidth: 820,
                  maxHeight: "92vh",
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
                    <div style={{ fontSize: 19, fontWeight: 900 }}>
                      {selected.company_name}
                    </div>
                    <div
                      style={{ marginTop: 3, color: "#6b7280", fontSize: 12 }}
                    >
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
                  <Label>ステータス</Label>
                  <select
                    value={selected.status}
                    disabled={savingId === selected.id}
                    onChange={(e) => updateStatus(selected.id, e.target.value)}
                    style={inputStyle}
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
                    <Muted>登録されていません</Muted>
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
                            style={{
                              marginTop: 2,
                              fontSize: 11,
                              color: "#6b7280",
                            }}
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
                    {selected.consultation_message ||
                      "相談内容の記入はありません"}
                  </div>
                </Section>

                <Section title="担当専門家">
                  {currentAssignment ? (
                    <div
                      style={{
                        marginBottom: 14,
                        padding: 13,
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        borderRadius: 12,
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 900 }}>
                        {currentAssignment.expert_name}
                      </div>
                      <div
                        style={{
                          marginTop: 3,
                          fontSize: 12,
                          color: "#374151",
                        }}
                      >
                        {expertTypeLabel(currentAssignment.expert_type)}
                        {currentAssignment.expert_company_name
                          ? ` ・ ${currentAssignment.expert_company_name}`
                          : ""}
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <Row
                          label="割当日時"
                          value={fmt(currentAssignment.assigned_at)}
                        />
                        <Row
                          label="電話"
                          value={currentAssignment.expert_phone}
                        />
                        <Row
                          label="メール"
                          value={currentAssignment.expert_email}
                        />
                        <Row
                          label="登録番号"
                          value={currentAssignment.expert_license_number}
                        />
                      </div>
                    </div>
                  ) : (
                    <Muted>まだ専門家が割り当てられていません</Muted>
                  )}

                  <Label>専門家を選択</Label>
                  <select
                    value={expertId}
                    onChange={(e) => setExpertId(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">専門家を選択してください</option>
                    {experts.map((expert) => (
                      <option key={expert.id} value={expert.id}>
                        {expert.name}
                        {expert.company_name ? ` / ${expert.company_name}` : ""}
                        {expert.prefecture ? ` / ${expert.prefecture}` : ""}
                      </option>
                    ))}
                  </select>

                  <div style={{ marginTop: 10 }}>
                    <Label>割当メモ（任意）</Label>
                    <textarea
                      value={assignmentNote}
                      onChange={(e) => setAssignmentNote(e.target.value)}
                      rows={2}
                      style={inputStyle}
                      placeholder="例：正社員化コースの相談を中心に対応依頼"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={assignExpert}
                    disabled={savingId === selected.id || !expertId}
                    style={primaryButton}
                  >
                    {currentAssignment
                      ? "専門家を再割当する"
                      : "専門家を割り当てる"}
                  </button>

                  {selected.assignments.length > 1 && (
                    <div style={{ marginTop: 14 }}>
                      <Label>割当履歴</Label>
                      {selected.assignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          style={{
                            padding: "8px 0",
                            borderBottom: "1px solid #f3f4f6",
                            fontSize: 12,
                          }}
                        >
                          <strong>{assignment.expert_name}</strong>
                          <span style={{ color: "#6b7280" }}>
                            {" "}
                            ・ {fmt(assignment.assigned_at)}
                          </span>
                          {assignment.note && (
                            <div style={{ marginTop: 3, color: "#4b5563" }}>
                              {assignment.note}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                <Section title="対応履歴">
                  <div
                    style={{
                      padding: 13,
                      background: "#f9fafb",
                      borderRadius: 12,
                      marginBottom: 14,
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 10,
                      }}
                    >
                      <div>
                        <Label>連絡方法</Label>
                        <select
                          value={activityType}
                          onChange={(e) => setActivityType(e.target.value)}
                          style={inputStyle}
                        >
                          {CONTACT_TYPES.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>連絡日時</Label>
                        <input
                          type="datetime-local"
                          value={activityAt}
                          onChange={(e) => setActivityAt(e.target.value)}
                          style={inputStyle}
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <Label>対応した専門家（任意）</Label>
                      <select
                        value={activityExpertId}
                        onChange={(e) => setActivityExpertId(e.target.value)}
                        style={inputStyle}
                      >
                        <option value="">求人AIナビ運営側</option>
                        {experts.map((expert) => (
                          <option key={expert.id} value={expert.id}>
                            {expert.name}
                            {expert.company_name
                              ? ` / ${expert.company_name}`
                              : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <Label>対応メモ</Label>
                      <textarea
                        value={activityMemo}
                        onChange={(e) => setActivityMemo(e.target.value)}
                        rows={3}
                        style={inputStyle}
                        placeholder="例：必要書類について説明。来週再度連絡予定"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={addActivity}
                      disabled={savingId === selected.id}
                      style={primaryButton}
                    >
                      ＋ 対応履歴を追加
                    </button>
                  </div>

                  {selected.activities.length === 0 ? (
                    <Muted>まだ対応履歴はありません</Muted>
                  ) : (
                    selected.activities.map((activity) => (
                      <div
                        key={activity.id}
                        style={{
                          position: "relative",
                          padding: "0 0 15px 18px",
                          borderLeft: "2px solid #d1fae5",
                          marginLeft: 6,
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            left: -6,
                            top: 2,
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: "#06c755",
                          }}
                        />
                        <div style={{ fontSize: 12, fontWeight: 800 }}>
                          {fmt(activity.contacted_at)} ・{" "}
                          {contactTypeLabel(activity.contact_type)}
                        </div>
                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 11,
                            color: "#6b7280",
                          }}
                        >
                          対応：
                          {activity.expert_name
                            ? `${activity.expert_name}${
                                activity.expert_company_name
                                  ? ` / ${activity.expert_company_name}`
                                  : ""
                              }`
                            : "求人AIナビ運営側"}
                        </div>
                        {activity.memo && (
                          <div
                            style={{
                              marginTop: 6,
                              whiteSpace: "pre-wrap",
                              fontSize: 12,
                              lineHeight: 1.6,
                            }}
                          >
                            {activity.memo}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </Section>

                <Section title="管理メモ">
                  <textarea
                    value={adminMemo}
                    onChange={(e) => setAdminMemo(e.target.value)}
                    rows={5}
                    style={inputStyle}
                    placeholder="運営側だけで確認するメモを入力"
                  />
                  <button
                    type="button"
                    onClick={saveAdminMemo}
                    disabled={savingId === selected.id}
                    style={primaryButton}
                  >
                    管理メモを保存
                  </button>
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
                    <a href={`tel:${selected.phone}`} style={secondaryLink}>
                      📞 相談者へ電話
                    </a>
                  )}
                  {selected.email && (
                    <a
                      href={`mailto:${selected.email}`}
                      style={{
                        ...secondaryLink,
                        background: "#06c755",
                        borderColor: "#06c755",
                        color: "#fff",
                      }}
                    >
                      ✉️ 相談者へメール
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {adminTab === "experts" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>専門家管理</div>
              <div style={{ marginTop: 3, fontSize: 12, color: "#6b7280" }}>
                相談先となる社会保険労務士・助成金コンサル等を登録します
              </div>
            </div>
            <button
              type="button"
              onClick={openNewExpert}
              style={{ ...primaryButton, width: "auto", marginTop: 0 }}
            >
              ＋ 専門家を登録
            </button>
          </div>

          {experts.length === 0 ? (
            <div
              style={{
                padding: 30,
                textAlign: "center",
                background: "#fff",
                borderRadius: 14,
                color: "#6b7280",
              }}
            >
              専門家はまだ登録されていません
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {experts.map((expert) => (
                <article
                  key={expert.id}
                  style={{
                    padding: 15,
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 14,
                    opacity: expert.active ? 1 : 0.6,
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
                      <div style={{ fontWeight: 900 }}>{expert.name}</div>
                      <div
                        style={{ marginTop: 3, fontSize: 12, color: "#4b5563" }}
                      >
                        {expertTypeLabel(expert.expert_type)}
                        {expert.company_name
                          ? ` ・ ${expert.company_name}`
                          : ""}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: expert.active ? "#047857" : "#6b7280",
                      }}
                    >
                      {expert.active ? "有効" : "無効"}
                    </span>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <Row label="都道府県" value={expert.prefecture} />
                    <Row label="電話" value={expert.phone} />
                    <Row label="メール" value={expert.email} />
                    <Row label="登録番号" value={expert.license_number} />
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      marginTop: 10,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => openEditExpert(expert)}
                      style={{ ...secondaryLink, cursor: "pointer" }}
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleExpert(expert)}
                      style={{
                        ...secondaryLink,
                        cursor: "pointer",
                        color: expert.active ? "#b91c1c" : "#047857",
                      }}
                    >
                      {expert.active ? "無効にする" : "有効にする"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {showExpertForm && (
        <div
          onClick={() => setShowExpertForm(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
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
              maxWidth: 720,
              maxHeight: "92vh",
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
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 19, fontWeight: 900 }}>
                {editingExpertId ? "専門家を編集" : "専門家を新規登録"}
              </div>
              <button
                type="button"
                onClick={() => setShowExpertForm(false)}
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

            <div style={{ marginTop: 16 }}>
              <Label>専門家種別 *</Label>
              <select
                value={expertForm.expertType}
                onChange={(e) =>
                  setExpertForm({ ...expertForm, expertType: e.target.value })
                }
                style={inputStyle}
              >
                <option value="social_insurance_consultant">
                  社会保険労務士
                </option>
                <option value="subsidy_consultant">助成金コンサル</option>
                <option value="other">その他の専門家</option>
              </select>
            </div>
            <ExpertInput
              label="氏名 *"
              value={expertForm.name}
              onChange={(v) => setExpertForm({ ...expertForm, name: v })}
            />
            <ExpertInput
              label="事務所・会社名"
              value={expertForm.companyName}
              onChange={(v) => setExpertForm({ ...expertForm, companyName: v })}
            />
            <ExpertInput
              label="メール"
              type="email"
              value={expertForm.email}
              onChange={(v) => setExpertForm({ ...expertForm, email: v })}
            />
            <ExpertInput
              label="電話番号"
              type="tel"
              value={expertForm.phone}
              onChange={(v) => setExpertForm({ ...expertForm, phone: v })}
            />
            <ExpertInput
              label="郵便番号"
              value={expertForm.postalCode}
              onChange={(v) => setExpertForm({ ...expertForm, postalCode: v })}
            />
            <ExpertInput
              label="都道府県"
              value={expertForm.prefecture}
              onChange={(v) => setExpertForm({ ...expertForm, prefecture: v })}
            />
            <ExpertInput
              label="市区町村"
              value={expertForm.city}
              onChange={(v) => setExpertForm({ ...expertForm, city: v })}
            />
            <ExpertInput
              label="住所"
              value={expertForm.address}
              onChange={(v) => setExpertForm({ ...expertForm, address: v })}
            />
            <ExpertInput
              label="Webサイト"
              type="url"
              value={expertForm.websiteUrl}
              onChange={(v) => setExpertForm({ ...expertForm, websiteUrl: v })}
            />
            <ExpertInput
              label="登録番号"
              value={expertForm.licenseNumber}
              onChange={(v) =>
                setExpertForm({ ...expertForm, licenseNumber: v })
              }
            />
            <div style={{ marginTop: 10 }}>
              <Label>紹介文</Label>
              <textarea
                rows={4}
                value={expertForm.introduction}
                onChange={(e) =>
                  setExpertForm({ ...expertForm, introduction: e.target.value })
                }
                style={inputStyle}
              />
            </div>
            <button type="button" onClick={saveExpert} style={primaryButton}>
              {editingExpertId ? "変更を保存" : "専門家を登録"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

const tabButton: React.CSSProperties = {
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#374151",
  borderRadius: 10,
  padding: "10px 15px",
  fontWeight: 800,
  cursor: "pointer",
};
const tabActive: React.CSSProperties = {
  ...tabButton,
  border: "1px solid #06c755",
  background: "#ecfdf3",
  color: "#047857",
};

function ExpertInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div style={{ marginTop: 10 }}>
      <Label>{label}</Label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 11px",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  background: "#fff",
  fontSize: 13,
};

const primaryButton: React.CSSProperties = {
  width: "100%",
  marginTop: 10,
  border: "none",
  background: "#06c755",
  color: "#fff",
  borderRadius: 10,
  padding: "11px 13px",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryLink: React.CSSProperties = {
  textAlign: "center",
  padding: 12,
  background: "#fff",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  color: "#111827",
  textDecoration: "none",
  fontWeight: 800,
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        marginTop: 18,
        paddingTop: 15,
        borderTop: "1px solid #e5e7eb",
      }}
    >
      <div style={{ marginBottom: 9, fontSize: 14, fontWeight: 900 }}>
        {title}
      </div>
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginBottom: 6,
        fontSize: 12,
        fontWeight: 800,
        color: "#374151",
      }}
    >
      {children}
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <div style={{ color: "#6b7280", fontSize: 12 }}>{children}</div>;
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
