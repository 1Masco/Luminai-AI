import React from 'react';
import type { AppSettings, RecapDeliveryChannel, RecapAudience, ShareAudience } from '../../contexts/SettingsContext';
import { SelectControl, SettingRow, SettingsSection, ScopeBadge, Toggle, ChipGroup, HighlightCard } from './SettingsPrimitives';
import { SHARE_AUDIENCE_OPTIONS } from './settingsConfig';

interface RecapsSettingsPageProps {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

const recapTimingOptions = [
  { value: 'instant', label: 'Send when ready' },
  { value: 'after_review', label: 'Hold for review' },
  { value: 'daily_digest', label: 'Batch into digest' },
];

const recapAudienceOptions = [
  { value: 'me', label: 'Only me' },
  { value: 'participants', label: 'Participants' },
  { value: 'workspace', label: 'Workspace' },
];

const deliveryOptions: RecapDeliveryChannel[] = ['email', 'slack', 'app'];

const RecapsSettingsPage: React.FC<RecapsSettingsPageProps> = ({ settings, updateSetting }) => {
  const toggleChannel = (channel: RecapDeliveryChannel) => {
    const nextChannels = settings.recapDeliveryChannels.includes(channel)
      ? settings.recapDeliveryChannels.filter((current) => current !== channel)
      : [...settings.recapDeliveryChannels, channel];

    updateSetting('recapDeliveryChannels', nextChannels);
  };

  const handleDesktopNotifications = async (nextValue: boolean) => {
    if (!nextValue) {
      updateSetting('desktopNotifications', false);
      return;
    }

    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      updateSetting('desktopNotifications', true);
      return;
    }

    if (Notification.permission === 'denied') return;

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      updateSetting('desktopNotifications', true);
    }
  };

  return (
    <div className="space-y-5">
      <HighlightCard
        title="Recaps should land in the right place"
        description="The real product moment is not when the meeting ends. It is when the right summary reaches the right audience with the right constraints."
        icon="fa-paper-plane"
      />

      <SettingsSection
        title="Delivery behavior"
        description="Control where Lumina sends outputs and when recaps are released."
        badge={<ScopeBadge label="Personal" />}
      >
        <SettingRow
          title="Recap delivery channels"
          description="Pick where your summaries should arrive by default."
          icon="fa-inbox"
          iconColor="#4ade80"
        >
          <ChipGroup
            options={deliveryOptions}
            selected={settings.recapDeliveryChannels}
            onToggle={(value) => toggleChannel(value as RecapDeliveryChannel)}
          />
        </SettingRow>

        <SettingRow
          title="Release timing"
          description="Send immediately, hold for review, or bundle into digest mode."
          icon="fa-clock"
          iconColor="#38bdf8"
        >
          <SelectControl
            value={settings.recapDeliveryTiming}
            options={recapTimingOptions}
            onChange={(value) => updateSetting('recapDeliveryTiming', value as AppSettings['recapDeliveryTiming'])}
          />
        </SettingRow>

        <SettingRow
          title="Default recap audience"
          description="Choose who receives recaps by default before any automation rules apply."
          icon="fa-share-nodes"
          iconColor="#818cf8"
        >
          <SelectControl
            value={settings.recapAudience}
            options={recapAudienceOptions}
            onChange={(value) => updateSetting('recapAudience', value as RecapAudience)}
          />
        </SettingRow>

        <SettingRow
          title="Email digest"
          description="Bundle summaries into a digest for calmer review flows."
          icon="fa-envelope-open-text"
          iconColor="#f59e0b"
        >
          <div className="flex items-center justify-end">
            <Toggle checked={settings.emailDigest} onChange={(value) => updateSetting('emailDigest', value)} />
          </div>
        </SettingRow>

        <SettingRow
          title="Digest frequency"
          description="Useful when you prefer one summary package instead of a stream of alerts."
          icon="fa-calendar-day"
          iconColor="#22d3ee"
        >
          <SelectControl
            value={settings.emailDigestFrequency}
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ]}
            onChange={(value) => updateSetting('emailDigestFrequency', value as AppSettings['emailDigestFrequency'])}
          />
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        title="Sharing defaults"
        description="Protect collaboration by making the safe path the default path."
        badge={<ScopeBadge label="Trust-first" tone="highlight" />}
      >
        <SettingRow
          title="Default access"
          description="Who gets access to a new recap before you change anything manually."
          icon="fa-lock"
          iconColor="#fb7185"
        >
          <SelectControl
            value={settings.defaultShareAudience}
            options={SHARE_AUDIENCE_OPTIONS}
            onChange={(value) => updateSetting('defaultShareAudience', value as ShareAudience)}
          />
        </SettingRow>

        <SettingRow
          title="Public links"
          description="Create open recap links when explicitly allowed. Keep off for private-by-default behavior."
          icon="fa-link"
          iconColor="#f97316"
        >
          <div className="flex items-center justify-end">
            <Toggle checked={settings.allowPublicLinks} onChange={(value) => updateSetting('allowPublicLinks', value)} />
          </div>
        </SettingRow>

        <SettingRow
          title="Collaborators can reshare"
          description="Allow teammates with access to pass recaps on without changing the owner."
          icon="fa-user-plus"
          iconColor="#c084fc"
        >
          <div className="flex items-center justify-end">
            <Toggle
              checked={settings.collaboratorsCanReshare}
              onChange={(value) => updateSetting('collaboratorsCanReshare', value)}
            />
          </div>
        </SettingRow>

        <SettingRow
          title="Never auto-share outside organization"
          description="Hard-stop external sharing unless you choose to override it on purpose."
          icon="fa-building-shield"
          iconColor="#22c55e"
          scope={<ScopeBadge label="Recommended" tone="workspace" />}
        >
          <div className="flex items-center justify-end">
            <Toggle
              checked={settings.neverAutoShareExternal}
              onChange={(value) => updateSetting('neverAutoShareExternal', value)}
            />
          </div>
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        title="Reminder and alerting"
        description="Use notifications to build trust, not noise."
        badge={<ScopeBadge label="Personal" />}
      >
        <SettingRow
          title="Meeting reminders"
          description="Get a heads-up before meetings Lumina may join or monitor."
          icon="fa-bell"
          iconColor="#f59e0b"
        >
          <div className="flex items-center justify-end">
            <Toggle checked={settings.meetingReminders} onChange={(value) => updateSetting('meetingReminders', value)} />
          </div>
        </SettingRow>

        <SettingRow
          title="Reminder timing"
          description="How early Lumina should warn you before a meeting starts."
          icon="fa-stopwatch"
          iconColor="#60a5fa"
        >
          <SelectControl
            value={String(settings.reminderMinutesBefore)}
            options={[
              { value: '5', label: '5 minutes' },
              { value: '10', label: '10 minutes' },
              { value: '15', label: '15 minutes' },
              { value: '30', label: '30 minutes' },
            ]}
            onChange={(value) => updateSetting('reminderMinutesBefore', Number(value))}
          />
        </SettingRow>

        <SettingRow
          title="Summary ready alerts"
          description="Let Lumina notify you as soon as a recap is available."
          icon="fa-sparkles"
          iconColor="#818cf8"
        >
          <div className="flex items-center justify-end">
            <Toggle checked={settings.aiSummaryAlerts} onChange={(value) => updateSetting('aiSummaryAlerts', value)} />
          </div>
        </SettingRow>

        <SettingRow
          title="Failure alerts"
          description="Notify me when capture fails, processing stalls, or a recap could not be delivered."
          icon="fa-triangle-exclamation"
          iconColor="#fb7185"
        >
          <div className="flex items-center justify-end">
            <Toggle checked={settings.failureAlerts} onChange={(value) => updateSetting('failureAlerts', value)} />
          </div>
        </SettingRow>

        <SettingRow
          title="Desktop notifications"
          description="Use browser notifications for ready recaps and important meeting alerts."
          icon="fa-desktop"
          iconColor="#22c55e"
        >
          <div className="flex items-center justify-end">
            <Toggle checked={settings.desktopNotifications} onChange={handleDesktopNotifications} />
          </div>
        </SettingRow>
      </SettingsSection>
    </div>
  );
};

export default RecapsSettingsPage;
