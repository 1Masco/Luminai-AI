import React from 'react';
import type { AppSettings, WorkspacePrivacyDefault } from '../../contexts/SettingsContext';
import { INTEGRATION_OPTIONS, SUMMARY_STYLE_OPTIONS, WORKSPACE_PRIVACY_OPTIONS } from './settingsConfig';
import { ChipGroup, HighlightCard, ScopeBadge, SelectControl, SettingRow, SettingsSection, Toggle } from './SettingsPrimitives';

interface WorkspaceSettingsPageProps {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

const WorkspaceSettingsPage: React.FC<WorkspaceSettingsPageProps> = ({ settings, updateSetting }) => {
  const selectedIntegrationLabels = INTEGRATION_OPTIONS.filter((integration) =>
    settings.allowedIntegrationIds.includes(integration.id)
  ).map((integration) => integration.label);

  const toggleIntegration = (label: string) => {
    const integration = INTEGRATION_OPTIONS.find((item) => item.label === label);
    if (!integration) return;

    const nextValues = settings.allowedIntegrationIds.includes(integration.id)
      ? settings.allowedIntegrationIds.filter((item) => item !== integration.id)
      : [...settings.allowedIntegrationIds, integration.id];

    updateSetting('allowedIntegrationIds', nextValues);
  };

  return (
    <div className="space-y-5">
      <HighlightCard
        title="Policy stack ready"
        description="Even before full enterprise rollout, the UI should teach users the difference between personal preference, workspace default, and admin policy."
        icon="fa-users-gear"
      />

      <SettingsSection
        title="Workspace defaults"
        description="Use local preview controls now so the product can scale into admin-managed settings later."
        badge={<ScopeBadge label="Workspace default" tone="workspace" />}
      >
        <SettingRow
          title="Use workspace defaults"
          description="Prefer shared team defaults over personal overrides where available."
          icon="fa-layer-group"
          iconColor="#22c55e"
          scope={<ScopeBadge label="Inheritable" tone="workspace" />}
        >
          <div className="flex items-center justify-end">
            <Toggle checked={settings.useWorkspaceDefaults} onChange={(value) => updateSetting('useWorkspaceDefaults', value)} />
          </div>
        </SettingRow>

        <SettingRow
          title="Team summary style"
          description="A workspace-level default format for team-facing recap consistency."
          icon="fa-file-signature"
          iconColor="#818cf8"
        >
          <SelectControl
            value={settings.workspaceSummaryStyle}
            options={SUMMARY_STYLE_OPTIONS}
            onChange={(value) => updateSetting('workspaceSummaryStyle', value as AppSettings['workspaceSummaryStyle'])}
          />
        </SettingRow>

        <SettingRow
          title="Workspace privacy posture"
          description="The baseline privacy strategy teams should inherit before personal overrides."
          icon="fa-building-lock"
          iconColor="#f59e0b"
        >
          <SelectControl
            value={settings.workspacePrivacyDefault}
            options={WORKSPACE_PRIVACY_OPTIONS}
            onChange={(value) => updateSetting('workspacePrivacyDefault', value as WorkspacePrivacyDefault)}
          />
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        title="Allowed integrations"
        description="Keep the product enterprise-ready by modeling explicit destination allowlists early."
        badge={<ScopeBadge label="Admin-ready" tone="policy" />}
      >
        <ChipGroup options={INTEGRATION_OPTIONS.map((integration) => integration.label)} selected={selectedIntegrationLabels} onToggle={toggleIntegration} />
      </SettingsSection>

      <SettingsSection
        title="Role and policy preview"
        description="Show how locked settings will eventually behave when admins enforce them."
        badge={<ScopeBadge label="Admin policy preview" tone="policy" />}
      >
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ['Join policy', settings.useWorkspaceDefaults ? 'Inherited from workspace' : 'Personal override active'],
            ['External sharing', settings.neverAutoShareExternal ? 'Blocked by default' : 'Allowed by user'],
            ['Retention', `${settings.transcriptRetentionDays} day transcript default`],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border px-4 py-4"
              style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)' }}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-tertiary)' }}>
                {label}
              </p>
              <p className="mt-2 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </SettingsSection>
    </div>
  );
};

export default WorkspaceSettingsPage;
