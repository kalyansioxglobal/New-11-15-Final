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
      const { ventureId, officeId, status, type, page = "1", pageSize = "50" } = req.query;

      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const take = Math.min(200, Math.max(1, parseInt(String(pageSize), 10) || 50));
      const skip = (pageNum - 1) * take;

      const where: any = {};
      if (ventureId) where.ventureId = Number(ventureId);
      if (officeId) where.officeId = Number(officeId);
      if (status) where.status = status;
      if (type) where.type = type;

      const [policies, total] = await Promise.all([
        prisma.policy.findMany({
          where,
          include: {
            venture: true,
            office: true,
            creator: true,
          },
          orderBy: { createdAt: "desc" },
          skip,
          take,
        }),
        prisma.policy.count({ where }),
      ]);

      return res.status(200).json({
        policies,
        page: pageNum,
        pageSize: take,
        total,
        totalPages: Math.ceil(total / take),
      });
    }

    if (req.method === "POST") {
      const {
        ventureId,
        officeId,
        name,
        type,
        provider,
        policyNo,
        startDate,
        endDate,
        status,
        fileUrl,
        notes,
        createdBy,
        isTest,
      } = req.body;

      if (!ventureId || !name || !type) {
        return res.status(400).json({
          error: "ventureId, name, and type are required",
        });
      }

      const data: any = {
        name,
        type: type as any,
        provider: provider || null,
        policyNo: policyNo || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: (status as any) || "ACTIVE",
        fileUrl: fileUrl || null,
        notes: notes || null,
        isTest: isTest || false,
        venture: { connect: { id: Number(ventureId) } },
      };

      if (officeId) {
        data.office = { connect: { id: Number(officeId) } };
      }

      if (createdBy) {
        data.creator = { connect: { id: Number(createdBy) } };
      }

      const policy = await prisma.policy.create({ data });

      return res.status(201).json({ policy });
    }

    if (req.method === "PUT") {
      const {
        id,
        ventureId,
        officeId,
        name,
        type,
        provider,
        policyNo,
        startDate,
        endDate,
        status,
        fileUrl,
        notes,
      } = req.body;

      if (!id) {
        return res.status(400).json({ error: "id is required" });
      }

      const data: any = {};

      if (name !== undefined) data.name = name;
      if (type) data.type = type as any;
      if (provider !== undefined) data.provider = provider || null;
      if (policyNo !== undefined) data.policyNo = policyNo || null;
      if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
      if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;
      if (status) data.status = status as any;
      if (fileUrl !== undefined) data.fileUrl = fileUrl || null;
      if (notes !== undefined) data.notes = notes || null;

      if (ventureId !== undefined) {
        data.venture = { connect: { id: Number(ventureId) } };
      }

      if (officeId !== undefined) {
        if (officeId === null) {
          data.office = { disconnect: true };
        } else {
          data.office = { connect: { id: Number(officeId) } };
        }
      }

      const policy = await prisma.policy.update({
        where: { id: Number(id) },
        data,
      });

      return res.status(200).json({ policy });
    }

    if (req.method === "DELETE") {
      const { id } = req.query;
      const numericId = Number(id);

      if (!numericId || Number.isNaN(numericId)) {
        return res.status(400).json({ error: "Valid id query param required" });
      }

      await prisma.policy.delete({
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
