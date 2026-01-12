/**
 * Missed EOD Explanation Email HTML Template
 * Generates HTML for missed EOD explanation notification emails to managers
 */

export type MissedEodExplanationEmailData = {
  employeeName: string;
  employeeEmail: string;
  ventureName: string;
  consecutiveDays: number;
  missedDates: string[];
  explanation: string;
  explanationUrl: string;
};

/**
 * Generates HTML email template for missed EOD explanation notifications
 */
export function getMissedEodExplanationEmailHTML(data: MissedEodExplanationEmailData): string {
  const {
    employeeName,
    employeeEmail,
    ventureName,
    consecutiveDays,
    missedDates,
    explanation,
    explanationUrl,
  } = data;

  const formattedDates = missedDates.join(', ');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Missed EOD Reports - ${employeeName}</title>
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
                      Missed EOD Reports Notification
                    </h1>
                    <div style="width: 60px; height: 3px; background-color: #f59e0b; margin: 0 auto;"></div>
                  </div>

                  <!-- Greeting -->
                  <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                    Hello,
                  </p>
                  <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 30px 0;">
                    An employee has submitted an explanation for missed EOD reports. Please review the details below:
                  </p>

                  <!-- Alert Box -->
                  <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 12px; padding: 24px; margin: 0 0 30px 0; border-left: 4px solid #f59e0b;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                      <div style="width: 40px; height: 40px; background-color: #fbbf24; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <span style="font-size: 20px;">⚠️</span>
                      </div>
                      <div>
                        <h2 style="color: #92400e; font-size: 18px; font-weight: 600; margin: 0;">
                          ${consecutiveDays} Consecutive Day${consecutiveDays > 1 ? 's' : ''} Missed
                        </h2>
                        <p style="color: #78350f; font-size: 14px; margin: 4px 0 0 0;">
                          ${ventureName}
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
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600; vertical-align: top;">
                          Missed Dates:
                        </td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">
                          ${formattedDates}
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- Explanation -->
                  <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 0 0 30px 0;">
                    <h3 style="color: #111827; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
                      Employee Explanation
                    </h3>
                    <div style="color: #4b5563; font-size: 15px; line-height: 24px; padding: 16px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; white-space: pre-wrap;">
${explanation.replace(/\n/g, '<br>')}
                    </div>
                  </div>

                  <!-- CTA Button -->
                  <div style="text-align: center; margin: 0 0 30px 0;">
                    <a href="${explanationUrl}" style="display: inline-block; background-color: #f59e0b; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);">
                      Review Explanation
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

