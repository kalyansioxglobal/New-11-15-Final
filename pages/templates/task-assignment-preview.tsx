import React from 'react';
import { TaskAssignmentEmailTemplate } from '../../templates/emails/taskAssignment';
import { getTaskAssignmentEmailHTML } from '../../templates/emails/taskAssignment.html';

/**
 * Preview page for Task Assignment Email Template
 * Access at: /templates/task-assignment-preview
 */
export default function TaskAssignmentPreviewPage() {
  const sampleData = {
    taskTitle: 'Review Q4 Financial Reports',
    taskDescription: 'Please review the quarterly financial reports and provide feedback. The reports include:\n\n• Revenue analysis\n• Expense breakdown\n• Profit margins\n• Comparative analysis with previous quarters',
    priority: 'HIGH',
    dueDate: 'Dec 31, 2024',
    ventureName: 'SIOX Global',
    assignedUserName: 'John Doe',
    taskUrl: 'https://app.sioxglobal.com/tasks/123',
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h1 style={{ margin: '0 0 10px 0', color: '#111827' }}>Task Assignment Email Template Preview</h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
            This is a preview of the email template used when tasks are assigned to users.
          </p>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <TaskAssignmentEmailTemplate {...sampleData} />
        </div>
      </div>
    </div>
  );
}

