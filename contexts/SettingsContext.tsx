import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

// ─── Settings shape ───────────────────────────────────────────────────────────
export interface AppSettings {
  // General
  language: string;
  timezone: string;
  dateFormat: string;
  autoSave: boolean;
  // Notifications
  emailDigest: boolean;
  emailDigestFrequency: 'daily' | 'weekly' | 'monthly';
  meetingReminders: boolean;
  reminderMinutesBefore: number;
  aiSummaryAlerts: boolean;
  desktopNotifications: boolean;
  // Recording & Meeting Bot
  audioQuality: 'low' | 'standard' | 'high' | 'lossless';
  autoTranscribe: boolean;
  speakerDiarization: boolean;
  noiseSuppression: boolean;
  autoDetectLanguage: boolean;
  autoJoinMeetings: boolean;
  // Privacy
  dataRetentionDays: number;
  shareAnalytics: boolean;
  showOnlineStatus: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  dateFormat: 'MM/DD/YYYY',
  autoSave: true,
  emailDigest: true,
  emailDigestFrequency: 'weekly',
  meetingReminders: true,
  reminderMinutesBefore: 10,
  aiSummaryAlerts: true,
  desktopNotifications: false,
  audioQuality: 'high',
  autoTranscribe: true,
  speakerDiarization: true,
  noiseSuppression: true,
  autoDetectLanguage: true,
  autoJoinMeetings: false,
  dataRetentionDays: 365,
  shareAnalytics: false,
  showOnlineStatus: true,
};

const STORAGE_KEY = 'lumina_settings';

// ─── Context shape ────────────────────────────────────────────────────────────
interface SettingsContextValue {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  resetSettings: () => void;
  /** Format an ISO date string according to the user's chosen date format */
  formatDate: (isoDate: string, options?: { includeTime?: boolean; short?: boolean }) => string;
  /** Get the audioBitsPerSecond for MediaRecorder based on quality setting */
  getAudioBitrate: () => number | undefined;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

// ─── Helper: format date ──────────────────────────────────────────────────────
function formatDateWithFormat(isoDate: string, dateFormat: string, options?: { includeTime?: boolean; short?: boolean }): string {
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;

    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = String(d.getFullYear());
    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    let formatted: string;
    if (options?.short) {
      formatted = `${shortMonths[d.getMonth()]} ${d.getDate()}`;
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
      formatted += ` ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    return formatted;
  } catch {
    return isoDate;
  }
}

// ─── Audio bitrate map ────────────────────────────────────────────────────────
function getAudioBitrateForQuality(quality: AppSettings['audioQuality']): number | undefined {
  switch (quality) {
    case 'low': return 64000;
    case 'standard': return 128000;
    case 'high': return 256000;
    case 'lossless': return undefined; // browser default (highest)
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // Set lang attribute on <html>
  useEffect(() => {
    document.documentElement.lang = settings.language;
  }, [settings.language]);

  // Data retention: clean old meetings on mount
  useEffect(() => {
    if (settings.dataRetentionDays <= 0) return; // 0 = forever
    try {
      const raw = localStorage.getItem('lumina_meetings');
      if (!raw) return;
      const meetings = JSON.parse(raw);
      const cutoff = Date.now() - settings.dataRetentionDays * 86400000;
      const filtered = meetings.filter((m: any) => new Date(m.date).getTime() > cutoff);
      if (filtered.length < meetings.length) {
        localStorage.setItem('lumina_meetings', JSON.stringify(filtered));
      }
    } catch { /* ignore */ }
  }, [settings.dataRetentionDays]);

  const updateSetting = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const formatDate = useCallback((isoDate: string, options?: { includeTime?: boolean; short?: boolean }) => {
    return formatDateWithFormat(isoDate, settings.dateFormat, options);
  }, [settings.dateFormat]);

  const getAudioBitrate = useCallback(() => {
    return getAudioBitrateForQuality(settings.audioQuality);
  }, [settings.audioQuality]);

  const value = useMemo<SettingsContextValue>(() => ({
    settings,
    updateSetting,
    resetSettings,
    formatDate,
    getAudioBitrate,
  }), [settings, updateSetting, resetSettings, formatDate, getAudioBitrate]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
