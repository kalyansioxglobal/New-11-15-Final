import React from 'react';

type TaskAssignmentEmailProps = {
  taskTitle: string;
  taskDescription?: string;
  priority: string;
  dueDate?: string;
  ventureName?: string;
  assignedUserName: string;
  taskUrl: string;
};

export function TaskAssignmentEmailTemplate({
  taskTitle,
  taskDescription,
  priority,
  dueDate,
  ventureName,
  assignedUserName,
  taskUrl,
}: TaskAssignmentEmailProps) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff' }}>
      <div style={{ padding: '40px 30px', backgroundColor: '#ffffff' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: '#111827', fontSize: '24px', fontWeight: 'bold', margin: '0 0 10px 0' }}>
            New Task Assignment
          </h1>
          <div style={{ width: '60px', height: '3px', backgroundColor: '#3b82f6', margin: '0 auto' }}></div>
        </div>

        {/* Greeting */}
        <p style={{ color: '#374151', fontSize: '16px', lineHeight: '24px', margin: '0 0 20px 0' }}>
          Hello {assignedUserName || 'there'},
        </p>
        <p style={{ color: '#374151', fontSize: '16px', lineHeight: '24px', margin: '0 0 30px 0' }}>
          You have been assigned a new task. Please review the details below:
        </p>

        {/* Task Card */}
        <div style={{
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          margin: '0 0 30px 0',
          borderLeft: '4px solid #3b82f6',
        }}>
          <h2 style={{
            color: '#111827',
            fontSize: '20px',
            fontWeight: '600',
            margin: '0 0 16px 0',
            lineHeight: '28px',
          }}>
            {taskTitle}
          </h2>

          {taskDescription && (
            <div style={{
              color: '#4b5563',
              fontSize: '15px',
              lineHeight: '24px',
              margin: '0 0 20px 0',
              padding: '12px',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
            }}>
              {taskDescription.split('\n').map((line, i) => (
                <p key={i} style={{ margin: i > 0 ? '8px 0 0 0' : '0' }}>{line}</p>
              ))}
            </div>
          )}

          {/* Task Details */}
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '8px 0', color: '#6b7280', fontSize: '14px', fontWeight: '600', width: '120px' }}>
                    Priority:
                  </td>
                  <td style={{ padding: '8px 0', color: '#111827', fontSize: '14px', fontWeight: '500' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      backgroundColor: priority === 'CRITICAL' ? '#fee2e2' : priority === 'HIGH' ? '#fed7aa' : priority === 'MEDIUM' ? '#fef3c7' : '#f3f4f6',
                      color: priority === 'CRITICAL' ? '#991b1b' : priority === 'HIGH' ? '#9a3412' : priority === 'MEDIUM' ? '#854d0e' : '#374151',
                    }}>
                      {priority}
                    </span>
                  </td>
                </tr>
                {dueDate && (
                  <tr>
                    <td style={{ padding: '8px 0', color: '#6b7280', fontSize: '14px', fontWeight: '600' }}>
                      Due Date:
                    </td>
                    <td style={{ padding: '8px 0', color: '#111827', fontSize: '14px', fontWeight: '500' }}>
                      {dueDate}
                    </td>
                  </tr>
                )}
                {ventureName && (
                  <tr>
                    <td style={{ padding: '8px 0', color: '#6b7280', fontSize: '14px', fontWeight: '600' }}>
                      Venture:
                    </td>
                    <td style={{ padding: '8px 0', color: '#111827', fontSize: '14px', fontWeight: '500' }}>
                      {ventureName}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA Button */}
        <div style={{ textAlign: 'center', margin: '0 0 30px 0' }}>
          <a
            href={taskUrl}
            style={{
              display: 'inline-block',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              padding: '14px 32px',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
            }}
          >
            View Task
          </a>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '40px',
          paddingTop: '30px',
          borderTop: '1px solid #e5e7eb',
          textAlign: 'center',
        }}>
          <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '20px', margin: '0 0 8px 0' }}>
            Best regards,
          </p>
          <p style={{ color: '#111827', fontSize: '16px', fontWeight: '600', margin: '0' }}>
            SIOX Team
          </p>
        </div>
      </div>
    </div>
  );
}


