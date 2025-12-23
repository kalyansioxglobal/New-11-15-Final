/**
 * Job Failure Alerting
 * 
 * Sends alerts when background jobs fail.
 * Currently stubbed - can be extended to send emails, Slack messages, etc.
 */

import { JobName } from '@prisma/client';

export interface JobFailureAlert {
  jobName: JobName;
  jobKey: string;
  error: string;
  duration?: number;
}

/**
 * Alert on job failure
 * 
 * Currently logs to console. Can be extended to:
 * - Send email via SendGrid
 * - Send Slack message
 * - Send PagerDuty alert
 * - Write to monitoring system
 */
export async function alertJobFailure(alert: JobFailureAlert): Promise<void> {
  const { jobName, jobKey, error, duration } = alert;

  // Structured logging
  console.error('[jobAlerts] Job failure:', {
    jobName,
    jobKey,
    error,
    duration,
    timestamp: new Date().toISOString(),
  });

  // TODO: Send email alert
  // await sendEmailAlert({
  //   to: process.env.ALERT_EMAIL || 'admin@example.com',
  //   subject: `Job Failure: ${jobName}`,
  //   body: `Job ${jobName} (${jobKey}) failed: ${error}`,
  // });

  // TODO: Send Slack alert
  // await sendSlackAlert({
  //   channel: '#alerts',
  //   message: `🚨 Job Failure: ${jobName}\nKey: ${jobKey}\nError: ${error}`,
  // });

  // TODO: Send PagerDuty alert (for critical jobs)
  // if (isCriticalJob(jobName)) {
  //   await sendPagerDutyAlert({
  //     summary: `Job Failure: ${jobName}`,
  //     severity: 'error',
  //     details: { jobKey, error },
  //   });
  // }

  // For now, just log - alerts can be wired up later
}

/**
 * Check if a job is critical (should trigger PagerDuty)
 */
function isCriticalJob(jobName: JobName): boolean {
  const criticalJobs: JobName[] = [
    JobName.INCENTIVE_DAILY,
    JobName.CHURN_RECALC,
  ];
  return criticalJobs.includes(jobName);
}

