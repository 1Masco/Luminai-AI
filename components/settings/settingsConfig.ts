import type {
  ActionItemStrictness,
  AppSettings,
  AutoJoinMode,
  DecisionTrackingMode,
  ExportFormat,
  MemoryApplyMode,
  MemoryReviewMode,
  ProcessingMode,
  RecordingConsentMode,
  SearchMode,
  ShareAudience,
  StartupPage,
  StakeholderOutputMode,
  SummaryStyle,
  SummaryTone,
  SummaryVerbosity,
  WorkspacePrivacyDefault,
} from '../../contexts/SettingsContext';

export type SettingsPageId =
  | 'general'
  | 'capture'
  | 'recaps'
  | 'ai'
  | 'memory'
  | 'privacy'
  | 'automations'
  | 'workspace'
  | 'power';

export interface SettingsPageDefinition {
  id: SettingsPageId;
  label: string;
  icon: string;
  description: string;
  group: 'Basic' | 'Advanced' | 'Power User';
  keywords: string[];
}

export const SETTINGS_PAGES: SettingsPageDefinition[] = [
  {
    id: 'general',
    label: 'General',
    icon: 'fa-sliders',
    description: 'Appearance, startup flow, and daily UX defaults.',
    group: 'Basic',
    keywords: ['theme', 'language', 'timezone', 'date', 'startup', 'compact', 'speed'],
  },
  {
    id: 'capture',
    label: 'Meeting Capture',
    icon: 'fa-microphone-lines',
    description: 'Recording, auto-join, transcription, and consent behavior.',
    group: 'Basic',
    keywords: ['recording', 'auto join', 'calendar', 'audio', 'language', 'consent'],
  },
  {
    id: 'recaps',
    label: 'Recaps & Sharing',
    icon: 'fa-paper-plane',
    description: 'Delivery, audience, sharing defaults, and recap notifications.',
    group: 'Basic',
    keywords: ['summary', 'share', 'email', 'slack', 'links', 'audience'],
  },
  {
    id: 'ai',
    label: 'AI Controls',
    icon: 'fa-sparkles',
    description: 'How Lumina thinks, summarizes, prioritizes, and formats output.',
    group: 'Advanced',
    keywords: ['preset', 'tone', 'verbosity', 'action items', 'decisions', 'stakeholder'],
  },
  {
    id: 'memory',
    label: 'Memory & Context',
    icon: 'fa-brain',
    description: 'Persistent cross-meeting memory, scope, expiry, and context routing.',
    group: 'Advanced',
    keywords: ['memory', 'context', 'project', 'client', 'expiry', 'ledger'],
  },
  {
    id: 'privacy',
    label: 'Privacy & Trust',
    icon: 'fa-shield-halved',
    description: 'Retention, processing, external safeguards, and sensitive mode.',
    group: 'Advanced',
    keywords: ['privacy', 'retention', 'audio', 'sensitive', 'audit', 'delete'],
  },
  {
    id: 'automations',
    label: 'Automations',
    icon: 'fa-wand-magic-sparkles',
    description: 'Rules, templates, and natural-language workflow creation.',
    group: 'Power User',
    keywords: ['rules', 'automation', 'templates', 'conditions', 'workflow'],
  },
  {
    id: 'workspace',
    label: 'Workspace',
    icon: 'fa-users-gear',
    description: 'Team defaults, integrations, and admin-ready policy surfaces.',
    group: 'Advanced',
    keywords: ['workspace', 'policy', 'team', 'role', 'integration', 'default'],
  },
  {
    id: 'power',
    label: 'Power User',
    icon: 'fa-keyboard',
    description: 'Shortcuts, exports, command palette, and speed preferences.',
    group: 'Power User',
    keywords: ['shortcuts', 'command palette', 'export', 'search', 'hotkeys'],
  },
];

export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
];

export const DATE_FORMAT_OPTIONS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
];

export const STARTUP_PAGE_OPTIONS: Array<{ value: StartupPage; label: string }> = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'notes', label: 'Notes' },
  { value: 'ai_chat', label: 'AI Chat' },
  { value: 'meeting_prep', label: 'Meeting Prep' },
  { value: 'settings', label: 'Settings' },
];

export const AUTO_JOIN_MODE_OPTIONS: Array<{ value: AutoJoinMode; label: string; description: string }> = [
  { value: 'off', label: 'Off', description: 'Join nothing automatically.' },
  { value: 'manual', label: 'Manual', description: 'Only join when you explicitly trigger capture.' },
  { value: 'internal_only', label: 'Internal only', description: 'Auto-join internal meetings only.' },
  {
    value: 'all_confirm_external',
    label: 'Confirm external',
    description: 'Auto-join internal meetings and ask before external meetings.',
  },
  { value: 'all', label: 'All meetings', description: 'Auto-join everything with default rules.' },
];

export const CONSENT_MODE_OPTIONS: Array<{ value: RecordingConsentMode; label: string }> = [
  { value: 'workspace_default', label: 'Workspace default' },
  { value: 'always_notify', label: 'Always notify attendees' },
  { value: 'manual', label: 'Manual control' },
];

export const SHARE_AUDIENCE_OPTIONS: Array<{ value: ShareAudience; label: string }> = [
  { value: 'private', label: 'Only me' },
  { value: 'participants', label: 'Meeting participants' },
  { value: 'workspace', label: 'Workspace members' },
];

export const SUMMARY_STYLE_OPTIONS: Array<{ value: SummaryStyle; label: string }> = [
  { value: 'bullets', label: 'Bullets' },
  { value: 'memo', label: 'Memo' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'decision_log', label: 'Decision log' },
  { value: 'structured', label: 'Structured' },
];

export const SUMMARY_TONE_OPTIONS: Array<{ value: SummaryTone; label: string }> = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'executive', label: 'Executive' },
  { value: 'friendly', label: 'Client-friendly' },
  { value: 'analytical', label: 'Analytical' },
  { value: 'decisive', label: 'Decisive' },
];

export const SUMMARY_VERBOSITY_OPTIONS: Array<{ value: SummaryVerbosity; label: string }> = [
  { value: 'brief', label: 'Brief' },
  { value: 'standard', label: 'Standard' },
  { value: 'detailed', label: 'Detailed' },
];

export const ACTION_ITEM_STRICTNESS_OPTIONS: Array<{ value: ActionItemStrictness; label: string }> = [
  { value: 'loose', label: 'Loose' },
  { value: 'standard', label: 'Standard' },
  { value: 'strict', label: 'Strict' },
];

export const DECISION_TRACKING_OPTIONS: Array<{ value: DecisionTrackingMode; label: string }> = [
  { value: 'important_only', label: 'Important only' },
  { value: 'confirmed_only', label: 'Confirmed only' },
  { value: 'include_rationale', label: 'Include rationale' },
];

export const STAKEHOLDER_MODE_OPTIONS: Array<{ value: StakeholderOutputMode; label: string }> = [
  { value: 'self', label: 'For me' },
  { value: 'executive', label: 'Executive brief' },
  { value: 'client', label: 'Client recap' },
  { value: 'team', label: 'Team view' },
  { value: 'interview_panel', label: 'Interview panel' },
];

export const FOCUS_AREA_OPTIONS = [
  'decisions',
  'deadlines',
  'blockers',
  'customer pain points',
  'commitments',
  'feature requests',
  'sentiment shifts',
  'risks',
];

export const IGNORE_AREA_OPTIONS = [
  'small talk',
  'repeat status',
  'technical digressions',
  'side conversations',
  'icebreakers',
  'verbatim transcript detail',
];

export const MEMORY_CATEGORY_OPTIONS = [
  'decisions',
  'action items',
  'stakeholder preferences',
  'glossary and terminology',
  'unresolved questions',
  'recurring risks',
];

export const MEMORY_REVIEW_OPTIONS: Array<{ value: MemoryReviewMode; label: string }> = [
  { value: 'auto', label: 'Auto-save trusted memories' },
  { value: 'review', label: 'Review before saving' },
  { value: 'manual_only', label: 'Manual only' },
];

export const MEMORY_APPLY_OPTIONS: Array<{ value: MemoryApplyMode; label: string }> = [
  { value: 'automatic', label: 'Apply automatically' },
  { value: 'confirm_project', label: 'Ask for project memory' },
  { value: 'manual_only', label: 'Only pinned context' },
];

export const PROCESSING_MODE_OPTIONS: Array<{ value: ProcessingMode; label: string }> = [
  { value: 'standard_cloud', label: 'Standard cloud' },
  { value: 'privacy_first', label: 'Privacy-first cloud' },
  { value: 'local_when_available', label: 'Local when available' },
];

export const WORKSPACE_PRIVACY_OPTIONS: Array<{ value: WorkspacePrivacyDefault; label: string }> = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'internal_only', label: 'Internal-first' },
  { value: 'sensitive_first', label: 'Sensitive-first' },
];

export const EXPORT_FORMAT_OPTIONS: Array<{ value: ExportFormat; label: string }> = [
  { value: 'pdf', label: 'PDF' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'json', label: 'JSON' },
  { value: 'structured_notes', label: 'Structured Notes' },
];

export const SEARCH_MODE_OPTIONS: Array<{ value: SearchMode; label: string }> = [
  { value: 'relevance', label: 'Relevance-first' },
  { value: 'recency', label: 'Recency-first' },
];

export const INTEGRATION_OPTIONS = [
  { id: 'google_calendar', label: 'Google Calendar', icon: 'fa-calendar-day' },
  { id: 'outlook_calendar', label: 'Outlook Calendar', icon: 'fa-calendar-week' },
  { id: 'slack', label: 'Slack', icon: 'fa-hashtag' },
  { id: 'hubspot', label: 'HubSpot', icon: 'fa-chart-line' },
  { id: 'salesforce', label: 'Salesforce', icon: 'fa-cloud' },
  { id: 'notion', label: 'Notion', icon: 'fa-file-lines' },
  { id: 'jira', label: 'Jira', icon: 'fa-list-check' },
];

export const AUTOMATION_TEMPLATES: Array<{
  id: string;
  name: string;
  description: string;
  build: (settings: AppSettings) => AppSettings['automationRules'][number];
}> = [
  {
    id: 'template-client-review',
    name: 'Client review flow',
    description: 'Apply a client-safe preset and keep it private until you review it.',
    build: () => ({
      id: `rule-${Date.now()}`,
      name: 'Client review flow',
      description: 'Client meetings get polished follow-up output with private review.',
      enabled: true,
      scope: 'personal',
      trigger: 'Summary generated',
      conditions: ['Title contains "client"', 'Meeting has external attendees'],
      actions: ['Apply Client Recap preset', 'Send recap to me only', 'Block external auto-share'],
    }),
  },
  {
    id: 'template-manager-visibility',
    name: 'Manager visibility',
    description: 'When leadership joins, send a concise executive brief to yourself.',
    build: () => ({
      id: `rule-${Date.now() + 1}`,
      name: 'Manager visibility',
      description: 'Use a short upward-facing summary when leadership is involved.',
      enabled: true,
      scope: 'personal',
      trigger: 'Transcript ready',
      conditions: ['Attendees include manager'],
      actions: ['Apply Executive Brief preset', 'Send recap to me only'],
    }),
  },
  {
    id: 'template-decision-log',
    name: 'Decision log for long meetings',
    description: 'Generate a decision log when meetings run long.',
    build: () => ({
      id: `rule-${Date.now() + 2}`,
      name: 'Decision log for long meetings',
      description: 'Long meetings create structured decision output and task exports.',
      enabled: true,
      scope: 'workspace',
      trigger: 'Meeting ended',
      conditions: ['Meeting duration exceeds 45 minutes'],
      actions: ['Generate decision log', 'Push deadline action items to tasks'],
    }),
  },
];
