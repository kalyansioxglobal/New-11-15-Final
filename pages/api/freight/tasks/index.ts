import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { TaskStatus, TaskType } from "@prisma/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const {
    ventureId,
    status,
    type,
    mineOnly = "true",
    limit = "50",
    offset = "0",
  } = req.query;

  if (!ventureId) {
    return res.status(400).json({ error: "ventureId is required" });
  }

  const where: any = {
    ventureId: Number(ventureId),
  };

  if (mineOnly !== "false") {
    where.assignedTo = user.id;
  }

  if (status) {
    if (Array.isArray(status)) {
      where.status = { in: status as TaskStatus[] };
    } else {
      where.status = status as TaskStatus;
    }
  }

  if (type) {
    if (Array.isArray(type)) {
      where.type = { in: type as TaskType[] };
    } else {
      where.type = type as TaskType;
    }
  }

  try {
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy: [
          { dueDate: "asc" },
          { priority: "desc" },
          { createdAt: "desc" },
        ],
        take: Number(limit),
        skip: Number(offset),
        include: {
          customer: {
            select: { id: true, name: true },
          },
          quote: {
            select: { id: true, status: true },
          },
          load: {
            select: { id: true, tmsLoadId: true, loadStatus: true },
          },
          assignedUser: {
            select: { id: true, fullName: true },
          },
        },
      }),
      prisma.task.count({ where }),
    ]);

    const formattedTasks = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      type: t.type,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate?.toISOString() || null,
      createdAt: t.createdAt.toISOString(),
      completedAt: t.completedAt?.toISOString() || null,
      customer: t.customer,
      quote: t.quote,
      load: t.load,
      assignedUser: t.assignedUser,
    }));

    return res.status(200).json({ tasks: formattedTasks, total });
  } catch (err: any) {
    console.error("/api/freight/tasks error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
