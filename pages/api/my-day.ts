import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { requireUser } from '@/lib/apiAuth';
import { getUserScope } from "@/lib/scope";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return res.status(401).json({ error: "UNAUTHENTICATED" });

  const includeTest = req.query.includeTest === "true";
  const scope = getUserScope(user);

  const baseWhere: any = {};
  if (!includeTest) baseWhere.isTest = false;

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const windowDays = 7;
  const kpiFrom = new Date();
  kpiFrom.setDate(now.getDate() - windowDays + 1);
  kpiFrom.setHours(0, 0, 0, 0);

  const taskWhere: any = {
    ...baseWhere,
    assignedTo: user.id,
  };
  if (!scope.allVentures) {
    taskWhere.ventureId = { in: scope.ventureIds };
  }
  if (!scope.allOffices && scope.officeIds.length > 0) {
    taskWhere.OR = [{ officeId: null }, { officeId: { in: scope.officeIds } }];
  }

  const loadWhere: any = {
    ...baseWhere,
    pickupDate: {
      gte: todayStart,
      lte: todayEnd,
    },
    status: { in: ["OPEN", "WORKING"] },
  };
  if (!scope.allVentures) {
    loadWhere.ventureId = { in: scope.ventureIds };
  }
  if (!scope.allOffices && scope.officeIds.length > 0) {
    loadWhere.OR = [{ officeId: null }, { officeId: { in: scope.officeIds } }];
  }

  const policyWhere: any = {
    ...baseWhere,
    status: "ACTIVE",
  };
  if (!scope.allVentures) {
    policyWhere.ventureId = { in: scope.ventureIds };
  }
  if (!scope.allOffices && scope.officeIds.length > 0) {
    policyWhere.OR = [{ officeId: null }, { officeId: { in: scope.officeIds } }];
  }

  const [tasks, loads, kpis, notificationsData] = await Promise.all([
    prisma.task.findMany({
      where: taskWhere,
      select: {
        id: true,
        title: true,
        status: true,
        dueDate: true,
        venture: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: "asc" },
    }),

    prisma.load.findMany({
      where: loadWhere,
      select: {
        id: true,
        reference: true,
        status: true,
        pickupDate: true,
        pickupCity: true,
        pickupState: true,
        dropCity: true,
        dropState: true,
        venture: { select: { id: true, name: true } },
      },
      orderBy: { pickupDate: "asc" },
    }),

    prisma.employeeKpiDaily.findMany({
      where: {
        ...baseWhere,
        userId: user.id,
        date: { gte: kpiFrom, lte: now },
      },
    }),

    (async () => {
      const notifTaskWhere: any = {
        ...baseWhere,
        assignedTo: user.id,
      };
      if (!scope.allVentures) {
        notifTaskWhere.ventureId = { in: scope.ventureIds };
      }
      if (!scope.allOffices && scope.officeIds.length > 0) {
        notifTaskWhere.OR = [{ officeId: null }, { officeId: { in: scope.officeIds } }];
      }

      const [userTasks, policies, ventureLoads] = await Promise.all([
        prisma.task.findMany({
          where: notifTaskWhere,
          select: {
            id: true,
            title: true,
            dueDate: true,
            status: true,
          },
        }),
        prisma.policy.findMany({
          where: policyWhere,
          select: {
            id: true,
            name: true,
            endDate: true,
          },
        }),
        prisma.load.findMany({
          where: loadWhere,
          select: {
            id: true,
            reference: true,
            pickupCity: true,
            pickupState: true,
            dropCity: true,
            dropState: true,
          },
        }),
      ]);

      const list: any[] = [];

      for (const t of userTasks) {
        if (!t.dueDate) continue;
        const isOverdue = t.dueDate < todayStart && t.status !== "DONE";
        const isToday = t.dueDate >= todayStart && t.dueDate <= todayEnd;
        if (!isOverdue && !isToday) continue;

        list.push({
          id: `task-${t.id}`,
          type: isOverdue ? "task_overdue" : "task_today",
          title: isOverdue ? `Overdue task: ${t.title}` : `Task due today: ${t.title}`,
          description: `Due ${t.dueDate.toLocaleDateString("en-US")}`,
        });
      }

      for (const p of policies) {
        if (!p.endDate) continue;
        const diffDays = Math.ceil(
          (p.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays > 0 && diffDays <= 30) {
          list.push({
            id: `policy-${p.id}`,
            type: "policy_expiring",
            title: `Policy expiring soon: ${p.name}`,
            description: `Expires ${p.endDate.toLocaleDateString("en-US")} (${diffDays} days)`,
          });
        }
      }

      for (const l of ventureLoads) {
        list.push({
          id: `load-${l.id}`,
          type: "load_today",
          title: "Today load: " + (l.reference || `${l.pickupCity} → ${l.dropCity}`),
          description: `${l.pickupCity}, ${l.pickupState} → ${l.dropCity}, ${l.dropState}`,
        });
      }

      return list;
    })(),
  ]);

  const todayTasks: typeof tasks = [];
  const overdueTasks: typeof tasks = [];
  const upcomingTasks: typeof tasks = [];

  for (const t of tasks) {
    if (!t.dueDate) {
      upcomingTasks.push(t);
      continue;
    }
    if (t.dueDate < todayStart && t.status !== "DONE") {
      overdueTasks.push(t);
    } else if (t.dueDate <= todayEnd) {
      todayTasks.push(t);
    } else {
      upcomingTasks.push(t);
    }
  }

  let hoursPlanned = 0;
  let hoursWorked = 0;
  let tasksCompleted = 0;
  let loadsTouched = 0;
  let loadsCovered = 0;
  let contactsMade = 0;
  let callsMade = 0;
  let ticketsClosed = 0;

  for (const k of kpis) {
    hoursPlanned += k.hoursPlanned || 0;
    hoursWorked += k.hoursWorked || 0;
    tasksCompleted += k.tasksCompleted || 0;
    loadsTouched += k.loadsTouched || 0;
    loadsCovered += k.loadsCovered || 0;
    contactsMade += k.contactsMade || 0;
    callsMade += k.callsMade || 0;
    ticketsClosed += k.ticketsClosed || 0;
  }

  const utilizationPct =
    hoursPlanned > 0 ? Math.round((hoursWorked / hoursPlanned) * 100) : null;

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    tasks: {
      overdue: overdueTasks,
      today: todayTasks,
      upcoming: upcomingTasks,
    },
    loads,
    kpi: {
      windowDays,
      hoursPlanned,
      hoursWorked,
      utilizationPct,
      tasksCompleted,
      loadsTouched,
      loadsCovered,
      contactsMade,
      callsMade,
      ticketsClosed,
    },
    notifications: notificationsData,
  });
}
