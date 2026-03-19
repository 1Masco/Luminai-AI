# Lumina Settings Control Center

Grounded in the current Lumina implementation:
- Current personal settings live in a single local-only context at [contexts/SettingsContext.tsx](c:/Users/HP/Desktop/Lumina/Luminai-AI/contexts/SettingsContext.tsx).
- The existing Settings page is a compact tab view in [components/SettingsView.tsx](c:/Users/HP/Desktop/Lumina/Luminai-AI/components/SettingsView.tsx).
- Calendar auto-join is partly separated into [components/CalendarSync.tsx](c:/Users/HP/Desktop/Lumina/Luminai-AI/components/CalendarSync.tsx).
- AI templates already exist as a strong foundation in [components/AITemplatesView.tsx](c:/Users/HP/Desktop/Lumina/Luminai-AI/components/AITemplatesView.tsx) and [server/database/add_new_features.sql](c:/Users/HP/Desktop/Lumina/Luminai-AI/server/database/add_new_features.sql).
- Admin controls already exist separately in [components/AdminPanel.tsx](c:/Users/HP/Desktop/Lumina/Luminai-AI/components/AdminPanel.tsx) and [server/services/adminSettings.js](c:/Users/HP/Desktop/Lumina/Luminai-AI/server/services/adminSettings.js).

This brief turns those fragments into one product-defining system: Lumina as the most controllable AI meeting workspace.

## 1. SETTINGS STRATEGY

Lumina Settings should not behave like a utilities drawer. It should behave like a control center for how meetings are captured, how AI thinks, what gets remembered, what gets shared, and what the workspace is allowed to do.

Core product philosophy:
- Control without clutter. Lumina should surface the most common outcomes first, then progressively reveal advanced depth.
- Explainable by default. Every important setting should answer four questions inline: what happens, when it runs, who can see the result, and whether the meeting affects memory.
- Scoped control. Users should always know whether a setting is personal, team-default, or admin-enforced.
- Presets before prompt boxes. Beginners choose from smart presets; power users can tune every dimension.
- Trust as a feature. Privacy settings must feel operational and understandable, not legalistic.

How Lumina should differ from Fireflies and Otter:
- Fireflies is strongest when buyers want admin depth, integrations, governance, and enterprise control. Lumina should match that depth, but make it legible, faster, and much more AI-configurable.
- Otter is strongest when buyers want easy capture, simple workflows, and low-friction summaries. Lumina should preserve that ease, but add real personalization and workflow logic without becoming intimidating.
- Lumina wins by making AI behavior itself configurable, inspectable, and reusable. Competitors mostly let users configure capture and distribution. Lumina should let them configure the intelligence layer.

What makes it feel premium:
- A single searchable settings command bar with instant jump, inline previews, and recent panels.
- Scope chips on every section: `Personal`, `Workspace default`, `Enforced by admin`.
- Live preview cards for recap format, privacy impact, and automation outcomes.
- Fast keyboard-first navigation, sticky section index, and polished empty states.
- Human microcopy that explains impact in plain language.

## 2. INFORMATION ARCHITECTURE

### IA model

Use a three-layer architecture:
- `Basic`: daily-use setup and expected market-match controls.
- `Advanced`: deeper AI, privacy, and workspace behavior.
- `Power User / Labs`: rules, exports, keyboard customization, experimental controls.

### Top-level Settings structure

#### Basic
- `General`
  - Appearance
  - Language and region
  - Startup behavior
  - Accessibility and motion
- `Meeting Capture`
  - Recording defaults
  - Auto-join behavior
  - Calendar sync
  - Transcript and language defaults
- `Recaps and Notifications`
  - Reminder timing
  - Delivery channels
  - Failure alerts
  - Daily and weekly digests
- `Sharing`
  - Default audience
  - Link sharing behavior
  - Collaboration permissions
  - External sharing guardrails
- `Integrations`
  - Calendar providers
  - Video meeting platforms
  - Slack and email
  - Task and CRM destinations

#### Advanced
- `AI Controls`
  - Summary style
  - Tone and verbosity
  - Action item strictness
  - Decision tracking
  - Stakeholder views
  - Output presets
- `Memory and Context`
  - What Lumina remembers
  - Project memory
  - Client memory
  - Memory expiration
  - Review and reset
- `Privacy and Trust`
  - Recording consent
  - Audio and transcript retention
  - Sharing boundaries
  - Sensitive meeting mode
  - Audit and activity visibility
- `Workspace`
  - Personal vs workspace defaults
  - Team presets
  - Roles and permissions
  - Retention policies
  - Allowed integrations

#### Power User / Labs
- `Automations`
  - Rule templates
  - Natural-language rule builder
  - Advanced conditions
  - Rule history
- `Command and Shortcuts`
  - Keyboard mapping
  - Quick actions
  - Command palette preferences
  - Startup target
- `Exports and Data`
  - Export format defaults
  - Structured note schemas
  - API and webhook preferences
  - Personal data export
- `Labs`
  - Experimental AI controls
  - Beta summarizers
  - Reasoning modes
  - Preview features

### Anti-overwhelm approach

- Default sidebar shows only `General`, `Meeting Capture`, `AI Controls`, `Privacy and Trust`, `Automations`.
- Everything else is grouped under expandable section headers.
- Each page starts with presets and recommended defaults before raw toggles.
- Advanced panels are collapsed until a user opts in.

## 3. MARKET-MATCH FEATURES

These are the expected controls Lumina must ship to compete directly.

| Feature name | What it does | Why it matters | Suggested UI control |
| --- | --- | --- | --- |
| Recording defaults | Sets whether Lumina records audio, video metadata, speaker labels, and post-call transcription by default | Users expect capture behavior to be predictable before a meeting starts | Card with toggles and dropdowns |
| Auto-join meeting rules | Controls which meetings Lumina can join automatically based on organizer, calendar, meeting type, and internal/external status | This is core table-stakes for meeting assistants | Segmented control plus rule chips |
| Ask before joining external meetings | Requires confirmation before Lumina joins meetings with outside attendees | Reduces privacy anxiety and accidental capture | Toggle with inline note |
| Calendar sync behavior | Connects Google/Outlook, chooses which calendars Lumina watches, and handles recurring meetings | Calendar integration is expected and directly drives capture volume | Connected account cards plus checkbox list |
| Recording reminders and failure alerts | Notifies before join, when capture fails, or when transcription is delayed | Reliability is a core trust factor | Notification matrix |
| Transcript language defaults | Chooses spoken language, auto-detect mode, speaker diarization, translation output language, and number formatting | Essential for multilingual teams and transcript accuracy | Dropdowns with helper text |
| Sharing permissions | Sets who can access a recap by default, whether links are private by default, and whether teammates can reshare | Teams need safe collaboration defaults | Access matrix and radio group |
| Recap delivery | Sends outputs to email, Slack, DM, or in-app inbox, with audience and timing controls | Users expect summaries to arrive where work already happens | Multi-select destinations with timing dropdown |
| Workspace defaults | Lets admins define team-wide defaults for join behavior, recap audience, and retention | Required for teams and enterprise rollout | Admin policy cards with lock state |
| Retention and deletion | Controls how long audio, transcript, notes, and logs are kept | Expected for privacy and compliance readiness | Retention table with per-data-type dropdowns |
| Integration destinations | Connects task apps, CRM, docs, and chat tools for action items and recaps | Competitors already cover integrations; Lumina cannot be isolated | Integration gallery |
| Export controls | Downloads transcript, summary, structured notes, and raw JSON | Buyers expect portability and downstream use | Export format checklist |

## 4. MARKET-WINNING FEATURES

These create actual differentiation and should be framed as product advantages, not extra complexity.

### 1. AI Contract Cards
- Every meeting shows a compact "AI will do" card before capture: summary style, sharing destination, memory effect, automation rules, and privacy mode.
- This makes settings feel dependable instead of hidden.

### 2. Output Preset Studio
- Users can create reusable output presets that bundle prompt behavior, structure, tone, recipients, and export format.
- Competitors offer templates; Lumina should offer full operational presets.

### 3. Memory Ledger
- A reviewable memory timeline showing what Lumina learned, why it kept it, which meetings reinforced it, and when it expires.
- This turns AI memory from a black box into a controllable system.

### 4. Sensitive Meeting Mode
- One click changes a meeting into zero-memory, minimal-sharing, explicit-consent, auto-delete behavior.
- This gives users a safety valve for legal, HR, finance, and executive conversations.

### 5. Explain This Recap
- For every summary section, users can inspect source snippets, confidence, and the applied output preset.
- This adds accountability and reduces hallucination anxiety.

### 6. Context Router
- Users can define which projects, accounts, or stakeholder memories feed which meetings.
- This prevents irrelevant context bleed and makes memory useful at scale.

### 7. Conditional Automation with Natural Language
- Users can say "When client calls run longer than 45 minutes, send an executive recap to me and create a decision log" and Lumina turns it into a structured rule.
- This feels significantly more powerful than generic workflow toggles.

## 5. AI PERSONALIZATION CONTROLS

Create a dedicated `AI Controls` page with five subareas.

### Output Profile
- `Summary style`: bullets, memo, narrative, timeline, decision log
- `Tone`: neutral, executive, client-friendly, analytical, concise
- `Verbosity`: brief, standard, detailed, exhaustive
- `Default structure`: key points, decisions, risks, action items, objections, quotes

### Extraction Rules
- `Action item strictness`: loose, standard, strict
- `Owner required`: yes or no
- `Deadline required`: yes or no
- `Decision certainty threshold`: tentative, confirmed only, confirmed plus rationale
- `Risk and blocker detection`: off, standard, aggressive

### Focus and Filtering
- `Prioritize`: decisions, customer pain points, deadlines, blockers, commitments, sentiment shifts, feature requests
- `Ignore`: greetings, small talk, repeated status updates, technical digressions, side conversations
- `Speaker weighting`: host-first, executive-first, equal weight, custom

### Stakeholder Output Modes
- `For me`
- `For my manager`
- `For external clients`
- `For team ops`
- `For hiring panel`

### Preset examples

| Preset | Style | Tone | Verbosity | Prioritize | Ignore |
| --- | --- | --- | --- | --- | --- |
| Executive Brief | memo | decisive | brief | decisions, risks, asks | small talk, transcript details |
| Client Recap | bullets | polished | standard | commitments, deadlines, next steps | internal debate |
| Team Standup | bullets | direct | brief | blockers, owners, due dates | context everyone already knows |
| Interview Evaluation | structured | analytical | standard | candidate signals, concerns, evidence | casual rapport |
| Product Decision Memo | memo | analytical | detailed | tradeoffs, rationale, owners, open questions | chit-chat |

## 6. MEMORY AND CONTEXT CONTROLS

This should become a signature Lumina differentiator.

### Memory model

Lumina should separate memory into scopes:
- `Personal memory`: user preferences, recurring asks, personal working style
- `Project memory`: roadmap decisions, terminology, open questions, milestones
- `Client memory`: stakeholder preferences, commitments, account context
- `Workspace memory`: approved shared context for teams

### User-facing controls

- `Remember these categories`
  - decisions
  - action items
  - unresolved questions
  - stakeholder preferences
  - recurring risks
  - glossary and terminology
- `Do not remember`
  - personal anecdotes
  - compensation or legal details
  - off-record comments
  - meetings marked sensitive
- `Memory review mode`
  - auto-save trusted memories
  - review before saving
  - never save automatically
- `Expiration`
  - 7 days, 30 days, 90 days, custom, never
- `Context usage`
  - always apply relevant memory
  - ask before applying project memory
  - use only manually pinned context

### Differentiated UX

- A `Memory Ledger` screen shows each memory item, source meetings, reinforcement count, last used date, and expiry.
- A `Context Router` lets users bind meetings, tags, projects, and domains to the right memory buckets.
- Each meeting should show `Memory impact` before recording and `Memory updated` after recap generation.
- Sensitive meetings can be marked `Does not train memory` at the meeting level even if workspace memory is enabled.

### Reset and deletion

- Delete one memory item
- Delete all memories for a project
- Delete all memories for a client
- Pause memory for 24 hours
- Reset personal memory entirely

## 7. PRIVACY AND TRUST CONTROLS

Lumina should make privacy operational, visible, and calm.

### Core controls

- `Auto-delete recordings after X days`
- `Transcribe but do not store audio`
- `Store transcript only`
- `Ask before joining external meetings`
- `Never auto-share outside organization`
- `Require explicit user confirmation for public links`
- `Cloud processing vs privacy-first processing preference`
- `Sensitive meeting mode`
- `Show audit visibility`
- `Recording consent and attendee notification behavior`

### Privacy design principles

- Use plain-language status badges: `Audio stored`, `Transcript only`, `No memory`, `Internal share only`.
- Show a trust banner at the top of privacy-sensitive panels summarizing current behavior.
- Give every destructive or risky action a preview of impact.
- Put retention by artifact type, not one generic dropdown.

### Recommended settings model

| Control | Default | Why |
| --- | --- | --- |
| Ask before joining external meetings | On | Protects user trust without hurting internal automation |
| Never auto-share outside organization | On | Safe collaboration baseline |
| Transcribe but do not store audio | Available per user or workspace | Clear middle ground between convenience and privacy |
| Sensitive meeting mode | One-click quick action | Makes privacy actionable during real work |
| Audit visibility | On for workspace admins | Builds confidence for enterprise buyers |

## 8. AUTOMATION AND RULES

Automation should feel like programmable operations for meeting intelligence.

### Rule builder structure

Use a clear `When / If / Then / Exceptions` model:
- `When`: meeting scheduled, meeting started, meeting ended, transcript ready, summary generated, action items detected
- `If`: title contains, attendee domain includes, organizer matches, duration exceeds, platform equals, tags contain, output preset equals, meeting is external/internal
- `Then`: auto-record, choose preset, restrict sharing, send recap, generate decision log, create tasks, sync CRM, pin memory, mark sensitive
- `Exceptions`: unless attendee is external, unless title contains private, unless after work hours

### Creation modes

- `Template mode`: common workflows for non-technical users
- `Natural language mode`: "If a meeting includes my manager, send recap only to me"
- `Advanced builder`: nested conditions, AND/OR groups, reusable variables, test mode

### Beginner templates

- Client meeting -> executive recap + CRM note
- Internal standup -> action items to tasks
- Interview panel -> evaluation summary to hiring folder
- Long meeting -> decision log
- External meeting -> ask before share

### Advanced logic

- Support nested groups with readable chips
- Support run order and conflict resolution
- Support dry-run mode with example matches
- Show automation history with last triggered time and result

## 9. TEAM / WORKSPACE / ADMIN CONTROLS

Lumina should scale from individual users to enterprise workspaces without redesigning the product later.

### Governance model

Use a clear precedence stack:
- `Admin policy`
- `Workspace default`
- `Team preset`
- `User default`
- `Meeting override`

If a setting is locked, Lumina should show why and by whom.

### Workspace settings to support

- Personal vs workspace defaults
- Role-based permissions for owners, admins, managers, members, guests
- Admin-enforced policies on join behavior, retention, and external sharing
- Team-level default recap style
- Workspace privacy defaults
- Organization retention policies by artifact type
- Allowed integrations and blocked destinations
- Allowed export formats
- Audit logs for settings changes
- Team-wide preset library

### Future enterprise additions

- SSO and SCIM mapping
- Domain allowlists and external collaboration policies
- BYOK or customer-managed key support
- Regional data residency preferences
- Admin approval flows for risky integrations

## 10. POWER USER FEATURES

Lumina should feel fast and intentional for heavy users.

### Controls

- Keyboard shortcut customization
- Speed mode with reduced animation and denser layout
- Compact mode for transcript-heavy users
- Quick actions pinned to command palette
- Command palette preferences and ranking
- Default startup page
- Advanced search behavior
- Automation hotkeys
- Export formats: PDF, Markdown, JSON, structured notes, CSV action list
- Default copy format for summaries
- "Always open last used panel" behavior

### Why it matters

- Superhuman and Raycast-style products win because they reward repeated use.
- Settings should not just configure behavior; they should increase operating speed.
- These features especially matter for recruiters, sales leaders, founders, customer success, and PMs who live in meetings all day.

## 11. SIGNATURE FEATURES

These are the strongest switch-worthy ideas.

### 1. Context Router
- Route memory and presets by project, client, team, attendee domain, and meeting type.
- Makes Lumina feel like a controllable intelligence system, not just a recorder.

### 2. Sensitive Meeting Mode
- One click applies no memory, transcript-only storage, internal-only sharing, and explicit join confirmation.
- This is an easy-to-understand trust feature with high emotional value.

### 3. Output Preset Studio
- Users build outputs once and reuse them everywhere.
- Presets bundle format, audience, delivery, strictness, and export shape.

### 4. Explain This Recap
- Every decision, action item, and risk can be traced back to transcript evidence and rule logic.
- This is powerful for trust, QA, and enterprise adoption.

### 5. Policy Stack UI
- Users always see whether a setting is personal, inherited, or locked by admin.
- This makes enterprise control transparent instead of frustrating.

## 12. UX RECOMMENDATIONS

### Layout

- Use a two-column desktop layout: sticky navigation left, content right.
- Add a settings search bar at the top with instant filtering and jump-to results.
- Show a compact trust/status strip at the top of the active page.

### Progressive disclosure

- Start with recommended presets and only reveal advanced tuning after intent is clear.
- Put raw AI options under `Customize output` rather than exposing every control immediately.
- Collapse advanced panels by default and remember the user’s last-opened state.

### Smart defaults

- Default to safe privacy and strong usability:
  - internal auto-join only
  - ask before external
  - private links by default
  - recap delivery to self
  - standard summary preset

### Trust-focused microcopy

- Replace vague labels with operational language:
  - "This meeting will not update memory"
  - "Audio deleted after transcription"
  - "Only you receive this recap unless shared"
- Show effect previews instead of passive descriptions.

### Onboarding recommendations

First-run settings wizard should ask only five things:
- How should Lumina join meetings?
- Where should recaps be sent?
- Which summary style fits you best?
- Should Lumina remember cross-meeting context?
- What is your privacy comfort level?

From those answers, Lumina should generate a starter preset pack and hide unnecessary complexity until later.

## 13. IMPLEMENTATION PLAN

### Frontend architecture

Refactor the current monolithic view in [components/SettingsView.tsx](c:/Users/HP/Desktop/Lumina/Luminai-AI/components/SettingsView.tsx) into domain modules.

Suggested React structure:

```tsx
components/settings/
  SettingsLayout.tsx
  SettingsSidebar.tsx
  SettingsSearch.tsx
  SettingsScopeBadge.tsx
  SettingsSection.tsx
  SettingsPresetCard.tsx
  SettingsDiffPill.tsx
  pages/
    GeneralSettingsPage.tsx
    CaptureSettingsPage.tsx
    RecapDeliveryPage.tsx
    SharingSettingsPage.tsx
    AIControlsPage.tsx
    MemorySettingsPage.tsx
    PrivacySettingsPage.tsx
    AutomationRulesPage.tsx
    WorkspaceSettingsPage.tsx
    PowerUserSettingsPage.tsx
  panels/
    SummaryPresetEditor.tsx
    ActionItemRulesPanel.tsx
    MemoryLedgerPanel.tsx
    SensitiveModePanel.tsx
    RetentionMatrix.tsx
    RuleBuilder.tsx
    ShortcutCustomizer.tsx
```

### State model

Replace the current single `AppSettings` object with domain-specific settings plus scope metadata.

```ts
export type SettingsScope = 'user' | 'workspace' | 'policy';

export interface SettingMeta {
  scope: SettingsScope;
  locked?: boolean;
  inheritedFrom?: 'workspace' | 'policy';
  updatedAt?: string;
  updatedBy?: string;
}

export interface CaptureSettings {
  autoJoinMode: 'off' | 'internal_only' | 'all_confirm_external' | 'all';
  recordAudio: boolean;
  storeAudio: boolean;
  transcriptMode: 'auto' | 'manual_language';
  languageCode: string;
  speakerDiarization: boolean;
  consentMode: 'workspace_default' | 'always_notify' | 'manual';
}

export interface AIOutputPreset {
  id: string;
  name: string;
  audience: 'self' | 'exec' | 'client' | 'team' | 'interview_panel';
  style: 'bullets' | 'memo' | 'timeline' | 'decision_log' | 'structured';
  tone: 'neutral' | 'executive' | 'friendly' | 'analytical';
  verbosity: 'brief' | 'standard' | 'detailed';
  prioritize: string[];
  ignore: string[];
  actionItemStrictness: 'loose' | 'standard' | 'strict';
  decisionMode: 'important_only' | 'all_confirmed' | 'include_rationale';
  deliveryTargets: string[];
}

export interface MemorySettings {
  enabled: boolean;
  reviewMode: 'auto' | 'review' | 'manual_only';
  scopes: Array<'personal' | 'project' | 'client' | 'workspace'>;
  remember: string[];
  neverRemember: string[];
  defaultTtlDays: number | null;
  applyMode: 'automatic' | 'confirm_project' | 'manual_only';
}

export interface PrivacySettings {
  askBeforeExternalJoin: boolean;
  neverAutoShareExternal: boolean;
  sensitiveModeDefault: 'off' | 'manual_only' | 'external_only';
  audioRetentionDays: number | null;
  transcriptRetentionDays: number | null;
  storeAudioAfterTranscription: boolean;
  processingMode: 'standard_cloud' | 'privacy_first';
}

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: string;
  conditions: RuleConditionGroup;
  actions: RuleAction[];
  exceptions?: RuleConditionGroup;
  createdAt: string;
}
```

### Backend persistence strategy

Keep the current local-first feel, but move authoritative settings into the backend.

Recommended persistence split:
- `localStorage`
  - theme
  - compact mode
  - reduced motion
  - last opened settings section
  - command palette recents
  - temporary draft state while editing
- `database: user-level`
  - capture defaults
  - recap delivery
  - AI presets
  - memory preferences
  - privacy preferences
  - personal automation rules
  - shortcut customization
- `database: workspace-level`
  - workspace defaults
  - admin policy locks
  - allowed integrations
  - retention policies
  - team presets
  - audit logs

### Suggested schema additions

Add:
- `user_settings` with domain JSONB columns or one versioned JSONB document per domain
- `workspace_settings`
- `workspace_policy_locks`
- `ai_output_presets`
- `automation_rules`
- `settings_audit_log`
- `memory_profiles`
- `memory_items`

Use JSONB for flexibility, but keep TypeScript and Zod validation strict at the API layer.

### API strategy

Build domain endpoints rather than one giant save endpoint.

Suggested endpoints:
- `GET /api/settings/user`
- `PATCH /api/settings/user/:domain`
- `GET /api/settings/workspace`
- `PATCH /api/settings/workspace/:domain`
- `GET /api/settings/policies`
- `GET /api/settings/presets`
- `POST /api/settings/presets`
- `GET /api/settings/rules`
- `POST /api/settings/rules`
- `GET /api/settings/memory`
- `POST /api/settings/memory/reset`

### UI data flow

- Load settings once on app bootstrap alongside profile hydration in [App.tsx](c:/Users/HP/Desktop/Lumina/Luminai-AI/App.tsx).
- Keep a `SettingsStore` context for optimistic UI updates.
- Save by domain with debounced writes.
- Return `meta` for each setting so the UI can render scope and lock state.
- Reuse the existing `apiService` pattern in [utils/apiService.ts](c:/Users/HP/Desktop/Lumina/Luminai-AI/utils/apiService.ts).

### Future-proofing

- Never hardcode only user-level settings again; every new setting should declare its scope.
- Avoid column explosion by grouping by domain.
- Separate `defaults` from `policies` so enterprise buyers can lock only what matters.
- Model presets and rules as first-class entities, not fields inside a giant settings blob.

## 14. PRIORITIZATION ROADMAP

### Phase 1: must ship now

- New settings shell with search, scope badges, and grouped IA
- Market-match capture, auto-join, recap delivery, notifications, transcript, sharing, and retention controls
- AI Controls v1 with preset-based summary style, tone, verbosity, and priorities
- Privacy and Trust page with safe defaults and clear microcopy
- User settings backend persistence
- Workspace defaults v1 for admins

### Phase 2: strong differentiators

- Memory and Context v1
- Output Preset Studio
- Explain This Recap
- Automation Rules v1 with natural-language creation and templates
- Team preset library
- Shortcut customization and command palette preferences

### Phase 3: advanced / premium / enterprise

- Policy stack with fine-grained lock states
- Context Router
- Memory Ledger with approval workflow
- Advanced nested automation logic
- Audit explorer
- Data residency, BYOK, and enterprise-grade integration governance
- Workspace analytics on rule usage and privacy posture

## Bonus

### 1. Sample final Settings sidebar structure

```txt
Settings
  General
  Meeting Capture
  Recaps and Notifications
  Sharing
  Integrations
  AI Controls
  Memory and Context
  Privacy and Trust
  Workspace
  Automations
  Command and Shortcuts
  Exports and Data
  Labs
```

### 2. Example personas and how their settings differ

#### Founder / executive
- Auto-join internal leadership meetings only
- Executive Brief preset by default
- Decision tracking set to strict
- Memory enabled for company and project context
- Sensitive mode default on for board and finance meetings

#### Client success manager
- Auto-join all client meetings with external confirmation
- Client Recap preset sent to self, not client, until reviewed
- Client memory enabled by account
- Action item strictness set to standard with deadline emphasis
- Never auto-share outside organization enabled

#### Hiring lead / recruiter
- Interview Evaluation preset
- Memory disabled for candidate-sensitive meetings
- Sharing limited to hiring panel
- Decision mode set to include evidence snippets
- Export defaults set to structured notes and scorecard format

### 3. Example automation rules

- If meeting title contains `client` and duration exceeds 30 minutes, apply `Client Recap`, send to me only, and create CRM follow-up.
- If attendees include my manager, generate `Executive Brief` and suppress team-wide sharing.
- If action items contain deadlines, create a task list export and append a decision log.

### 4. Example AI output presets

#### Exec Weekly Rollup
- brief memo
- decisions, blockers, asks
- sent to email digest and Slack DM

#### Customer Call Follow-Up
- polished bullet recap
- commitments, owners, due dates
- CRM-safe wording

#### Product Review Decision Memo
- detailed structured memo
- rationale, tradeoffs, open questions
- export to Markdown and JSON

## Competitor reference links

These links were used only to sanity-check market expectations, not to clone product behavior.

- Fireflies auto-join settings: https://guide.fireflies.ai/articles/5074225515-learn-about-fireflies-auto-join-settings
- Fireflies privacy and recap access: https://guide.fireflies.ai/articles/5319481450-how-to-configure-privacy-settings-for-your-meeting-recaps
- Fireflies collaboration, integrations, and storage controls: https://fireflies.ai/help/workspace-settings
- Otter Notetaker settings: https://help.otter.ai/hc/en-us/articles/13675989227543-Manage-your-Otter-Notetaker-settings
- Otter workspace sharing settings: https://help.otter.ai/hc/en-us/articles/26760612845719-Manage-workspace-sharing-settings
