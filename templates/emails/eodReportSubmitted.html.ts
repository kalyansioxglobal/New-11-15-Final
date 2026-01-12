/**
 * EOD Report Submitted Email HTML Template
 * Generates HTML for EOD report submission notification emails to managers
 */

export type EodReportSubmittedEmailData = {
  employeeName: string;
  employeeEmail: string;
  ventureName: string;
  officeName?: string;
  reportDate: string;
  summary: string;
  accomplishments?: string;
  blockers?: string;
  tomorrowPlan?: string;
  hoursWorked?: number;
  tasksCompleted?: number;
  attendanceStatus?: string;
  attendanceMarkedAt?: string;
  attendanceUpdatedAt?: string;
  reportUrl: string;
};

/**
 * Generates HTML email template for EOD report submission notifications
 */
/**
 * Helper function to format ISO timestamp with timezone info
 * Formats UTC timestamp in a way that's accurate for all recipients
 * Shows UTC time and ISO format for clarity
 */
function formatTimestampWithTimezone(isoString: string): string {
  try {
    const date = new Date(isoString);
    // Format as: "YYYY-MM-DD HH:MM:SS UTC" for clarity
    const utcStr = date.toISOString();
    const utcDate = utcStr.substring(0, 19).replace('T', ' ') + ' UTC';
    // Also include ISO format for reference
    return `${utcDate} (${utcStr})`;
  } catch {
    return isoString;
  }
}

export function getEodReportSubmittedEmailHTML(data: EodReportSubmittedEmailData): string {
  const {
    employeeName,
    employeeEmail,
    ventureName,
    officeName,
    reportDate,
    summary,
    accomplishments,
    blockers,
    tomorrowPlan,
    hoursWorked,
    tasksCompleted,
    attendanceStatus,
    attendanceMarkedAt,
    attendanceUpdatedAt,
    reportUrl,
  } = data;
  
  // Format attendance timestamps
  const markedTimeFormatted = attendanceMarkedAt ? formatTimestampWithTimezone(attendanceMarkedAt) : null;
  const updatedTimeFormatted = attendanceUpdatedAt ? formatTimestampWithTimezone(attendanceUpdatedAt) : null;
  const wasUpdated = attendanceUpdatedAt && attendanceMarkedAt && 
    new Date(attendanceUpdatedAt).getTime() > new Date(attendanceMarkedAt).getTime() + 1000;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>EOD Report Submitted - ${employeeName}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 40px 20px;">
            <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-collapse: collapse;">
              <tr>
                <td style="padding: 40px 30px;">
                  <!-- Header -->
                  <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #111827; font-size: 24px; font-weight: bold; margin: 0 0 10px 0;">
                      New EOD Report Submitted
                    </h1>
                    <div style="width: 60px; height: 3px; background-color: #3b82f6; margin: 0 auto;"></div>
                  </div>

                  <!-- Greeting -->
                  <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                    Hello,
                  </p>
                  <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 30px 0;">
                    An employee has submitted their End of Day report. Please review the details below:
                  </p>

                  <!-- Employee Info Box -->
                  <div style="background-color: #f0f9ff; border: 1px solid #3b82f6; border-radius: 12px; padding: 24px; margin: 0 0 30px 0; border-left: 4px solid #3b82f6;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                      <div style="width: 40px; height: 40px; background-color: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <span style="font-size: 20px; color: #ffffff;">📋</span>
                      </div>
                      <div>
                        <h2 style="color: #1e40af; font-size: 18px; font-weight: 600; margin: 0;">
                          ${reportDate}
                        </h2>
                        <p style="color: #1e3a8a; font-size: 14px; margin: 4px 0 0 0;">
                          ${ventureName}${officeName ? ` - ${officeName}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  <!-- Employee Details -->
                  <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 0 0 30px 0;">
                    <h3 style="color: #111827; font-size: 18px; font-weight: 600; margin: 0 0 20px 0;">
                      Employee Information
                    </h3>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600; width: 120px;">
                          Employee:
                        </td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">
                          ${employeeName}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">
                          Email:
                        </td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">
                          ${employeeEmail}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">
                          Venture:
                        </td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">
                          ${ventureName}
                        </td>
                      </tr>
                      ${officeName ? `
                        <tr>
                          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">
                            Office:
                          </td>
                          <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">
                            ${officeName}
                          </td>
                        </tr>
                      ` : ''}
                    </table>
                  </div>

                  <!-- Attendance Information -->
                  ${attendanceStatus ? `
                    <div style="background-color: #f0fdf4; border: 1px solid #22c55e; border-radius: 12px; padding: 24px; margin: 0 0 30px 0; border-left: 4px solid #22c55e;">
                      <h3 style="color: #111827; font-size: 18px; font-weight: 600; margin: 0 0 20px 0; display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 20px;">📅</span>
                        Attendance Information
                      </h3>
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600; width: 150px;">
                            Status:
                          </td>
                          <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">
                            <span style="display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; background-color: #dcfce7; color: #166534;">
                              ${attendanceStatus}
                            </span>
                          </td>
                        </tr>
                        ${markedTimeFormatted ? `
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">
                              Marked At:
                            </td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">
                              ${markedTimeFormatted}
                            </td>
                          </tr>
                        ` : ''}
                        ${wasUpdated && updatedTimeFormatted ? `
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">
                              Updated At:
                            </td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">
                              ${updatedTimeFormatted}
                              <span style="color: #f59e0b; font-size: 12px; margin-left: 8px;">(Status Changed)</span>
                            </td>
                          </tr>
                        ` : ''}
                      </table>
                      ${markedTimeFormatted ? `
                        <p style="color: #6b7280; font-size: 12px; margin: 12px 0 0 0; font-style: italic;">
                          All timestamps are stored in UTC (Coordinated Universal Time) for accuracy. Times shown are in UTC format (ISO 8601) which is timezone-independent and accurate for users in any location (India, US, etc.).
                        </p>
                      ` : ''}
                    </div>
                  ` : ''}

                  <!-- Report Summary -->
                  <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 0 0 30px 0;">
                    <h3 style="color: #111827; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
                      Summary
                    </h3>
                    <div style="color: #4b5563; font-size: 15px; line-height: 24px; padding: 16px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; white-space: pre-wrap;">
${summary.replace(/\n/g, '<br>')}
                    </div>
                  </div>

                  <!-- Additional Details -->
                  ${accomplishments || blockers || tomorrowPlan || hoursWorked !== null || tasksCompleted !== null ? `
                    <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 0 0 30px 0;">
                      <h3 style="color: #111827; font-size: 18px; font-weight: 600; margin: 0 0 20px 0;">
                        Additional Details
                      </h3>
                      <table style="width: 100%; border-collapse: collapse;">
                        ${hoursWorked !== null ? `
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600; width: 150px;">
                              Hours Worked:
                            </td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">
                              ${hoursWorked} hours
                            </td>
                          </tr>
                        ` : ''}
                        ${tasksCompleted !== null ? `
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">
                              Tasks Completed:
                            </td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">
                              ${tasksCompleted} task${tasksCompleted !== 1 ? 's' : ''}
                            </td>
                          </tr>
                        ` : ''}
                      </table>
                      ${accomplishments ? `
                        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                          <h4 style="color: #374151; font-size: 15px; font-weight: 600; margin: 0 0 8px 0;">Accomplishments:</h4>
                          <div style="color: #4b5563; font-size: 14px; line-height: 22px; white-space: pre-wrap;">
${accomplishments.replace(/\n/g, '<br>')}
                          </div>
                        </div>
                      ` : ''}
                      ${blockers ? `
                        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                          <h4 style="color: #374151; font-size: 15px; font-weight: 600; margin: 0 0 8px 0;">Blockers:</h4>
                          <div style="color: #4b5563; font-size: 14px; line-height: 22px; white-space: pre-wrap;">
${blockers.replace(/\n/g, '<br>')}
                          </div>
                        </div>
                      ` : ''}
                      ${tomorrowPlan ? `
                        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                          <h4 style="color: #374151; font-size: 15px; font-weight: 600; margin: 0 0 8px 0;">Tomorrow's Plan:</h4>
                          <div style="color: #4b5563; font-size: 14px; line-height: 22px; white-space: pre-wrap;">
${tomorrowPlan.replace(/\n/g, '<br>')}
                          </div>
                        </div>
                      ` : ''}
                    </div>
                  ` : ''}

                  <!-- CTA Button -->
                  <div style="text-align: center; margin: 0 0 30px 0;">
                    <a href="${reportUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);">
                      View Full Report
                    </a>
                  </div>

                  <!-- Footer -->
                  <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e5e7eb; text-align: center;">
                    <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 0 0 8px 0;">
                      Best regards,
                    </p>
                    <p style="color: #111827; font-size: 16px; font-weight: 600; margin: 0;">
                      SIOX Team
                    </p>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

