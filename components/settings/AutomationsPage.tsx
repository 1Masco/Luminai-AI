import React from 'react';
import type { AppSettings } from '../../contexts/SettingsContext';
import { AUTOMATION_TEMPLATES } from './settingsConfig';
import { HighlightCard, ScopeBadge, SettingsSection, TextAreaControl, Toggle } from './SettingsPrimitives';

interface AutomationsPageProps {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

const AutomationsPage: React.FC<AutomationsPageProps> = ({ settings, updateSetting }) => {
  const addTemplateRule = (templateId: string) => {
    const template = AUTOMATION_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;

    updateSetting('automationRules', [...settings.automationRules, template.build(settings)]);
  };

  const toggleRule = (ruleId: string) => {
    updateSetting(
      'automationRules',
      settings.automationRules.map((rule) => (rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule))
    );
  };

  return (
    <div className="space-y-5">
      <HighlightCard
        title="Rules turn Lumina into a workflow system"
        description="This is where the platform shifts from passive meeting capture to programmable meeting operations."
        icon="fa-wand-magic-sparkles"
      />

      <SettingsSection
        title="Automation mode"
        description="Enable rule-driven actions and use plain language to seed new flows."
        badge={<ScopeBadge label="Power user" tone="highlight" />}
      >
        <div
          className="flex items-center justify-between rounded-2xl border px-4 py-4"
          style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)' }}
        >
          <div>
            <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Automation engine
            </h4>
            <p className="mt-1 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
              Allow Lumina to run recap, routing, and delivery actions automatically.
            </p>
          </div>
          <Toggle checked={settings.automationEnabled} onChange={(value) => updateSetting('automationEnabled', value)} />
        </div>

        <TextAreaControl
          value={settings.automationDraft}
          placeholder='Example: If meeting title contains "client" and duration exceeds 45 minutes, apply Executive Brief, send recap to me only, and create a decision log.'
          onChange={(value) => updateSetting('automationDraft', value)}
        />
      </SettingsSection>

      <SettingsSection
        title="Starter templates"
        description="Start from intentional automation packs instead of forcing users into a blank rule builder."
        badge={<ScopeBadge label="Quick start" tone="workspace" />}
      >
        <div className="grid gap-3 md:grid-cols-3">
          {AUTOMATION_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => addTemplateRule(template.id)}
              className="rounded-[24px] border p-4 text-left transition-all hover:opacity-90"
              style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)' }}
            >
              <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {template.name}
              </h4>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                {template.description}
              </p>
            </button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Active rules"
        description="Show rules in readable language instead of burying logic in a generic automation table."
        badge={<ScopeBadge label={`${settings.automationRules.length} rules`} tone="policy" />}
      >
        <div className="space-y-3">
          {settings.automationRules.map((rule) => (
            <div
              key={rule.id}
              className="rounded-[24px] border p-4"
              style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)' }}
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {rule.name}
                    </h4>
                    <ScopeBadge label={rule.scope} tone={rule.scope === 'workspace' ? 'workspace' : 'personal'} />
                  </div>
                  <p className="mt-1 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                    {rule.description}
                  </p>
                </div>
                <Toggle checked={rule.enabled} onChange={() => toggleRule(rule.id)} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-tertiary)' }}>
                    When
                  </p>
                  <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {rule.trigger}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-tertiary)' }}>
                    If
                  </p>
                  <div className="mt-2 space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {rule.conditions.map((condition) => (
                      <p key={condition}>{condition}</p>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-tertiary)' }}>
                    Then
                  </p>
                  <div className="mt-2 space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {rule.actions.map((action) => (
                      <p key={action}>{action}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>
    </div>
  );
};

export default AutomationsPage;
