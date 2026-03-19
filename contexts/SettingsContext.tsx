import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type EmailDigestFrequency = 'daily' | 'weekly' | 'monthly';
export type AudioQuality = 'low' | 'standard' | 'high' | 'lossless';
export type AutoJoinMode = 'off' | 'manual' | 'internal_only' | 'all_confirm_external' | 'all';
export type RecordingConsentMode = 'workspace_default' | 'always_notify' | 'manual';
export type RecapAudience = 'me' | 'participants' | 'workspace';
export type RecapDeliveryChannel = 'email' | 'slack' | 'app';
export type RecapDeliveryTiming = 'instant' | 'after_review' | 'daily_digest';
export type ShareAudience = 'private' | 'participants' | 'workspace';
export type SummaryStyle = 'bullets' | 'memo' | 'timeline' | 'decision_log' | 'structured';
export type SummaryTone = 'neutral' | 'executive' | 'friendly' | 'analytical' | 'decisive';
export type SummaryVerbosity = 'brief' | 'standard' | 'detailed';
export type ActionItemStrictness = 'loose' | 'standard' | 'strict';
export type DecisionTrackingMode = 'important_only' | 'confirmed_only' | 'include_rationale';
export type StakeholderOutputMode = 'self' | 'executive' | 'client' | 'team' | 'interview_panel';
export type MemoryScope = 'personal' | 'project' | 'client' | 'workspace';
export type MemoryReviewMode = 'auto' | 'review' | 'manual_only';
export type MemoryApplyMode = 'automatic' | 'confirm_project' | 'manual_only';
export type SensitiveMeetingMode = 'off' | 'manual_only' | 'external_only';
export type ProcessingMode = 'standard_cloud' | 'privacy_first' | 'local_when_available';
export type WorkspacePrivacyDefault = 'balanced' | 'internal_only' | 'sensitive_first';
export type StartupPage = 'dashboard' | 'calendar' | 'notes' | 'ai_chat' | 'meeting_prep' | 'settings';
export type ExportFormat = 'pdf' | 'markdown' | 'json' | 'structured_notes';
export type SearchMode = 'relevance' | 'recency';
export type AutomationScope = 'personal' | 'workspace';

export interface AIOutputPreset {
  id: string;
  name: string;
  audience: StakeholderOutputMode;
  style: SummaryStyle;
  tone: SummaryTone;
  verbosity: SummaryVerbosity;
  prioritize: string[];
  ignore: string[];
  actionItemStrictness: ActionItemStrictness;
  decisionTracking: DecisionTrackingMode;
  deliveryChannels: RecapDeliveryChannel[];
  description: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  scope: AutomationScope;
  trigger: string;
  conditions: string[];
  actions: string[];
}

export interface MemoryItem {
  id: string;
  scope: MemoryScope;
  title: string;
  sourceLabel: string;
  expiresIn: string;
  confidence: 'high' | 'medium';
}

export interface AppSettings {
  // General
  language: string;
  timezone: string;
  dateFormat: string;
  autoSave: boolean;
  startupPage: StartupPage;
  compactMode: boolean;
  speedMode: boolean;
  reducedMotion: boolean;
  commandPaletteEnabled: boolean;
  keyboardShortcutHints: boolean;
  advancedSearchMode: SearchMode;
  // Notifications
  emailDigest: boolean;
  emailDigestFrequency: EmailDigestFrequency;
  meetingReminders: boolean;
  reminderMinutesBefore: number;
  aiSummaryAlerts: boolean;
  desktopNotifications: boolean;
  failureAlerts: boolean;
  recapDeliveryChannels: RecapDeliveryChannel[];
  recapDeliveryTiming: RecapDeliveryTiming;
  recapAudience: RecapAudience;
  // Recording and capture
  audioQuality: AudioQuality;
  autoTranscribe: boolean;
  speakerDiarization: boolean;
  noiseSuppression: boolean;
  autoDetectLanguage: boolean;
  autoJoinMeetings: boolean;
  autoJoinMode: AutoJoinMode;
  askBeforeExternalJoin: boolean;
  recordInternalMeetings: boolean;
  recordExternalMeetings: boolean;
  recordingConsentMode: RecordingConsentMode;
  defaultTranscriptLanguage: string;
  translationLanguage: string;
  // Sharing
  defaultShareAudience: ShareAudience;
  allowPublicLinks: boolean;
  collaboratorsCanReshare: boolean;
  neverAutoShareExternal: boolean;
  // AI personalization
  defaultAIPresetId: string;
  summaryStyle: SummaryStyle;
  summaryTone: SummaryTone;
  summaryVerbosity: SummaryVerbosity;
  actionItemStrictness: ActionItemStrictness;
  decisionTrackingMode: DecisionTrackingMode;
  stakeholderOutputMode: StakeholderOutputMode;
  summaryFocusAreas: string[];
  summaryIgnoreAreas: string[];
  customPromptNotes: string;
  aiOutputPresets: AIOutputPreset[];
  // Memory
  memoryEnabled: boolean;
  memoryScopes: MemoryScope[];
  memoryReviewMode: MemoryReviewMode;
  memoryApplyMode: MemoryApplyMode;
  memoryRememberCategories: string[];
  memoryNeverRememberCategories: string[];
  memoryExpirationDays: number;
  memoryItems: MemoryItem[];
  // Privacy and trust
  dataRetentionDays: number;
  audioRetentionDays: number;
  transcriptRetentionDays: number;
  transcribeWithoutAudioStorage: boolean;
  processingMode: ProcessingMode;
  sensitiveMeetingMode: SensitiveMeetingMode;
  auditVisibility: boolean;
  shareAnalytics: boolean;
  showOnlineStatus: boolean;
  // Workspace and integrations
  useWorkspaceDefaults: boolean;
  workspaceSummaryStyle: SummaryStyle;
  workspacePrivacyDefault: WorkspacePrivacyDefault;
  allowedIntegrationIds: string[];
  // Automation and power user
  automationEnabled: boolean;
  automationDraft: string;
  automationRules: AutomationRule[];
  defaultExportFormat: ExportFormat;
  automationHotkeys: boolean;
}

export const DEFAULT_AI_PRESETS: AIOutputPreset[] = [
  {
    id: 'preset-exec-brief',
    name: 'Executive Brief',
    audience: 'executive',
    style: 'memo',
    tone: 'executive',
    verbosity: 'brief',
    prioritize: ['decisions', 'risks', 'asks'],
    ignore: ['small talk', 'transcript detail'],
    actionItemStrictness: 'strict',
    decisionTracking: 'include_rationale',
    deliveryChannels: ['email', 'app'],
    description: 'For leaders who want signal, risk, and owner clarity fast.',
  },
  {
    id: 'preset-client-recap',
    name: 'Client Recap',
    audience: 'client',
    style: 'bullets',
    tone: 'friendly',
    verbosity: 'standard',
    prioritize: ['commitments', 'deadlines', 'next steps'],
    ignore: ['internal debate'],
    actionItemStrictness: 'standard',
    decisionTracking: 'confirmed_only',
    deliveryChannels: ['email', 'slack'],
    description: 'Clean follow-up language with commitments and next steps.',
  },
  {
    id: 'preset-standup',
    name: 'Team Standup',
    audience: 'team',
    style: 'bullets',
    tone: 'neutral',
    verbosity: 'brief',
    prioritize: ['blockers', 'owners', 'due dates'],
    ignore: ['repeat status'],
    actionItemStrictness: 'strict',
    decisionTracking: 'important_only',
    deliveryChannels: ['app', 'slack'],
    description: 'Fast standup output focused on blockers and ownership.',
  },
  {
    id: 'preset-interview',
    name: 'Interview Evaluation',
    audience: 'interview_panel',
    style: 'structured',
    tone: 'analytical',
    verbosity: 'standard',
    prioritize: ['candidate signals', 'concerns', 'evidence'],
    ignore: ['casual rapport'],
    actionItemStrictness: 'loose',
    decisionTracking: 'include_rationale',
    deliveryChannels: ['app'],
    description: 'Evidence-based hiring recap with signal and concern capture.',
  },
  {
    id: 'preset-product-memo',
    name: 'Product Decision Memo',
    audience: 'team',
    style: 'decision_log',
    tone: 'analytical',
    verbosity: 'detailed',
    prioritize: ['tradeoffs', 'rationale', 'owners', 'open questions'],
    ignore: ['chit-chat'],
    actionItemStrictness: 'strict',
    decisionTracking: 'include_rationale',
    deliveryChannels: ['app', 'slack'],
    description: 'For product reviews, rationale capture, and follow-through.',
  },
];

export const DEFAULT_AUTOMATION_RULES: AutomationRule[] = [
  {
    id: 'rule-client-exec',
    name: 'Client calls -> executive recap',
    description: 'When a meeting looks client-facing, create a polished recap and keep it private until review.',
    enabled: true,
    scope: 'personal',
    trigger: 'Meeting ended',
    conditions: ['Title contains "client"', 'Meeting duration is 30+ minutes'],
    actions: ['Apply Client Recap preset', 'Send recap to me only', 'Create CRM follow-up'],
  },
  {
    id: 'rule-manager-brief',
    name: 'Manager meeting shield',
    description: 'Generate a concise executive view for upward communication.',
    enabled: true,
    scope: 'personal',
    trigger: 'Transcript ready',
    conditions: ['Attendees include manager'],
    actions: ['Apply Executive Brief preset', 'Suppress team-wide sharing'],
  },
  {
    id: 'rule-decision-log',
    name: 'Long meetings -> decision log',
    description: 'Turn long discussions into structured decisions and follow-ups.',
    enabled: false,
    scope: 'workspace',
    trigger: 'Meeting ended',
    conditions: ['Meeting duration exceeds 45 minutes'],
    actions: ['Generate decision log', 'Push deadline action items to tasks'],
  },
];

export const DEFAULT_MEMORY_ITEMS: MemoryItem[] = [
  {
    id: 'memory-roadmap',
    scope: 'project',
    title: 'Roadmap reviews should highlight blocker owners first',
    sourceLabel: 'Product Sync',
    expiresIn: '30 days',
    confidence: 'high',
  },
  {
    id: 'memory-client-tone',
    scope: 'client',
    title: 'Northwind prefers commitment-focused recaps with no internal debate',
    sourceLabel: 'Northwind QBR',
    expiresIn: '90 days',
    confidence: 'high',
  },
  {
    id: 'memory-founder-style',
    scope: 'personal',
    title: 'Founder briefs should be two sections max with direct asks',
    sourceLabel: 'Leadership 1:1',
    expiresIn: 'Never',
    confidence: 'medium',
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  dateFormat: 'MM/DD/YYYY',
  autoSave: true,
  startupPage: 'dashboard',
  compactMode: false,
  speedMode: true,
  reducedMotion: false,
  commandPaletteEnabled: true,
  keyboardShortcutHints: true,
  advancedSearchMode: 'relevance',
  emailDigest: true,
  emailDigestFrequency: 'weekly',
  meetingReminders: true,
  reminderMinutesBefore: 10,
  aiSummaryAlerts: true,
  desktopNotifications: false,
  failureAlerts: true,
  recapDeliveryChannels: ['email', 'app'],
  recapDeliveryTiming: 'instant',
  recapAudience: 'me',
  audioQuality: 'high',
  autoTranscribe: true,
  speakerDiarization: true,
  noiseSuppression: true,
  autoDetectLanguage: true,
  autoJoinMeetings: false,
  autoJoinMode: 'internal_only',
  askBeforeExternalJoin: true,
  recordInternalMeetings: true,
  recordExternalMeetings: false,
  recordingConsentMode: 'workspace_default',
  defaultTranscriptLanguage: 'en',
  translationLanguage: 'en',
  defaultShareAudience: 'private',
  allowPublicLinks: false,
  collaboratorsCanReshare: false,
  neverAutoShareExternal: true,
  defaultAIPresetId: 'preset-exec-brief',
  summaryStyle: 'memo',
  summaryTone: 'executive',
  summaryVerbosity: 'brief',
  actionItemStrictness: 'strict',
  decisionTrackingMode: 'include_rationale',
  stakeholderOutputMode: 'self',
  summaryFocusAreas: ['decisions', 'blockers', 'deadlines'],
  summaryIgnoreAreas: ['small talk'],
  customPromptNotes: '',
  aiOutputPresets: DEFAULT_AI_PRESETS,
  memoryEnabled: true,
  memoryScopes: ['personal', 'project', 'client'],
  memoryReviewMode: 'review',
  memoryApplyMode: 'confirm_project',
  memoryRememberCategories: ['decisions', 'action items', 'stakeholder preferences'],
  memoryNeverRememberCategories: ['compensation', 'legal details', 'off-record comments'],
  memoryExpirationDays: 90,
  memoryItems: DEFAULT_MEMORY_ITEMS,
  dataRetentionDays: 365,
  audioRetentionDays: 30,
  transcriptRetentionDays: 365,
  transcribeWithoutAudioStorage: false,
  processingMode: 'standard_cloud',
  sensitiveMeetingMode: 'manual_only',
  auditVisibility: true,
  shareAnalytics: false,
  showOnlineStatus: true,
  useWorkspaceDefaults: true,
  workspaceSummaryStyle: 'bullets',
  workspacePrivacyDefault: 'balanced',
  allowedIntegrationIds: ['google_calendar', 'slack', 'hubspot', 'notion'],
  automationEnabled: true,
  automationDraft: '',
  automationRules: DEFAULT_AUTOMATION_RULES,
  defaultExportFormat: 'markdown',
  automationHotkeys: false,
};

const STORAGE_KEY = 'lumina_settings';

interface SettingsContextValue {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  resetSettings: () => void;
  formatDate: (isoDate: string, options?: { includeTime?: boolean; short?: boolean }) => string;
  getAudioBitrate: () => number | undefined;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function formatDateWithFormat(
  isoDate: string,
  dateFormat: string,
  options?: { includeTime?: boolean; short?: boolean }
): string {
  try {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return isoDate;

    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear());
    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    let formatted = '';
    if (options?.short) {
      formatted = `${shortMonths[date.getMonth()]} ${date.getDate()}`;
    } else {
      switch (dateFormat) {
        case 'DD/MM/YYYY':
          formatted = `${day}/${month}/${year}`;
          break;
        case 'YYYY-MM-DD':
          formatted = `${year}-${month}-${day}`;
          break;
        case 'MM/DD/YYYY':
        default:
          formatted = `${month}/${day}/${year}`;
          break;
      }
    }

    if (options?.includeTime) {
      formatted += ` ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    return formatted;
  } catch {
    return isoDate;
  }
}

function getAudioBitrateForQuality(quality: AudioQuality): number | undefined {
  switch (quality) {
    case 'low':
      return 64000;
    case 'standard':
      return 128000;
    case 'high':
      return 256000;
    case 'lossless':
      return undefined;
    default:
      return 256000;
  }
}

function hydrateSettings(raw: string | null): AppSettings {
  if (!raw) return DEFAULT_SETTINGS;

  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const savedAutoJoinMode =
      parsed.autoJoinMode || (parsed.autoJoinMeetings ? 'internal_only' : DEFAULT_SETTINGS.autoJoinMode);

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      autoJoinMode: savedAutoJoinMode,
      autoJoinMeetings:
        typeof parsed.autoJoinMeetings === 'boolean' ? parsed.autoJoinMeetings : savedAutoJoinMode !== 'off',
      recapDeliveryChannels: Array.isArray(parsed.recapDeliveryChannels)
        ? parsed.recapDeliveryChannels
        : DEFAULT_SETTINGS.recapDeliveryChannels,
      summaryFocusAreas: Array.isArray(parsed.summaryFocusAreas)
        ? parsed.summaryFocusAreas
        : DEFAULT_SETTINGS.summaryFocusAreas,
      summaryIgnoreAreas: Array.isArray(parsed.summaryIgnoreAreas)
        ? parsed.summaryIgnoreAreas
        : DEFAULT_SETTINGS.summaryIgnoreAreas,
      aiOutputPresets:
        Array.isArray(parsed.aiOutputPresets) && parsed.aiOutputPresets.length > 0
          ? parsed.aiOutputPresets
          : DEFAULT_SETTINGS.aiOutputPresets,
      memoryScopes: Array.isArray(parsed.memoryScopes) ? parsed.memoryScopes : DEFAULT_SETTINGS.memoryScopes,
      memoryRememberCategories: Array.isArray(parsed.memoryRememberCategories)
        ? parsed.memoryRememberCategories
        : DEFAULT_SETTINGS.memoryRememberCategories,
      memoryNeverRememberCategories: Array.isArray(parsed.memoryNeverRememberCategories)
        ? parsed.memoryNeverRememberCategories
        : DEFAULT_SETTINGS.memoryNeverRememberCategories,
      memoryItems: Array.isArray(parsed.memoryItems) ? parsed.memoryItems : DEFAULT_SETTINGS.memoryItems,
      allowedIntegrationIds: Array.isArray(parsed.allowedIntegrationIds)
        ? parsed.allowedIntegrationIds
        : DEFAULT_SETTINGS.allowedIntegrationIds,
      automationRules: Array.isArray(parsed.automationRules) ? parsed.automationRules : DEFAULT_SETTINGS.automationRules,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => hydrateSettings(localStorage.getItem(STORAGE_KEY)));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    document.documentElement.lang = settings.language;
  }, [settings.language]);

  useEffect(() => {
    if (settings.dataRetentionDays <= 0) return;

    try {
      const rawMeetings = localStorage.getItem('lumina_meetings');
      if (!rawMeetings) return;

      const meetings = JSON.parse(rawMeetings);
      const cutoff = Date.now() - settings.dataRetentionDays * 86400000;
      const filteredMeetings = meetings.filter((meeting: { date?: string }) => {
        return new Date(meeting.date || 0).getTime() > cutoff;
      });

      if (filteredMeetings.length < meetings.length) {
        localStorage.setItem('lumina_meetings', JSON.stringify(filteredMeetings));
      }
    } catch {
      // Ignore invalid local data.
    }
  }, [settings.dataRetentionDays]);

  const value = useMemo<SettingsContextValue>(() => ({
    settings,
    updateSetting: (key, value) => {
      setSettings((current) => {
        if (key === 'autoJoinMode') {
          return {
            ...current,
            autoJoinMode: value as AppSettings['autoJoinMode'],
            autoJoinMeetings: value !== 'off',
          };
        }
        if (key === 'autoJoinMeetings') {
          return {
            ...current,
            autoJoinMeetings: value as boolean,
            autoJoinMode: value ? current.autoJoinMode || 'internal_only' : 'off',
          };
        }
        return { ...current, [key]: value };
      });
    },
    updateSettings: (patch) => {
      setSettings((current) => {
        const next = { ...current, ...patch };
        if ('autoJoinMode' in patch) {
          next.autoJoinMeetings = patch.autoJoinMode !== 'off';
        }
        if ('autoJoinMeetings' in patch && patch.autoJoinMeetings === false) {
          next.autoJoinMode = 'off';
        }
        return next;
      });
    },
    resetSettings: () => {
      setSettings(DEFAULT_SETTINGS);
    },
    formatDate: (isoDate, options) => formatDateWithFormat(isoDate, settings.dateFormat, options),
    getAudioBitrate: () => getAudioBitrateForQuality(settings.audioQuality),
  }), [settings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
