
export interface TranscriptPart {
  id: string;
  speaker: string;
  text: string;
  timestamp: number;
}

export interface SpeakerTalkTime {
  seconds: number;
  percentage: number;
  wordCount: number;
}

export interface SpeakerFillerWords {
  [word: string]: number;
  total: number;
}

export interface SpeakerPace {
  wordsPerMinute: number;
  rating: 'slow' | 'moderate' | 'fast';
}

export interface HealthFactors {
  balanced: boolean;
  engagementLevel: 'low' | 'moderate' | 'high';
  balanceScore: number;
  fillerWordScore: number;
  paceScore: number;
  sentimentScore: number;
}

export interface MeetingAnalytics {
  talkTime: Record<string, SpeakerTalkTime>;
  fillerWords: Record<string, SpeakerFillerWords>;
  speakingPace: Record<string, SpeakerPace>;
  speakerSentiment: Record<string, 'positive' | 'neutral' | 'negative'>;
  healthScore: number;
  healthFactors: HealthFactors;
  coachTips: string[];
  analyzedAt: string;
}

export interface AssignedAction {
  task: string;
  assignee: string;
  deadline: string;
  priority: 'high' | 'medium' | 'low';
}

export interface DetectedDeadline {
  text: string;
  context: string;
  speaker: string;
}

export interface FollowUpData {
  assignedActions: AssignedAction[];
  keyDecisions: string[];
  followUpEmail: { subject: string; body: string };
  deadlinesDetected: DetectedDeadline[];
  generatedAt: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  duration: number; // in seconds
  transcript: TranscriptPart[];
  summary?: string;
  actionItems?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  sharedBy?: string;
  /** camelCase alias; prefer this in frontend code */
  analytics?: MeetingAnalytics;
  /** snake_case variant returned by Supabase – mapped to analytics on load */
  meeting_analytics?: MeetingAnalytics;
  /** camelCase alias; prefer this in frontend code */
  followUp?: FollowUpData;
  /** snake_case variant returned by Supabase – mapped to followUp on load */
  follow_up_data?: FollowUpData;
  /** camelCase alias; prefer this in frontend code */
  detectedLanguages?: string[];
  /** snake_case variant returned by Supabase – mapped to detectedLanguages on load */
  detected_languages?: string[];
}


export interface Note {
  id: string;
  title: string;
  content: string;
  date: string;
  folderId?: string;
  isRecording?: boolean;
  sharedBy?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  avatar: string;
  plan: 'free' | 'pro' | 'team';
  isAdmin?: boolean;
  connectedApps: {
    google: boolean;
    zoom: boolean;
    teams: boolean;
    dropbox: boolean;
  };
}

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  platform: 'zoom' | 'google_meet' | 'teams' | 'other';
  autoJoin: boolean;
  link: string;
}

// =============================================
// Multi-Language Translation Types
// =============================================
export interface TranslatedTranscriptPart {
  id: string;
  speaker: string;
  text: string;
  originalText: string;
  timestamp: number;
}

export interface MeetingTranslation {
  id: string;
  meetingId: string;
  languageCode: string;
  languageName: string;
  translatedTranscript: TranslatedTranscriptPart[];
  translatedSummary?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
] as const;

// =============================================
// AI Chat Types
// =============================================
export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  meetingReferences?: string[]; // meeting IDs referenced
  createdAt: string;
}

export interface AIChatConversation {
  id: string;
  title: string;
  meetingIds: string[];
  messages: AIChatMessage[];
  createdAt: string;
  updatedAt: string;
}

// =============================================
// Voice Memo Types
// =============================================
export interface VoiceMemo {
  id: string;
  title: string;
  transcription?: string;
  duration: number;
  category: 'standup' | 'idea' | 'todo' | 'general';
  linkedMeetingId?: string;
  tags: string[];
  isQuickCapture: boolean;
  audioUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================
// Smart Meeting Prep Types
// =============================================
export interface ContextCard {
  topic: string;
  summary: string;
  date: string;
  meetingId?: string;
}

export interface MeetingPrepBrief {
  id: string;
  meetingTitle: string;
  relatedMeetingIds: string[];
  briefContent: {
    lastDiscussed: string[];
    unresolvedActions: string[];
    suggestedAgenda: string[];
    contextCards: ContextCard[];
  };
  generatedForDate?: string;
  createdAt: string;
}

// =============================================
// Custom AI Template Types
// =============================================
export interface AITemplate {
  id: string;
  userId?: string;
  name: string;
  description?: string;
  category: 'sales' | 'standup' | '1on1' | 'interview' | 'legal' | 'medical' | 'education' | 'custom';
  promptTemplate: string;
  outputFormat: 'markdown' | 'bullet_points' | 'structured';
  isShared: boolean;
  isSystem: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_TEMPLATE_CATEGORIES = [
  { value: 'sales', label: 'Sales Call', icon: 'fa-handshake', color: 'emerald' },
  { value: 'standup', label: 'Standup', icon: 'fa-users', color: 'blue' },
  { value: '1on1', label: '1:1 Meeting', icon: 'fa-user-group', color: 'purple' },
  { value: 'interview', label: 'Interview', icon: 'fa-clipboard-question', color: 'amber' },
  { value: 'legal', label: 'Legal', icon: 'fa-scale-balanced', color: 'red' },
  { value: 'medical', label: 'Medical', icon: 'fa-stethoscope', color: 'teal' },
  { value: 'education', label: 'Education', icon: 'fa-graduation-cap', color: 'indigo' },
  { value: 'custom', label: 'Custom', icon: 'fa-wand-magic-sparkles', color: 'gray' },
] as const;

export enum AppView {
  DASHBOARD = 'dashboard',
  RECORDING = 'recording',
  MEETING_DETAIL = 'meeting_detail',
  PROCESSING = 'processing',
  CALENDAR = 'calendar',
  NOTES = 'notes',
  SHARED = 'shared',
  PROFILE = 'profile',
  AUTH = 'auth',
  ANALYTICS = 'analytics',
  AI_CHAT = 'ai_chat',
  VOICE_MEMOS = 'voice_memos',
  MEETING_PREP = 'meeting_prep',
  AI_TEMPLATES = 'ai_templates',
  TRANSLATION = 'translation',
  ADMIN = 'admin'
}
