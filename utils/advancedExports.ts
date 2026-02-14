/**
 * Advanced export formats for meetings
 * Supports Markdown (Notion, Obsidian), email, and task list formats
 */

export interface Meeting {
  id: string;
  title: string;
  date: string;
  duration: number;
  summary?: string;
  actionItems?: string[];
  sentiment?: string;
  transcript?: Array<{ speaker: string; text: string; timestamp: number }>;
}

/**
 * Export meeting to Markdown format (compatible with Notion, Obsidian)
 */
export function exportToMarkdown(meeting: Meeting): string {
  const date = new Date(meeting.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let markdown = `# ${meeting.title}\n\n`;
  markdown += `**Date:** ${date}\n`;
  markdown += `**Duration:** ${meeting.duration} minutes\n`;

  if (meeting.sentiment) {
    markdown += `**Sentiment:** ${meeting.sentiment}\n`;
  }

  markdown += '\n## Summary\n\n';
  markdown += `${meeting.summary || 'No summary available'}\n`;

  if (meeting.actionItems && meeting.actionItems.length > 0) {
    markdown += '\n## Action Items\n\n';
    meeting.actionItems.forEach((item, index) => {
      markdown += `- [ ] ${item}\n`;
    });
  }

  if (meeting.transcript && meeting.transcript.length > 0) {
    markdown += '\n## Transcript\n\n';
    meeting.transcript.forEach(entry => {
      const timeString = formatTimeFromSeconds(entry.timestamp);
      markdown += `**${entry.speaker}** (${timeString}): ${entry.text}\n\n`;
    });
  }

  markdown += '\n---\n\nExported from LuminaTranscribe AI';

  return markdown;
}

/**
 * Export action items as a task list (for Todoist, Things, Reminders)
 */
export function exportAsTasks(meeting: Meeting): string {
  const date = new Date(meeting.date);
  let tasks = '';

  if (!meeting.actionItems || meeting.actionItems.length === 0) {
    return 'No action items to export';
  }

  meeting.actionItems.forEach(item => {
    // Format: Task name | Context | Due date
    const dueDate = new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000) // +7 days
      .toISOString()
      .split('T')[0];

    tasks += `${item} | From ${meeting.title} | ${dueDate}\n`;
  });

  return tasks;
}

/**
 * Export meeting as email body (HTML)
 */
export function exportAsEmailHTML(meeting: Meeting): string {
  const date = new Date(meeting.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let html = `
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; }
    h1 { color: #1f2937; margin-bottom: 0.5em; }
    .meeting-meta { background: #f3f4f6; padding: 1em; border-radius: 6px; margin: 1em 0; }
    .meta-item { margin: 0.5em 0; }
    .label { font-weight: 600; color: #6b7280; }
    .summary { background: #faf8f3; padding: 1em; border-left: 4px solid #fbbf24; margin: 1em 0; }
    .action-items { margin: 1em 0; }
    .action-items li { margin: 0.5em 0; }
    .action-items input { margin-right: 0.5em; }
    .footer { color: #9ca3af; font-size: 0.9em; margin-top: 2em; border-top: 1px solid #e5e7eb; padding-top: 1em; }
  </style>
</head>
<body>
  <h1>${escapeHtml(meeting.title)}</h1>

  <div class="meeting-meta">
    <div class="meta-item"><span class="label">Date:</span> ${date}</div>
    <div class="meta-item"><span class="label">Duration:</span> ${meeting.duration} minutes</div>
    ${meeting.sentiment ? `<div class="meta-item"><span class="label">Sentiment:</span> ${escapeHtml(meeting.sentiment)}</div>` : ''}
  </div>

  ${
    meeting.summary
      ? `
  <div class="summary">
    <h2>Summary</h2>
    <p>${meeting.summary.split('\n').join('</p><p>')}</p>
  </div>
  `
      : ''
  }

  ${
    meeting.actionItems && meeting.actionItems.length > 0
      ? `
  <div class="action-items">
    <h2>Action Items</h2>
    <ul>
      ${meeting.actionItems.map(item => `<li><input type="checkbox"> ${escapeHtml(item)}</li>`).join('')}
    </ul>
  </div>
  `
      : ''
  }

  <div class="footer">
    <p>Exported from LuminaTranscribe AI</p>
  </div>
</body>
</html>
  `;

  return html;
}

/**
 * Export meeting for Slack message
 */
export function exportForSlack(meeting: Meeting): {
  text: string;
  blocks: SlackBlock[];
} {
  const date = new Date(meeting.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: meeting.title,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Date:*\n${date}`,
        },
        {
          type: 'mrkdwn',
          text: `*Duration:*\n${meeting.duration} min`,
        },
      ],
    },
  ];

  if (meeting.summary) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Summary*\n${meeting.summary}`,
      },
    });
  }

  if (meeting.actionItems && meeting.actionItems.length > 0) {
    const items = meeting.actionItems.map(item => `• ${item}`).join('\n');
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Action Items*\n${items}`,
      },
    });
  }

  return {
    text: `Meeting: ${meeting.title}`,
    blocks,
  };
}

/**
 * Export meeting as calendar event template (iCal format)
 */
export function exportAsiCal(meeting: Meeting): string {
  const startDate = new Date(meeting.date);
  const endDate = new Date(startDate.getTime() + meeting.duration * 60 * 1000);

  const format = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  let ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//LuminaTranscribe//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${meeting.id}@luminaai.com
DTSTAMP:${format(new Date())}
DTSTART:${format(startDate)}
DTEND:${format(endDate)}
SUMMARY:${escapeIcal(meeting.title)}
DESCRIPTION:${escapeIcal(
    meeting.summary || 'Meeting recorded with LuminaTranscribe'
  )}
${meeting.actionItems && meeting.actionItems.length > 0 ? `DESCRIPTION:ACTION ITEMS:\\n${meeting.actionItems.map(escapeIcal).join('\\n')}` : ''}
END:VEVENT
END:VCALENDAR`;

  return ical;
}

/**
 * Format timestamp in MM:SS format
 */
function formatTimeFromSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Escape iCal special characters
 */
function escapeIcal(text: string): string {
  return text.replace(/[\r\n]/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

/**
 * Slack block types
 */
interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
  };
  fields?: Array<{
    type: string;
    text: string;
  }>;
}

export default {
  exportToMarkdown,
  exportAsTasks,
  exportAsEmailHTML,
  exportForSlack,
  exportAsiCal,
};
