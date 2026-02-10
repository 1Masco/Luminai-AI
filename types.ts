
export interface TranscriptPart {
  id: string;
  speaker: string;
  text: string;
  timestamp: number;
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
  plan: 'free' | 'pro';
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
  AUTH = 'auth'
}
