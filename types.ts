
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
  analytics?: MeetingAnalytics;
  meeting_analytics?: MeetingAnalytics;
  followUp?: FollowUpData;
  follow_up_data?: FollowUpData;
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
  ANALYTICS = 'analytics'
}
