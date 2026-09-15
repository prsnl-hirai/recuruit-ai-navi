import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

type FeedJob = {
  id: number;
  public_id: string;
  title: string | null;
  ai_title: string | null;
  company_name: string | null;
  industry: string | null;
  job_title: string | null;
  employment_type: string | null;
  ai_employment_type: string | null;
  recruitment_count: string | null;

  postal_code: string | null;
  prefecture: string | null;
  city: string | null;
  street_address: string | null;
  building_name: string | null;
  location: string | null;
  ai_location: string | null;

  nearest_station_name: string | null;
  nearest_station_walk_minutes: string | number | null;

  salary_type: string | null;
  salary: string | null;
  ai_salary: string | null;

  start_time: string | null;
  end_time: string | null;
  break_time: string | null;
  holidays: string | null;
  min_days_per_week: string | null;
  min_hours_per_day: string | null;
  overtime: string | null;
  shift_example: string | null;

  job_description: string | null;
  ai_description: string | null;
  ai_requirements: string | null;
  ai_working_hours: string | null;
  benefits: string | null;
  ai_benefits: string | null;
  ai_appeal_points: string | null;
  catch_copy: string | null;

  valid_through: string | null;
  created_at: string;
  updated_at: string;
};

const text = (value: unknown) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const removeTrailingStation = (value: string) => value.replace(/駅+$/g, "");

const parseStringList = (value: unknown): string[] => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => text(item)).filter(Boolean);
  }

  const raw = text(value);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => text(item)).filter(Boolean);
    }
  } catch {
    // JSONでなければ通常文字列として扱う
  }

  return raw
    .split(/[、,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const getBaseUrl = (req: any) => {
  const configured =
    process.env.PUBLIC_SITE_URL ||
    process.env.VITE_PUBLIC_SITE_URL ||
    process.env.SITE_URL;

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  const forwardedProto = text(req.headers["x-forwarded-proto"]);
  const proto = forwardedProto || "https";
  const host = text(req.headers.host);

  return host ? `${proto}://${host}` : "";
};

const buildAddress = (job: FeedJob) => {
  return [
    text(job.prefecture),
    text(job.city),
    text(job.street_address),
    text(job.building_name),
  ]
    .filter(Boolean)
    .join("");
};

const buildAccess = (job: FeedJob) => {
  const stationRaw = text(job.nearest_station_name);
  if (!stationRaw) return "";

  const station = removeTrailingStation(stationRaw);
  const minutes = text(job.nearest_station_walk_minutes);

  return minutes ? `${station}駅から徒歩${minutes}分` : `${station}駅`;
};

const getSalaryText = (job: FeedJob) => {
  if (text(job.ai_salary)) return text(job.ai_salary);

  const salary = text(job.salary);
  if (!salary) return "";

  return [text(job.salary_type), salary].filter(Boolean).join(" ");
};

const getWorkingHours = (job: FeedJob) => {
  if (text(job.ai_working_hours)) return text(job.ai_working_hours);

  const time =
    job.start_time || job.end_time
      ? `${text(job.start_time)}${job.start_time && job.end_time ? "〜" : ""}${text(
          job.end_time,
        )}`
      : "";

  return [
    time,
    job.break_time ? `休憩：${text(job.break_time)}` : "",
    job.holidays ? `休日：${text(job.holidays)}` : "",
    job.min_days_per_week ? `最低勤務日数：${text(job.min_days_per_week)}` : "",
    job.min_hours_per_day ? `最低勤務時間：${text(job.min_hours_per_day)}` : "",
    job.overtime ? `残業：${text(job.overtime)}` : "",
    job.shift_example ? `シフト例：${text(job.shift_example)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
};

const getBenefits = (job: FeedJob) => {
  const ai = parseStringList(job.ai_benefits);
  if (ai.length > 0) return ai;

  return parseStringList(job.benefits);
};

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      success: false,
      message: "Method Not Allowed",
    });
  }

  try {
    const rows = (await sql`
      SELECT
        id,
        public_id,
        title,
        ai_title,
        company_name,
        industry,
        job_title,
        employment_type,
        ai_employment_type,
        recruitment_count,

        postal_code,
        prefecture,
        city,
        street_address,
        building_name,
        location,
        ai_location,

        nearest_station_name,
        nearest_station_walk_minutes,

        salary_type,
        salary,
        ai_salary,

        start_time,
        end_time,
        break_time,
        holidays,
        min_days_per_week,
        min_hours_per_day,
        overtime,
        shift_example,

        job_description,
        ai_description,
        ai_requirements,
        ai_working_hours,
        benefits,
        ai_benefits,
        ai_appeal_points,
        catch_copy,

        valid_through,
        created_at,
        updated_at
      FROM jobs
      WHERE status = '1'
        AND public_id IS NOT NULL
        AND (
          valid_through IS NULL
          OR valid_through >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo')::date
        )
      ORDER BY updated_at DESC, created_at DESC
    `) as FeedJob[];

    const baseUrl = getBaseUrl(req);

    const jobs = rows.map((job) => {
      const address = buildAddress(job);
      const access = buildAccess(job);

      return {
        id: job.public_id,
        source: "TERRACE JOBS",

        title: text(job.ai_title) || text(job.title) || text(job.job_title),
        companyName: text(job.company_name),
        industry: text(job.industry),
        jobTitle: text(job.job_title),
        employmentType:
          text(job.ai_employment_type) || text(job.employment_type),
        recruitmentCount: text(job.recruitment_count),

        catchCopy: text(job.catch_copy),

        description: text(job.ai_description) || text(job.job_description),
        requirements: text(job.ai_requirements),

        salary: {
          type: text(job.salary_type),
          amount: text(job.salary),
          display: getSalaryText(job),
        },

        workingHours: getWorkingHours(job),

        location: {
          postalCode: text(job.postal_code),
          prefecture: text(job.prefecture),
          city: text(job.city),
          streetAddress: text(job.street_address),
          buildingName: text(job.building_name),
          fullAddress: address || text(job.location) || text(job.ai_location),
          nearestStation: text(job.nearest_station_name)
            ? `${removeTrailingStation(text(job.nearest_station_name))}駅`
            : "",
          walkMinutes: text(job.nearest_station_walk_minutes),
          access,
        },

        benefits: getBenefits(job),
        appealPoints: parseStringList(job.ai_appeal_points),

        url: baseUrl
          ? `${baseUrl}/jobs/${job.public_id}`
          : `/jobs/${job.public_id}`,

        publishedAt: job.created_at,
        updatedAt: job.updated_at,
        validThrough: job.valid_through
          ? String(job.valid_through).slice(0, 10)
          : null,
      };
    });

    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");

    return res.status(200).json({
      success: true,
      source: "TERRACE JOBS",
      generatedAt: new Date().toISOString(),
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error("求人フィード取得エラー:", error);

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "求人フィードの取得に失敗しました",
    });
  }
}
