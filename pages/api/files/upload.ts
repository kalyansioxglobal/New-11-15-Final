import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { storageClient } from "@/lib/storage";
import Busboy from "busboy";
import { v4 as uuidv4 } from "uuid";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getCurrentUserId(req: NextApiRequest, res: NextApiResponse): Promise<number | null> {
  const session = await getServerSession(req, res, authOptions);
  if (session?.user?.id) return Number(session.user.id);
  
  return null;
}

function parseForm(req: NextApiRequest): Promise<{
  fields: Record<string, string>;
  file:
    | { buffer: Buffer; filename: string; mimeType: string; size: number }
    | null;
}> {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    const fields: Record<string, string> = {};
    let fileBuffer: Buffer | null = null;
    let filename = "";
    let mimeType = "";

    busboy.on("file", (_name, file, info) => {
      filename = info.filename;
      mimeType = info.mimeType;
      const chunks: Buffer[] = [];
      file.on("data", (data) => chunks.push(data));
      file.on("end", () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    busboy.on("field", (name, val) => {
      fields[name] = val;
    });

    busboy.on("finish", () => {
      resolve({
        fields,
        file: fileBuffer
          ? {
              buffer: fileBuffer,
              filename,
              mimeType,
              size: fileBuffer.length,
            }
          : null,
      });
    });

    busboy.on("error", reject);
    req.pipe(busboy);
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const userId = await getCurrentUserId(req, res);
  if (!userId) return res.status(401).json({ error: "Unauthenticated" });

  try {
    const { fields, file } = await parseForm(req);
    if (!file) return res.status(400).json({ error: "No file provided" });

    const taskId = fields.taskId ? Number(fields.taskId) : undefined;
    const policyId = fields.policyId ? Number(fields.policyId) : undefined;
    let ventureId: number | undefined = fields.ventureId
      ? Number(fields.ventureId)
      : undefined;

    let task: any = null;

    if (taskId) {
      task = await prisma.task.findUnique({
        where: { id: taskId },
        select: { id: true, ventureId: true },
      });
      if (!task) return res.status(400).json({ error: "Invalid taskId" });
      ventureId = task.ventureId ?? ventureId;
    }

    if (policyId) {
      const policy = await prisma.policy.findUnique({
        where: { id: policyId },
        select: { id: true, ventureId: true },
      });
      if (!policy) return res.status(400).json({ error: "Invalid policyId" });
      ventureId = policy.ventureId ?? ventureId;
    }

    const tag = fields.tag || null;

    const ext = file.filename.includes(".")
      ? file.filename.split(".").pop()
      : "bin";

    let entityType = "general";
    let entityId = 0;
    if (taskId) {
      entityType = "task";
      entityId = taskId;
    } else if (policyId) {
      entityType = "policy";
      entityId = policyId;
    }

    const keyParts = [
      ventureId ? `venture-${ventureId}` : "venture-global",
      `${entityType}-${entityId}`,
      `${uuidv4()}.${ext}`,
    ];

    const objectKey = keyParts.join("/");

    const uploadResult = await storageClient.upload(
      objectKey,
      file.buffer,
      file.mimeType
    );

    const created = await prisma.file.create({
      data: {
        ventureId,
        taskId,
        policyId,
        fileName: file.filename,
        mimeType: file.mimeType,
        sizeBytes: file.size,
        provider: uploadResult.provider,
        bucket: uploadResult.bucket,
        path: uploadResult.path,
        tag,
        uploadedById: userId,
      },
    });

    return res.status(200).json({ file: created });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Upload failed" });
  }
}
