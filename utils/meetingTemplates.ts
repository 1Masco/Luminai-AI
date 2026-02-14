/**
 * Meeting templates for quick-start structured meetings
 * Pre-configured with suggested topics and discussion items
 */

export interface MeetingTemplate {
  id: string;
  name: string;
  description: string;
  emoji: string;
  suggestedTopics: string[];
  suggestedDuration: number; // in minutes
  agendaTemplate: string; // Markdown template
  questionsToAsk: string[];
  actionItemsTemplate: string[];
  attendeeRoles?: string[]; // e.g., ['Facilitator', 'Note-taker', 'Timekeeper']
}

/**
 * Collection of built-in meeting templates
 */
export const MEETING_TEMPLATES: Record<string, MeetingTemplate> = {
  standup: {
    id: 'standup',
    name: 'Daily Standup',
    emoji: '⏰',
    description: 'Quick daily sync to align team on progress and blockers',
    suggestedDuration: 15,
    suggestedTopics: ['progress', 'blockers', 'plans', 'help needed'],
    agendaTemplate: `# Daily Standup

## What I completed
- [ ] Task 1
- [ ] Task 2

## What I'm working on today
- [ ] Task 1
- [ ] Task 2

## Blockers
- None

## Help needed
- None

## Notes`,
    questionsToAsk: [
      'What progress did you make since last standup?',
      'Are there any blockers preventing you from moving forward?',
      'What are your priorities for today?',
      'Do you need help with anything?',
    ],
    actionItemsTemplate: [
      'Follow up on blockers',
      'Pair programming session if needed',
      'Escalate critical issues',
    ],
    attendeeRoles: ['Facilitator', 'Team Members'],
  },

  team_sync: {
    id: 'team_sync',
    name: 'Team Sync',
    emoji: '👥',
    description: 'Weekly team alignment meeting to discuss goals and progress',
    suggestedDuration: 45,
    suggestedTopics: ['progress', 'goals', 'roadmap', 'team health', 'decisions'],
    agendaTemplate: `# Team Sync

## Weekly Metrics
- Team velocity:
- Completed items:
- Blockers:

## Progress Updates
- Project A:
- Project B:
- Project C:

## Upcoming Week Goals
- Goal 1:
- Goal 2:
- Goal 3:

## Decisions Needed
- Decision 1:

## Team Health & Culture
- Wins to celebrate:
- Challenges:
- Suggestions:

## Notes`,
    questionsToAsk: [
      'What are our top priorities this week?',
      'What progress have we made toward our goals?',
      'What blockers are slowing us down?',
      'What decisions do we need to make?',
      'How is team morale?',
    ],
    actionItemsTemplate: [
      'Update project status',
      'Schedule follow-up meetings',
      'Resolve blockers',
      'Celebrate team wins',
    ],
    attendeeRoles: ['Team Lead', 'Team Members'],
  },

  one_on_one: {
    id: 'one_on_one',
    name: 'One-on-One',
    emoji: '💬',
    description: 'Individual check-in focused on career growth and feedback',
    suggestedDuration: 30,
    suggestedTopics: [
      'progress',
      'career growth',
      'feedback',
      'challenges',
      'support',
    ],
    agendaTemplate: `# One-on-One

## How are you feeling?
- Work:
- Life:

## Recent Wins
- Win 1:
- Win 2:

## Challenges
- Challenge 1:
- Challenge 2:

## Career Development
- Goals:
- Skills to develop:
- Learning opportunities:

## Feedback
- Manager feedback:
- Your feedback for me:

## Support Needed
- Resources:
- Mentorship:

## Notes`,
    questionsToAsk: [
      'How are you feeling about your work?',
      'What are you proud of recently?',
      'What challenges are you facing?',
      'Where do you see yourself growing?',
      'How can I better support you?',
    ],
    actionItemsTemplate: [
      'Career development plan',
      'Provide learning resources',
      'Schedule follow-up',
      'Address feedback',
    ],
    attendeeRoles: ['Manager', 'Team Member'],
  },

  client_call: {
    id: 'client_call',
    name: 'Client Call',
    emoji: '📞',
    description: 'Client meeting for updates, requirements, and relationship building',
    suggestedDuration: 60,
    suggestedTopics: [
      'project status',
      'deliverables',
      'requirements',
      'feedback',
      'timeline',
      'budget',
    ],
    agendaTemplate: `# Client Call

## Project Status
- Overall progress:
- Timeline:
- Budget:

## Completed
- Deliverable 1:
- Deliverable 2:

## In Progress
- Item 1:
- Item 2:

## Upcoming
- Planned deliverables:
- Timeline:

## Feedback from Client
- Positive feedback:
- Concerns:
- Requested changes:

## Next Steps
- Action items:
- Timeline:

## Notes`,
    questionsToAsk: [
      'How satisfied are you with the progress?',
      'Are the deliverables meeting your expectations?',
      'Do you have any concerns or feedback?',
      'Are there any requirement changes?',
      'What is your timeline for phase 2?',
    ],
    actionItemsTemplate: [
      'Update project status',
      'Incorporate feedback',
      'Send follow-up email',
      'Schedule next meeting',
      'Submit invoice if applicable',
    ],
    attendeeRoles: ['Account Manager', 'Project Lead', 'Client'],
  },

  brainstorm: {
    id: 'brainstorm',
    name: 'Brainstorm Session',
    emoji: '💡',
    description: 'Creative ideation session for new features or solutions',
    suggestedDuration: 45,
    suggestedTopics: ['problem', 'ideas', 'constraints', 'evaluation'],
    agendaTemplate: `# Brainstorm Session

## Problem Statement
- Challenge:
- Context:
- Success criteria:

## Initial Ideas
- Idea 1:
- Idea 2:
- Idea 3:

## Constraints & Considerations
- Technical:
- Budget:
- Timeline:
- User impact:

## Refined Ideas
- Idea 1:
- Idea 2:
- Idea 3:

## Next Steps
- Evaluation:
- Prototyping:
- Timeline:

## Notes`,
    questionsToAsk: [
      'What problem are we trying to solve?',
      'What would success look like?',
      'What constraints do we have?',
      'What are our boldest ideas?',
      'Which ideas should we explore further?',
    ],
    actionItemsTemplate: [
      'Create prototypes for top ideas',
      'Research feasibility',
      'Gather stakeholder feedback',
      'Schedule evaluation session',
    ],
    attendeeRoles: ['Facilitator', 'Team Members'],
  },

  retrospective: {
    id: 'retrospective',
    name: 'Retrospective',
    emoji: '🔄',
    description: 'Team reflection on what went well and what to improve',
    suggestedDuration: 60,
    suggestedTopics: ['wins', 'improvements', 'blockers', 'processes'],
    agendaTemplate: `# Retrospective

## What Went Well (Wins)
- Win 1:
- Win 2:
- Win 3:

## What Could Be Better
- Area 1:
- Area 2:
- Area 3:

## What Blocked Us
- Blocker 1:
- Blocker 2:

## Root Cause Analysis
- Blocker 1 causes:
- Blocker 2 causes:

## Action Items for Improvement
- Action 1:
- Action 2:
- Action 3:

## Team Morale
- Overall sentiment:
- Thank yous:

## Notes`,
    questionsToAsk: [
      'What are we most proud of in this sprint/period?',
      'What could we have done better?',
      'What was the biggest blocker?',
      'What should we start doing?',
      'What should we stop doing?',
      'What should we continue doing?',
    ],
    actionItemsTemplate: [
      'Implement process improvements',
      'Resolve identified blockers',
      'Celebrate team wins',
      'Follow up on previous action items',
    ],
    attendeeRoles: ['Scrum Master', 'Team Members'],
  },
};

/**
 * Get a template by ID
 */
export function getTemplate(templateId: string): MeetingTemplate | undefined {
  return MEETING_TEMPLATES[templateId];
}

/**
 * Get all available templates
 */
export function getAllTemplates(): MeetingTemplate[] {
  return Object.values(MEETING_TEMPLATES);
}

/**
 * Create a meeting from a template
 */
export function createMeetingFromTemplate(
  templateId: string,
  overrides?: Partial<any>
): any {
  const template = getTemplate(templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  return {
    title: overrides?.title || template.name,
    templateId,
    suggestedTopics: template.suggestedTopics,
    agenda: template.agendaTemplate,
    estimatedDuration: overrides?.duration || template.suggestedDuration,
    questionsToAsk: template.questionsToAsk,
    attendeeRoles: template.attendeeRoles,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Get template suggestions based on context
 */
export function suggestTemplate(context: {
  type?: string; // 'daily', 'weekly', 'client', 'planning'
  attendees?: string[];
  topic?: string;
}): MeetingTemplate[] {
  const allTemplates = getAllTemplates();

  if (context.type === 'daily') {
    return allTemplates.filter(t => t.id === 'standup');
  }

  if (context.type === 'weekly') {
    return allTemplates.filter(t => ['team_sync', 'retrospective'].includes(t.id));
  }

  if (context.type === 'client') {
    return allTemplates.filter(t => t.id === 'client_call');
  }

  if (context.type === 'planning') {
    return allTemplates.filter(t => ['brainstorm', 'team_sync'].includes(t.id));
  }

  // Return templates by relevance to topic
  if (context.topic) {
    return allTemplates.sort((a, b) => {
      const aScore = (a.suggestedTopics.join(' ').match(new RegExp(context.topic!, 'gi')) || []).length;
      const bScore = (b.suggestedTopics.join(' ').match(new RegExp(context.topic!, 'gi')) || []).length;
      return bScore - aScore;
    });
  }

  return allTemplates;
}

export default {
  MEETING_TEMPLATES,
  getTemplate,
  getAllTemplates,
  createMeetingFromTemplate,
  suggestTemplate,
};
