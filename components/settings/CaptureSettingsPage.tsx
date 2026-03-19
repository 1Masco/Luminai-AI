import React from 'react';
import type { AppSettings } from '../../contexts/SettingsContext';
import { AUTO_JOIN_MODE_OPTIONS, CONSENT_MODE_OPTIONS, LANGUAGE_OPTIONS } from './settingsConfig';
import { HighlightCard, ScopeBadge, SelectControl, SegmentedControl, SettingRow, SettingsSection, Toggle } from './SettingsPrimitives';

interface CaptureSettingsPageProps {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

const audioQualityOptions = [
  { value: 'low', label: 'Low (64 kbps)' },
  { value: 'standard', label: 'Standard (128 kbps)' },
  { value: 'high', label: 'High (256 kbps)' },
  { value: 'lossless', label: 'Lossless' },
];

const CaptureSettingsPage: React.FC<CaptureSettingsPageProps> = ({ settings, updateSetting }) => {
  return (
    <div className="space-y-5">
      <HighlightCard
        title="Capture should feel dependable"
        description="Lumina should never feel sneaky. Show users exactly when it joins, what it records, and how external meetings are handled."
        icon="fa-robot"
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border px-4 py-3" style={{ borderColor: 'rgba(99,102,241,0.18)' }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-tertiary)' }}>
              Auto-join
            </p>
            <p className="mt-1 text-sm font-bold" style={{ color: '#c7d2fe' }}>
              {AUTO_JOIN_MODE_OPTIONS.find((option) => option.value === settings.autoJoinMode)?.label}
            </p>
          </div>
          <div className="rounded-2xl border px-4 py-3" style={{ borderColor: 'rgba(99,102,241,0.18)' }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-tertiary)' }}>
              External safeguard
            </p>
            <p className="mt-1 text-sm font-bold" style={{ color: '#c7d2fe' }}>
              {settings.askBeforeExternalJoin ? 'Ask before joining' : 'Join with defaults'}
            </p>
          </div>
          <div className="rounded-2xl border px-4 py-3" style={{ borderColor: 'rgba(99,102,241,0.18)' }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-tertiary)' }}>
              Consent model
            </p>
            <p className="mt-1 text-sm font-bold" style={{ color: '#c7d2fe' }}>
              {CONSENT_MODE_OPTIONS.find((option) => option.value === settings.recordingConsentMode)?.label}
            </p>
          </div>
        </div>
      </HighlightCard>

      <SettingsSection
        title="Auto-join policy"
        description="Make join behavior predictable for internal and external meetings."
        badge={<ScopeBadge label="Personal" />}
      >
        <SegmentedControl
          value={settings.autoJoinMode}
          options={AUTO_JOIN_MODE_OPTIONS}
          onChange={(value) => updateSetting('autoJoinMode', value as AppSettings['autoJoinMode'])}
        />

        <SettingRow
          title="Ask before external meetings"
          description="Prompt before Lumina joins calls that include people outside your organization."
          icon="fa-user-shield"
          iconColor="#f59e0b"
          scope={<ScopeBadge label="Trust default" tone="highlight" />}
        >
          <div className="flex items-center justify-end">
            <Toggle checked={settings.askBeforeExternalJoin} onChange={(value) => updateSetting('askBeforeExternalJoin', value)} />
          </div>
        </SettingRow>

        <SettingRow
          title="Auto-record internal meetings"
          description="Capture internal calls without extra clicks when they match your join policy."
          icon="fa-building"
          iconColor="#22c55e"
        >
          <div className="flex items-center justify-end">
            <Toggle checked={settings.recordInternalMeetings} onChange={(value) => updateSetting('recordInternalMeetings', value)} />
          </div>
        </SettingRow>

        <SettingRow
          title="Auto-record external meetings"
          description="Keep this off if you prefer manual confirmation for customer, legal, or hiring calls."
          icon="fa-user-group"
          iconColor="#fb7185"
        >
          <div className="flex items-center justify-end">
            <Toggle checked={settings.recordExternalMeetings} onChange={(value) => updateSetting('recordExternalMeetings', value)} />
          </div>
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        title="Recording defaults"
        description="Tune capture quality, transcription behavior, and spoken-language defaults."
        badge={<ScopeBadge label="Personal" />}
      >
        <SettingRow
          title="Audio quality"
          description="Higher quality improves post-call processing but uses more storage."
          icon="fa-wave-square"
          iconColor="#38bdf8"
        >
          <SelectControl
            value={settings.audioQuality}
            options={audioQualityOptions}
            onChange={(value) => updateSetting('audioQuality', value as AppSettings['audioQuality'])}
          />
        </SettingRow>

        <SettingRow
          title="Auto-transcribe"
          description="Generate transcript and recap automatically after capture ends."
          icon="fa-closed-captioning"
          iconColor="#a78bfa"
        >
          <div className="flex items-center justify-end">
            <Toggle checked={settings.autoTranscribe} onChange={(value) => updateSetting('autoTranscribe', value)} />
          </div>
        </SettingRow>

        <SettingRow
          title="Speaker diarization"
          description="Separate and label speakers to make summaries and accountability more accurate."
          icon="fa-users-viewfinder"
          iconColor="#818cf8"
        >
          <div className="flex items-center justify-end">
            <Toggle checked={settings.speakerDiarization} onChange={(value) => updateSetting('speakerDiarization', value)} />
          </div>
        </SettingRow>

        <SettingRow
          title="Noise suppression"
          description="Reduce background noise during local recording capture."
          icon="fa-volume-xmark"
          iconColor="#f97316"
        >
          <div className="flex items-center justify-end">
            <Toggle checked={settings.noiseSuppression} onChange={(value) => updateSetting('noiseSuppression', value)} />
          </div>
        </SettingRow>

        <SettingRow
          title="Transcript language"
          description="Set a preferred language if your meetings are mostly consistent."
          icon="fa-language"
          iconColor="#60a5fa"
        >
          <SelectControl
            value={settings.defaultTranscriptLanguage}
            options={LANGUAGE_OPTIONS}
            onChange={(value) => updateSetting('defaultTranscriptLanguage', value)}
          />
        </SettingRow>

        <SettingRow
          title="Auto-detect spoken language"
          description="Let Lumina detect language switches automatically during transcription."
          icon="fa-globe"
          iconColor="#14b8a6"
        >
          <div className="flex items-center justify-end">
            <Toggle checked={settings.autoDetectLanguage} onChange={(value) => updateSetting('autoDetectLanguage', value)} />
          </div>
        </SettingRow>

        <SettingRow
          title="Consent behavior"
          description="Choose how explicit recording notifications should be handled."
          icon="fa-hand"
          iconColor="#e879f9"
        >
          <SelectControl
            value={settings.recordingConsentMode}
            options={CONSENT_MODE_OPTIONS}
            onChange={(value) => updateSetting('recordingConsentMode', value as AppSettings['recordingConsentMode'])}
          />
        </SettingRow>
      </SettingsSection>
    </div>
  );
};

export default CaptureSettingsPage;
