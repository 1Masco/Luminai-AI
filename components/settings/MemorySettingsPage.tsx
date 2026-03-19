import React from 'react';
import type { AppSettings, MemoryApplyMode, MemoryReviewMode, MemoryScope } from '../../contexts/SettingsContext';
import { MEMORY_APPLY_OPTIONS, MEMORY_CATEGORY_OPTIONS, MEMORY_REVIEW_OPTIONS } from './settingsConfig';
import {
  ChipGroup,
  HighlightCard,
  ScopeBadge,
  SelectControl,
  SettingRow,
  SettingsSection,
  Toggle,
} from './SettingsPrimitives';

interface MemorySettingsPageProps {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

const memoryScopeOptions: MemoryScope[] = ['personal', 'project', 'client', 'workspace'];

const MemorySettingsPage: React.FC<MemorySettingsPageProps> = ({ settings, updateSetting }) => {
  const toggleArrayValue = (
    key: 'memoryScopes' | 'memoryRememberCategories' | 'memoryNeverRememberCategories',
    value: string
  ) => {
    const currentValues = settings[key] as string[];
    const nextValues = currentValues.includes(value)
      ? currentValues.filter((item) => item !== value)
      : [...currentValues, value];

    updateSetting(key, nextValues as AppSettings[typeof key]);
  };

  return (
    <div className="space-y-5">
      <HighlightCard
        title="Memory should be inspectable, scoped, and easy to reset"
        description="This is one of Lumina's strongest differentiators. Users should know exactly what the AI remembers, where it applies, and when it expires."
        icon="fa-brain"
      />

      <SettingsSection
        title="Memory policy"
        description="Control whether Lumina carries context forward and how aggressively it stores it."
        badge={<ScopeBadge label="Differentiator" tone="highlight" />}
      >
        <SettingRow
          title="Persistent memory"
          description="Allow Lumina to remember useful context across meetings instead of treating every call as isolated."
          icon="fa-brain"
          iconColor="#818cf8"
        >
          <div className="flex items-center justify-end">
            <Toggle checked={settings.memoryEnabled} onChange={(value) => updateSetting('memoryEnabled', value)} />
          </div>
        </SettingRow>

        <SettingRow
          title="Memory scopes"
          description="Choose which buckets Lumina is allowed to use for cross-meeting context."
          icon="fa-diagram-project"
          iconColor="#22c55e"
        >
          <ChipGroup
            options={memoryScopeOptions}
            selected={settings.memoryScopes}
            onToggle={(value) => toggleArrayValue('memoryScopes', value)}
          />
        </SettingRow>

        <SettingRow
          title="Save mode"
          description="Review-first is the safest path for teams that want control without losing memory value."
          icon="fa-folder-plus"
          iconColor="#f59e0b"
        >
          <SelectControl
            value={settings.memoryReviewMode}
            options={MEMORY_REVIEW_OPTIONS}
            onChange={(value) => updateSetting('memoryReviewMode', value as MemoryReviewMode)}
          />
        </SettingRow>

        <SettingRow
          title="Apply mode"
          description="Decide whether project and client context is applied silently or only after confirmation."
          icon="fa-route"
          iconColor="#38bdf8"
        >
          <SelectControl
            value={settings.memoryApplyMode}
            options={MEMORY_APPLY_OPTIONS}
            onChange={(value) => updateSetting('memoryApplyMode', value as MemoryApplyMode)}
          />
        </SettingRow>

        <SettingRow
          title="Memory expiry"
          description="Control how long new memory items stay active before they age out."
          icon="fa-hourglass-half"
          iconColor="#fb7185"
        >
          <SelectControl
            value={String(settings.memoryExpirationDays)}
            options={[
              { value: '7', label: '7 days' },
              { value: '30', label: '30 days' },
              { value: '90', label: '90 days' },
              { value: '365', label: '1 year' },
            ]}
            onChange={(value) => updateSetting('memoryExpirationDays', Number(value))}
          />
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        title="Memory filters"
        description="Teach Lumina what is useful long-term and what should never affect future recaps."
        badge={<ScopeBadge label="Trust-first" tone="workspace" />}
      >
        <SettingRow
          title="Remember these categories"
          description="Useful persistent patterns Lumina can leverage across project and client meetings."
          icon="fa-bookmark"
          iconColor="#a78bfa"
        >
          <ChipGroup
            options={MEMORY_CATEGORY_OPTIONS}
            selected={settings.memoryRememberCategories}
            onToggle={(value) => toggleArrayValue('memoryRememberCategories', value)}
          />
        </SettingRow>

        <SettingRow
          title="Never remember"
          description="Sensitive or low-value topics that should never enter long-lived memory."
          icon="fa-ban"
          iconColor="#f97316"
        >
          <ChipGroup
            options={['compensation', 'legal details', 'off-record comments', 'personal anecdotes', 'health data']}
            selected={settings.memoryNeverRememberCategories}
            onToggle={(value) => toggleArrayValue('memoryNeverRememberCategories', value)}
          />
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        title="Memory ledger preview"
        description="A reviewable ledger makes AI continuity feel safe instead of hidden."
        badge={<ScopeBadge label="Preview" tone="policy" />}
      >
        <div className="space-y-3">
          {settings.memoryItems.map((memory) => (
            <div
              key={memory.id}
              className="rounded-2xl border px-4 py-4"
              style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)' }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {memory.title}
                    </h4>
                    <ScopeBadge label={memory.scope} tone="workspace" />
                  </div>
                  <p className="mt-1 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                    Learned from {memory.sourceLabel}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-tertiary)' }}>
                    Expires in
                  </p>
                  <p className="mt-1 text-sm font-bold" style={{ color: memory.confidence === 'high' ? '#34d399' : '#fbbf24' }}>
                    {memory.expiresIn}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>
    </div>
  );
};

export default MemorySettingsPage;
