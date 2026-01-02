import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import Busboy from "busboy";
import { v4 as uuidv4 } from "uuid";
import { createStorageClient } from "@/lib/storage";

export const config = {
  api: {
    bodyParser: false,
  },
};

// Create a storage client specifically for feedback files
const FEEDBACK_BUCKET = "FeedbackFiles";
const feedbackStorageClient = createStorageClient(FEEDBACK_BUCKET);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

// Allowed file types for feedback attachments
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

function isValidFileType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase());
}

function parseForm(req: NextApiRequest): Promise<{
  fields: Record<string, string>;
  files: Array<{ buffer: Buffer; filename: string; mimeType: string; size: number }>;
}> {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    const fields: Record<string, string> = {};
    const files: Array<{ buffer: Buffer; filename: string; mimeType: string; size: number }> = [];

    busboy.on("file", (name, file, info) => {
      if (name === "attachments" && files.length < MAX_FILES) {
        const filename = info.filename;
        const mimeType = info.mimeType;
        const chunks: Buffer[] = [];

        file.on("data", (data) => chunks.push(data));
        file.on("end", () => {
          const buffer = Buffer.concat(chunks);
          if (buffer.length > 0 && buffer.length <= MAX_FILE_SIZE && isValidFileType(mimeType)) {
            files.push({
              buffer,
              filename,
              mimeType,
              size: buffer.length,
            });
          }
        });
      } else {
        file.resume(); // Skip invalid files
      }
    });

    busboy.on("field", (name, val) => {
      fields[name] = val;
    });

    busboy.on("finish", () => {
      resolve({ fields, files });
    });

    busboy.on("error", reject);
    req.pipe(busboy);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    const userId = session?.user?.id ? Number(session.user.id) : null;

    const { fields, files } = await parseForm(req);

    const type = fields.type || "FEEDBACK";
    const priority = fields.priority || "NORMAL";
    const subject = fields.subject || "";
    const description = fields.description || "";
    const email = fields.email || null;
    const pageUrl = fields.pageUrl || null;
    const browserInfo = fields.browserInfo || null;

    if (!subject || !description) {
      return res.status(400).json({ error: "Subject and description are required" });
    }

    const validTypes = ["BUG", "FEEDBACK", "FEATURE_REQUEST", "OTHER"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: "Invalid feedback type" });
    }

    const validPriorities = ["LOW", "NORMAL", "HIGH", "CRITICAL"];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ error: "Invalid priority" });
    }

    // Upload files to Supabase storage
    const attachmentPaths: string[] = [];

    for (const file of files.slice(0, MAX_FILES)) {
      try {
        const ext = file.filename.includes(".")
          ? file.filename.split(".").pop()
          : "bin";
        const timestamp = Date.now();
        const random = uuidv4().substring(0, 8);
        const storageKey = `feedback-${timestamp}-${random}.${ext}`;

        const uploadResult = await feedbackStorageClient.upload(
          storageKey,
          file.buffer,
          file.mimeType
        );

        // Store the path in the format: bucket/path
        attachmentPaths.push(`${uploadResult.bucket}/${uploadResult.path}`);
      } catch (err) {
        console.error("Error uploading file:", err);
        // Continue with other files even if one fails
      }
    }

    const feedback = await prisma.feedbackSubmission.create({
      data: {
        userId,
        email: email || (session?.user?.email ?? null),
        type,
        priority,
        subject,
        description,
        pageUrl,
        browserInfo,
        attachments: attachmentPaths.length > 0 ? JSON.stringify(attachmentPaths) : null,
        status: "NEW",
      },
    });

    return res.status(201).json({
      success: true,
      id: feedback.id,
      message: "Feedback submitted successfully",
    });
  } catch (err: unknown) {
    console.error("Error submitting feedback:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: message });
  }
}
