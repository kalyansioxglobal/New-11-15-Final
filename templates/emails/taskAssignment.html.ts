/**
 * Task Assignment Email HTML Template
 * Generates HTML for task assignment notification emails
 */

export type TaskAssignmentEmailData = {
  taskTitle: string;
  taskDescription?: string;
  priority: string;
  dueDate?: string;
  ventureName?: string;
  assignedUserName: string;
  taskUrl: string;
};

/**
 * Generates HTML email template for task assignment notifications
 */
export function getTaskAssignmentEmailHTML(data: TaskAssignmentEmailData): string {
  const {
    taskTitle,
    taskDescription,
    priority,
    dueDate,
    ventureName,
    assignedUserName,
    taskUrl,
  } = data;

  // Priority badge colors
  const priorityColors: Record<string, { bg: string; color: string }> = {
    CRITICAL: { bg: '#fee2e2', color: '#991b1b' },
    HIGH: { bg: '#fed7aa', color: '#9a3412' },
    MEDIUM: { bg: '#fef3c7', color: '#854d0e' },
    LOW: { bg: '#f3f4f6', color: '#374151' },
  };

  const priorityStyle = priorityColors[priority] || priorityColors.MEDIUM;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Task Assignment: ${taskTitle}</title>
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
                      New Task Assignment
                    </h1>
                    <div style="width: 60px; height: 3px; background-color: #3b82f6; margin: 0 auto;"></div>
                  </div>

                  <!-- Greeting -->
                  <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                    Hello ${assignedUserName || 'there'},
                  </p>
                  <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 30px 0;">
                    You have been assigned a new task. Please review the details below:
                  </p>

                  <!-- Task Card -->
                  <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 0 0 30px 0; border-left: 4px solid #3b82f6;">
                    <h2 style="color: #111827; font-size: 20px; font-weight: 600; margin: 0 0 16px 0; line-height: 28px;">
                      ${taskTitle}
                    </h2>

                    ${taskDescription ? `
                      <div style="color: #4b5563; font-size: 15px; line-height: 24px; margin: 0 0 20px 0; padding: 12px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb;">
                        ${taskDescription.replace(/\n/g, '<br>')}
                      </div>
                    ` : ''}

                    <!-- Task Details -->
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600; width: 120px;">
                            Priority:
                          </td>
                          <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">
                            <span style="display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; background-color: ${priorityStyle.bg}; color: ${priorityStyle.color};">
                              ${priority}
                            </span>
                          </td>
                        </tr>
                        ${dueDate ? `
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">
                              Due Date:
                            </td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">
                              ${dueDate}
                            </td>
                          </tr>
                        ` : ''}
                        ${ventureName ? `
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">
                              Venture:
                            </td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">
                              ${ventureName}
                            </td>
                          </tr>
                        ` : ''}
                      </table>
                    </div>
                  </div>

                  <!-- CTA Button -->
                  <div style="text-align: center; margin: 0 0 30px 0;">
                    <a href="${taskUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);">
                      View Task
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


