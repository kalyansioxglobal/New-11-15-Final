/**
 * EOD Report Needs Attention Email HTML Template
 * Generates HTML for EOD report "Needs Attention" notification emails to employees
 */

export type EodReportNeedsAttentionEmailData = {
  employeeName: string;
  managerName: string;
  ventureName: string;
  officeName?: string;
  reportDate: string;
  managerNotes?: string;
  reportUrl: string;
};

/**
 * Generates HTML email template for EOD report "Needs Attention" notifications
 */
export function getEodReportNeedsAttentionEmailHTML(data: EodReportNeedsAttentionEmailData): string {
  const {
    employeeName,
    managerName,
    ventureName,
    officeName,
    reportDate,
    managerNotes,
    reportUrl,
  } = data;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>EOD Report Needs Attention - ${reportDate}</title>
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
                      Your EOD Report Needs Attention
                    </h1>
                    <div style="width: 60px; height: 3px; background-color: #ef4444; margin: 0 auto;"></div>
                  </div>

                  <!-- Alert Box -->
                  <div style="background-color: #fee2e2; border: 1px solid #ef4444; border-radius: 12px; padding: 24px; margin: 0 0 30px 0; border-left: 4px solid #ef4444;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                      <div style="width: 40px; height: 40px; background-color: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <span style="font-size: 20px; color: #ffffff;">⚠️</span>
                      </div>
                      <div>
                        <h2 style="color: #991b1b; font-size: 18px; font-weight: 600; margin: 0;">
                          Status: Needs Attention
                        </h2>
                        <p style="color: #7f1d1d; font-size: 14px; margin: 4px 0 0 0;">
                          ${reportDate}
                        </p>
                      </div>
                    </div>
                  </div>

                  <!-- Greeting -->
                  <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                    Hello ${employeeName},
                  </p>
                  <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 30px 0;">
                    Your manager, <strong>${managerName}</strong>, has reviewed your End of Day report and marked it as <strong>"Needs Attention"</strong>. Please review the feedback below and take necessary action.
                  </p>

                  <!-- Report Details -->
                  <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 0 0 30px 0;">
                    <h3 style="color: #111827; font-size: 18px; font-weight: 600; margin: 0 0 20px 0;">
                      Report Details
                    </h3>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600; width: 120px;">
                          Date:
                        </td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">
                          ${reportDate}
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
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600; vertical-align: top;">
                          Reviewed By:
                        </td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">
                          ${managerName}
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- Manager Notes -->
                  ${managerNotes ? `
                    <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 12px; padding: 24px; margin: 0 0 30px 0; border-left: 4px solid #f59e0b;">
                      <h3 style="color: #111827; font-size: 18px; font-weight: 600; margin: 0 0 16px 0; display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 20px;">💬</span>
                        Manager Feedback
                      </h3>
                      <div style="color: #78350f; font-size: 15px; line-height: 24px; padding: 16px; background-color: #fffbeb; border-radius: 8px; border: 1px solid #fde68a; white-space: pre-wrap;">
${managerNotes.replace(/\n/g, '<br>')}
                      </div>
                    </div>
                  ` : `
                    <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 12px; padding: 24px; margin: 0 0 30px 0; border-left: 4px solid #f59e0b;">
                      <h3 style="color: #111827; font-size: 18px; font-weight: 600; margin: 0 0 8px 0; display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 20px;">💬</span>
                        Manager Feedback
                      </h3>
                      <p style="color: #78350f; font-size: 14px; line-height: 22px; margin: 0;">
                        Your manager has marked this report as needing attention. Please review your report and address any concerns.
                      </p>
                    </div>
                  `}

                  <!-- Action Required -->
                  <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 24px; margin: 0 0 30px 0;">
                    <h3 style="color: #991b1b; font-size: 18px; font-weight: 600; margin: 0 0 12px 0;">
                      📋 Action Required
                    </h3>
                    <p style="color: #7f1d1d; font-size: 15px; line-height: 24px; margin: 0 0 16px 0;">
                      Please review your EOD report and take the following steps:
                    </p>
                    <ul style="color: #7f1d1d; font-size: 15px; line-height: 24px; margin: 0; padding-left: 20px;">
                      <li style="margin-bottom: 8px;">Review the manager's feedback above</li>
                      <li style="margin-bottom: 8px;">Address any concerns or clarifications needed</li>
                      <li style="margin-bottom: 8px;">Update your report if necessary</li>
                      <li>Contact your manager if you have any questions</li>
                    </ul>
                  </div>

                  <!-- CTA Button -->
                  <div style="text-align: center; margin: 0 0 30px 0;">
                    <a href="${reportUrl}" style="display: inline-block; background-color: #ef4444; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);">
                      View Your Report
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

