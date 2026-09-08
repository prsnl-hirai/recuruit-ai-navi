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

  job_description: string | null;
  ai_description: string | null;

  created_at: string;
  updated_at: string;
};

export default function PublicJobList() {
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadJobs = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const response = await fetch("/api/public-job-list");

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
            求人AIナビ
          </a>
        </div>
      </header>

      <main style={styles.container}>
        <div style={styles.pageTitleArea}>
          <h1 style={styles.pageTitle}>公開求人一覧</h1>

          <p style={styles.pageDescription}>
            求人AIナビに掲載されている求人情報です。
          </p>
        </div>

        {errorMessage && <div style={styles.error}>{errorMessage}</div>}

        {!errorMessage && jobs.length === 0 && (
          <div style={styles.empty}>現在公開中の求人はありません。</div>
        )}

        <div style={styles.jobList}>
          {jobs.map((job) => {
            const title = getTitle(job);
            const employmentType = getEmploymentType(job);
            const salary = getSalary(job);
            const location = getLocation(job);
            const description = getDescription(job);

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

        <div style={styles.copyright}>© 求人AIナビ</div>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f7f8fa",
    color: "#222",
  },

  header: {
    background: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
  },

  headerInner: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "16px 20px",
  },

  logo: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#111",
    textDecoration: "none",
  },

  container: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "32px 20px 60px",
  },

  pageTitleArea: {
    marginBottom: "28px",
  },

  pageTitle: {
    margin: "0 0 8px",
    fontSize: "28px",
  },

  pageDescription: {
    margin: 0,
    color: "#666",
    lineHeight: 1.7,
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
    padding: "22px",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
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
    marginBottom: "16px",
    color: "#555",
    fontSize: "14px",
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
    background: "#111",
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
