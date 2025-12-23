import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { isGlobalAdmin } from "@/lib/scope";
import { TaskStatus } from "@prisma/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const { id } = req.query;
  const taskId = Number(id);

  if (!taskId || isNaN(taskId)) {
    return res.status(400).json({ error: "Invalid task ID" });
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  const isAdmin = isGlobalAdmin(user);
  if (!isAdmin && task.assignedTo !== user.id) {
    return res.status(403).json({ error: "You can only modify tasks assigned to you" });
  }

  const body = req.body || {};
  const updateData: any = {};

  if (body.status !== undefined) {
    const validStatuses: TaskStatus[] = ["OPEN", "IN_PROGRESS", "DONE", "CANCELED"];
    if (!validStatuses.includes(body.status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    updateData.status = body.status;

    if (body.status === "DONE") {
      updateData.completedAt = new Date();
    } else if (task.status === "DONE" && body.status !== "DONE") {
      updateData.completedAt = null;
    }
  }

  if (body.description !== undefined) {
    updateData.description = body.description;
  }

  try {
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
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
    });

    return res.status(200).json({
      id: updatedTask.id,
      title: updatedTask.title,
      description: updatedTask.description,
      type: updatedTask.type,
      status: updatedTask.status,
      priority: updatedTask.priority,
      dueDate: updatedTask.dueDate?.toISOString() || null,
      createdAt: updatedTask.createdAt.toISOString(),
      completedAt: updatedTask.completedAt?.toISOString() || null,
      customer: updatedTask.customer,
      quote: updatedTask.quote,
      load: updatedTask.load,
      assignedUser: updatedTask.assignedUser,
    });
  } catch (err: any) {
    console.error("/api/freight/tasks/[id] PATCH error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
