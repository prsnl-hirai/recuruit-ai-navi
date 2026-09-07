import { neon } from "@neondatabase/serverless";
import crypto from "crypto";

const sql = neon(process.env.DATABASE_URL!);

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";

    req.setEncoding("utf8");

    req.on("data", (chunk: string) => {
      data += chunk;
    });

    req.on("end", () => {
      resolve(data);
    });

    req.on("error", reject);
  });
}

function verifyIndeedSignature(
  rawBody: string,
  signature: string,
  secret: string
) {
  const expected = crypto
    .createHmac("sha1", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const secret = process.env.INDEED_APPLY_SECRET;

    if (!secret) {
      console.error("INDEED_APPLY_SECRET is not configured");

      return res.status(500).json({
        error: "Server configuration error",
      });
    }

    const signature = req.headers["x-indeed-signature"];

    if (!signature || typeof signature !== "string") {
      return res.status(401).json({
        error: "Invalid signature",
      });
    }

    const rawBody = await readRawBody(req);

    const valid = verifyIndeedSignature(rawBody, signature, secret);

    if (!valid) {
      return res.status(401).json({
        error: "Invalid signature",
      });
    }

    let payload: any;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      return res.status(400).json({
        error: "Invalid JSON",
      });
    }

    console.log("Indeed application received:", payload);

    const jobMeta = payload.job?.jobMeta ?? payload.jobMeta ?? "";

    const publicId = String(jobMeta);

    if (!publicId) {
      return res.status(400).json({
        error: "Job ID is missing",
      });
    }

    const jobs = await sql`
      SELECT
        id,
        public_id,
        user_id,
        ai_title,
        title
      FROM jobs
      WHERE public_id = ${publicId}
        AND status = '1'
      LIMIT 1
    `;

    if (jobs.length === 0) {
      return res.status(404).json({
        error: "Job not found",
      });
    }

    const job = jobs[0];

    const applicant = payload.applicant ?? {};

    const name = applicant.fullName ?? applicant.name ?? "";

    const email = applicant.email ?? "";

    const phone = applicant.phoneNumber ?? applicant.phone ?? null;

    const message = applicant.coverletter ?? applicant.coverLetter ?? null;

    const resume = applicant.resume ?? {};

    const sourceApplicationId = payload.id ?? payload.applicationId ?? null;

    const duplicate = await sql`
      SELECT id
      FROM applications
      WHERE job_id = ${job.id}
        AND email = ${email}
        AND source = 'indeed'
        AND created_at >= NOW() - INTERVAL '120 days'
      LIMIT 1
    `;

    if (duplicate.length > 0) {
      return res.status(409).json({
        error: "Duplicate application",
      });
    }

    const result = await sql`
      INSERT INTO applications (
        job_id,
        name,
        email,
        phone,
        message,
        status,
        source,
        source_application_id,
        resume_file_name,
        resume_content_type,
        resume_data,
        raw_data
      )
      VALUES (
        ${job.id},
        ${name},
        ${email},
        ${phone},
        ${message},
        '0',
        'indeed',
        ${sourceApplicationId},
        ${resume.fileName ?? null},
        ${resume.contentType ?? null},
        ${resume.data ?? null},
        ${JSON.stringify(payload)}
      )
      RETURNING id
    `;

    try {
      if (job.user_id && process.env.LINE_CHANNEL_ACCESS_TOKEN) {
        const title = job.ai_title || job.title || "求人";

        await fetch("https://api.line.me/v2/bot/message/push", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: job.user_id,
            messages: [
              {
                type: "text",
                text:
                  `📩 Indeedから新しい応募がありました\n\n` +
                  `求人：${title}\n` +
                  `応募者：${name}\n` +
                  `応募経路：Indeed`,
              },
            ],
          }),
        });
      }
    } catch (lineError) {
      console.error("LINE notification error:", lineError);
    }

    return res.status(200).json({
      success: true,
      applicationId: result[0].id,
    });
  } catch (error) {
    console.error("Indeed application error:", error);

    return res.status(500).json({
      error: "Failed to receive application",
    });
  }
}
