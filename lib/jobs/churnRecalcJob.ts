import { prisma } from "@/lib/prisma";
import { JobName } from "@prisma/client";
import { updateAllShipperChurnStatuses } from "@/lib/shipperChurn";
import { updateAllCustomerChurnMetrics } from "@/lib/freight/customerChurn";

export interface ChurnRecalcJobOptions {
  ventureId?: number;
  dryRun?: boolean;
}

export interface ChurnRecalcJobResult {
  shipperUpdated: number;
  shipperByStatus: Record<string, number>;
  customerProcessed: number;
  customerUpdated: number;
  customerErrors: number;
  errors: string[];
}

export async function runChurnRecalcJob(
  options: ChurnRecalcJobOptions = {}
): Promise<{ stats: ChurnRecalcJobResult; jobRunLogId: number }> {
  const { ventureId, dryRun = false } = options;
  const startedAt = new Date();
  const errors: string[] = [];

  const stats: ChurnRecalcJobResult = {
    shipperUpdated: 0,
    shipperByStatus: {},
    customerProcessed: 0,
    customerUpdated: 0,
    customerErrors: 0,
    errors: [],
  };

  let status = "SUCCESS";

  try {
    if (dryRun) {
      const shipperCount = await prisma.logisticsShipper.count({
        where: {
          isActive: true,
          isTest: false,
          ...(ventureId && { ventureId }),
        },
      });
      stats.shipperUpdated = shipperCount;

      const customerCount = await prisma.customer.count({
        where: {
          isActive: true,
          ...(ventureId && { ventureId }),
        },
      });
      stats.customerProcessed = customerCount;
      stats.customerUpdated = customerCount;
    } else {
      try {
        const shipperResult = await updateAllShipperChurnStatuses(ventureId, false);
        stats.shipperUpdated = shipperResult.updated;
        stats.shipperByStatus = shipperResult.byStatus;
      } catch (err: any) {
        errors.push(`Shipper churn update failed: ${err.message}`);
        status = "PARTIAL";
      }

      try {
        const customerResult = await updateAllCustomerChurnMetrics(ventureId);
        stats.customerProcessed = customerResult.processed;
        stats.customerUpdated = customerResult.updated;
        stats.customerErrors = customerResult.errors;

        if (customerResult.errors > 0) {
          status = "PARTIAL";
          errors.push(`${customerResult.errors} customer churn updates failed`);
        }
      } catch (err: any) {
        errors.push(`Customer churn update failed: ${err.message}`);
        status = "PARTIAL";
      }
    }
  } catch (err: any) {
    status = "ERROR";
    errors.push(err.message || "Unknown error");
  }

  stats.errors = errors;

  const jobRunLog = await prisma.jobRunLog.create({
    data: {
      ventureId: ventureId || null,
      jobName: JobName.CHURN_RECALC,
      status,
      startedAt,
      endedAt: new Date(),
      statsJson: JSON.stringify({ ...stats, dryRun }),
      error: errors.length > 0 ? errors.join("; ") : null,
    },
  });

  return { stats, jobRunLogId: jobRunLog.id };
}
