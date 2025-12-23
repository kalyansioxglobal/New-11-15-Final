import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import formidable from "formidable";
import fs from "fs";
import path from "path";

export const config = {
  api: {
    bodyParser: false,
  },
};

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "feedback");

async function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await ensureUploadDir();

    const session = await getServerSession(req, res, authOptions);
    const userId = session?.user?.id ? Number(session.user.id) : null;

    const form = formidable({
      uploadDir: UPLOAD_DIR,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024,
      maxFiles: 5,
      filename: (_name, _ext, part) => {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const ext = path.extname(part.originalFilename || "");
        return `${timestamp}-${random}${ext}`;
      },
    });

    const [fields, files] = await form.parse(req);

    const type = (fields.type?.[0] || "FEEDBACK") as string;
    const priority = (fields.priority?.[0] || "NORMAL") as string;
    const subject = fields.subject?.[0] || "";
    const description = fields.description?.[0] || "";
    const email = fields.email?.[0] || null;
    const pageUrl = fields.pageUrl?.[0] || null;
    const browserInfo = fields.browserInfo?.[0] || null;

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

    const attachmentFiles = files.attachments || [];
    const attachmentPaths: string[] = [];

    for (const file of attachmentFiles) {
      if (Array.isArray(file)) {
        for (const f of file) {
          if (f.filepath) {
            const relativePath = `/uploads/feedback/${path.basename(f.filepath)}`;
            attachmentPaths.push(relativePath);
          }
        }
      } else if (file.filepath) {
        const relativePath = `/uploads/feedback/${path.basename(file.filepath)}`;
        attachmentPaths.push(relativePath);
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
