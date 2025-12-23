// pages/api/admin/tasks.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { Prisma } from "@prisma/client";
import prisma from "../../../lib/prisma";
import { requireAdminUser } from '@/lib/apiAuth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await requireAdminUser(req, res);
  if (!user) return;

  try {
    if (req.method === "GET") {
      const { ventureId, officeId, page = "1", pageSize = "50" } = req.query;

      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const take = Math.min(200, Math.max(1, parseInt(String(pageSize), 10) || 50));
      const skip = (pageNum - 1) * take;

      const where: any = {};
      if (ventureId) {
        where.ventureId = Number(ventureId);
      }
      if (officeId) {
        where.officeId = Number(officeId);
      }

      const [tasks, total] = await Promise.all([
        prisma.task.findMany({
          where,
          include: {
            venture: true,
            office: true,
          },
          orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
          skip,
          take,
        }),
        prisma.task.count({ where }),
      ]);

      return res.status(200).json({
        tasks,
        page: pageNum,
        pageSize: take,
        total,
        totalPages: Math.ceil(total / take),
      });
    }

    if (req.method === "POST") {
      const { ventureId, officeId, title, description, status, priority, dueDate, assignedTo } =
        req.body as {
          ventureId?: number | null;
          officeId?: number | null;
          title?: string;
          description?: string;
          status?: string;
          priority?: string;
          dueDate?: string | null;
          assignedTo?: number | null;
        };

      if (!title) {
        return res.status(400).json({ error: "title is required" });
      }

      let finalStatus = (status as any) || "OPEN";
      if (dueDate && new Date(dueDate) < new Date()) {
        finalStatus = "OVERDUE";
      }

      const task = await prisma.task.create({
        data: {
          title,
          description: description || null,
          status: finalStatus,
          priority: (priority as any) || "MEDIUM",
          ventureId: ventureId || null,
          officeId: officeId || null,
          dueDate: dueDate ? new Date(dueDate) : null,
          assignedTo: assignedTo || null,
        },
      });

      return res.status(201).json({ task });
    }

    if (req.method === "PUT") {
      const {
        id,
        title,
        description,
        status,
        priority,
        ventureId,
        officeId,
        dueDate,
        assignedTo,
      } = req.body as {
        id?: number;
        title?: string;
        description?: string;
        status?: string;
        priority?: string;
        ventureId?: number | null;
        officeId?: number | null;
        dueDate?: string | null;
        assignedTo?: number | null;
      };

      if (!id) {
        return res.status(400).json({ error: "id is required" });
      }

      let finalStatus = status as any;
      if (dueDate && new Date(dueDate) < new Date() && status !== "DONE") {
        finalStatus = "OVERDUE";
      }

      const task = await prisma.task.update({
        where: { id },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(finalStatus && { status: finalStatus }),
          ...(priority && { priority: priority as any }),
          ...(ventureId !== undefined && { ventureId }),
          ...(officeId !== undefined && { officeId }),
          ...(dueDate !== undefined && {
            dueDate: dueDate ? new Date(dueDate) : null,
          }),
          ...(assignedTo !== undefined && { assignedTo: assignedTo || null }),
        },
      });

      return res.status(200).json({ task });
    }

    if (req.method === "DELETE") {
      const { id } = req.query;
      const numericId = Number(id);

      if (!numericId || Number.isNaN(numericId)) {
        return res.status(400).json({ error: "Valid id query param required" });
      }

      // Hard delete – tasks can be recreated if needed
      await prisma.task.delete({
        where: { id: numericId },
      });

      return res.status(200).json({ success: true });
    }

    res.setHeader("Allow", "GET,POST,PUT,DELETE");
    return res.status(405).end("Method Not Allowed");
  } catch (error: any) {
    console.error(error);
    if ((error as any)?.code) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}
