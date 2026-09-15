// src/PublicJobList.tsx

import { useEffect, useState } from "react";

type PublicJob = {
  id: number;
  public_id: string;
  status: string;

  title: string | null;
  ai_title: string | null;

  company_name: string | null;

  job_title: string | null;

  employment_type: string | null;
  ai_employment_type: string | null;

  salary_type: string | null;
  salary: string | null;
  ai_salary: string | null;

  postal_code: string | null;
  prefecture: string | null;
  city: string | null;
  street_address: string | null;
  building_name: string | null;
  location: string | null;
  ai_location: string | null;

  nearest_station_name?: string | null;
  nearest_station_walk_minutes?: string | null;
  catch_copy?: string | null;
  ai_catch_copy?: string | null;

  job_description: string | null;
  ai_description: string | null;

  created_at: string;
  updated_at: string;
};

export default function PublicJobList() {
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [keyword, setKeyword] = useState("");
  const [employmentFilter, setEmploymentFilter] = useState("");

  useEffect(() => {
    const loadJobs = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const response = await fetch("/api/jobs?action=public-list");

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "公開求人一覧を取得できませんでした。",
          );
        }

        setJobs(Array.isArray(data.jobs) ? data.jobs : []);
      } catch (error) {
        console.error("公開求人一覧取得エラー:", error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "公開求人一覧を取得できませんでした。",
        );
      } finally {
        setLoading(false);
      }
    };

    loadJobs();
  }, []);

  const getTitle = (job: PublicJob) => {
    return job.ai_title || job.title || job.job_title || "求人情報";
  };

  const getEmploymentType = (job: PublicJob) => {
    return job.ai_employment_type || job.employment_type || "";
  };

  const getSalary = (job: PublicJob) => {
    if (job.ai_salary) {
      return job.ai_salary;
    }

    if (!job.salary) {
      return "";
    }

    if (job.salary_type) {
      return `${job.salary_type} ${job.salary}`;
    }

    return job.salary;
  };

  const getLocation = (job: PublicJob) => {
    const address = [
      job.prefecture,
      job.city,
      job.street_address,
      job.building_name,
    ]
      .filter(Boolean)
      .join("");

    return address || job.ai_location || job.location || "";
  };

  const getDescription = (job: PublicJob) => {
    const description = job.ai_description || job.job_description || "";

    if (description.length <= 100) {
      return description;
    }

    return `${description.slice(0, 100)}...`;
  };

  const employmentTypes = Array.from(
    new Set(
      jobs
        .map((job) => getEmploymentType(job))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const filteredJobs = jobs.filter((job) => {
    const searchText = [
      getTitle(job),
      job.company_name || "",
      getLocation(job),
      getDescription(job),
      job.nearest_station_name || "",
    ]
      .join(" ")
      .toLowerCase();

    const normalizedKeyword = keyword.trim().toLowerCase();
    const matchesKeyword =
      !normalizedKeyword || searchText.includes(normalizedKeyword);
    const matchesEmployment =
      !employmentFilter || getEmploymentType(job) === employmentFilter;

    return matchesKeyword && matchesEmployment;
  });

  const getAccess = (job: PublicJob) => {
    if (!job.nearest_station_name) return "";
    const station = job.nearest_station_name.replace(/駅+$/g, "");
    return job.nearest_station_walk_minutes
      ? `${station}駅から徒歩${job.nearest_station_walk_minutes}分`
      : `${station}駅`;
  };

  const getCatchCopy = (job: PublicJob) => {
    return job.ai_catch_copy || job.catch_copy || "";
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <p>求人情報を読み込んでいます...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <a href="/" style={styles.logo}>
            TERRACE JOBS
          </a>
        </div>
      </header>

      <main style={styles.container}>
        <div style={styles.pageTitleArea}>
          <div style={styles.brandTag}>TERRACE JOBS</div>
          <h1 style={styles.pageTitle}>あなたに合う仕事を見つけよう</h1>

          <p style={styles.pageDescription}>
            仕事との出会いを、もっとシンプルに。
          </p>
        </div>

        <div style={styles.searchPanel}>
          <div style={styles.searchField}>
            <label style={styles.searchLabel}>キーワード</label>
            <input
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="職種・会社名・勤務地・駅名"
              style={styles.searchInput}
            />
          </div>

          <div style={styles.searchField}>
            <label style={styles.searchLabel}>雇用形態</label>
            <select
              value={employmentFilter}
              onChange={(e) => setEmploymentFilter(e.target.value)}
              style={styles.searchInput}
            >
              <option value="">すべて</option>
              {employmentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.resultCount}>{filteredJobs.length}件の求人</div>
        </div>

        {errorMessage && <div style={styles.error}>{errorMessage}</div>}

        {!errorMessage && jobs.length === 0 && (
          <div style={styles.empty}>現在公開中の求人はありません。</div>
        )}

        {!errorMessage && jobs.length > 0 && filteredJobs.length === 0 && (
          <div style={styles.empty}>
            条件に一致する求人がありません。検索条件を変更してみてください。
          </div>
        )}

        <div style={styles.jobList}>
          {filteredJobs.map((job) => {
            const title = getTitle(job);
            const employmentType = getEmploymentType(job);
            const salary = getSalary(job);
            const location = getLocation(job);
            const description = getDescription(job);
            const access = getAccess(job);
            const catchCopy = getCatchCopy(job);

            return (
              <article key={job.id} style={styles.jobCard}>
                <h2 style={styles.jobTitle}>
                  <a
                    href={`/jobs/${job.public_id}`}
                    style={styles.jobTitleLink}
                  >
                    {title}
                  </a>
                </h2>

                {job.company_name && (
                  <div style={styles.companyName}>{job.company_name}</div>
                )}

                {catchCopy && <p style={styles.catchCopy}>{catchCopy}</p>}

                <div style={styles.metaList}>
                  {employmentType && (
                    <div style={styles.metaItem}>
                      <span>雇用形態</span>
                      <strong>{employmentType}</strong>
                    </div>
                  )}

                  {salary && (
                    <div style={styles.metaItem}>
                      <span>給与</span>
                      <strong>{salary}</strong>
                    </div>
                  )}

                  {location && (
                    <div style={styles.metaItem}>
                      <span>勤務地</span>
                      <strong>{location}</strong>
                    </div>
                  )}

                  {access && (
                    <div style={styles.metaItem}>
                      <span>アクセス</span>
                      <strong>{access}</strong>
                    </div>
                  )}
                </div>

                {description && <p style={styles.description}>{description}</p>}

                <div style={styles.buttonArea}>
                  <a
                    href={`/jobs/${job.public_id}`}
                    style={styles.detailButton}
                  >
                    求人を見る
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </main>

      <footer style={styles.footer}>
        <div style={styles.footerLinks}>
          <a href="/company" style={styles.footerLink}>
            運営会社
          </a>

          <span>｜</span>

          <a href="/privacy" style={styles.footerLink}>
            プライバシーポリシー
          </a>
        </div>

        <div style={styles.copyright}>© TERRACE JOBS</div>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f6f8fc",
    color: "#222",
  },

  header: {
    background: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
  },

  headerInner: {
    maxWidth: "1040px",
    margin: "0 auto",
    padding: "18px 20px",
  },

  logo: {
    fontSize: "22px",
    fontWeight: "800",
    letterSpacing: "0.04em",
    color: "#2563eb",
    textDecoration: "none",
  },

  container: {
    maxWidth: "1040px",
    margin: "0 auto",
    padding: "42px 20px 72px",
  },

  pageTitleArea: {
    marginBottom: "24px",
  },

  brandTag: {
    marginBottom: "8px",
    color: "#2563eb",
    fontSize: "12px",
    fontWeight: "800",
    letterSpacing: "0.12em",
  },

  pageTitle: {
    margin: "0 0 10px",
    fontSize: "clamp(26px, 5vw, 38px)",
    lineHeight: 1.3,
  },

  pageDescription: {
    margin: 0,
    color: "#666",
    lineHeight: 1.7,
  },

  searchPanel: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: "14px",
    padding: "18px",
    marginBottom: "24px",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    boxShadow: "0 2px 10px rgba(15,23,42,0.04)",
  },

  searchField: {
    flex: "1 1 240px",
  },

  searchLabel: {
    display: "block",
    marginBottom: "7px",
    fontSize: "13px",
    fontWeight: "700",
    color: "#374151",
  },

  searchInput: {
    width: "100%",
    height: "46px",
    boxSizing: "border-box",
    padding: "0 13px",
    border: "1px solid #d1d5db",
    borderRadius: "9px",
    background: "#fff",
    color: "#111827",
    fontSize: "15px",
  },

  resultCount: {
    padding: "0 4px 12px",
    color: "#6b7280",
    fontSize: "13px",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },

  error: {
    padding: "16px",
    marginBottom: "20px",
    borderRadius: "8px",
    background: "#fff",
    color: "#c00",
  },

  empty: {
    padding: "40px 20px",
    textAlign: "center",
    background: "#fff",
    borderRadius: "12px",
    color: "#666",
  },

  jobList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },

  jobCard: {
    padding: "24px",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    boxShadow: "0 3px 14px rgba(15,23,42,0.05)",
  },

  jobTitle: {
    margin: "0 0 8px",
    fontSize: "20px",
    lineHeight: 1.5,
  },

  jobTitleLink: {
    color: "#111",
    textDecoration: "none",
  },

  companyName: {
    marginBottom: "10px",
    color: "#555",
    fontSize: "14px",
    fontWeight: "600",
  },

  catchCopy: {
    margin: "0 0 16px",
    color: "#2563eb",
    fontSize: "14px",
    fontWeight: "700",
    lineHeight: 1.7,
  },

  metaList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "16px",
  },

  metaItem: {
    display: "flex",
    gap: "12px",
    fontSize: "14px",
    lineHeight: 1.6,
  },

  description: {
    margin: "0 0 18px",
    color: "#555",
    lineHeight: 1.8,
    whiteSpace: "pre-wrap",
  },

  buttonArea: {
    display: "flex",
    justifyContent: "flex-end",
  },

  detailButton: {
    display: "inline-block",
    padding: "10px 18px",
    borderRadius: "8px",
    background: "#2563eb",
    color: "#fff",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "14px",
  },

  footer: {
    padding: "28px 20px",
    borderTop: "1px solid #e5e7eb",
    background: "#fff",
    textAlign: "center",
  },

  footerLinks: {
    marginBottom: "12px",
    fontSize: "14px",
  },

  footerLink: {
    color: "#555",
    textDecoration: "none",
  },

  copyright: {
    color: "#999",
    fontSize: "12px",
  },
};
