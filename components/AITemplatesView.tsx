import React, { useState, useEffect } from 'react';
import { AITemplate, DEFAULT_TEMPLATE_CATEGORIES } from '../types';
import apiService from '../utils/apiService';
import ContrastSwitch from './common/ContrastSwitch';

interface AITemplatesViewProps {
  onApplyTemplate?: (template: AITemplate) => void;
}

const SYSTEM_TEMPLATES: Omit<AITemplate, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Sales Call Summary',
    description: 'Optimized for sales calls with lead qualification, objections, and next steps',
    category: 'sales',
    promptTemplate: `Summarize this sales call with the following structure:
## Lead Information
- Company, role, and contact info mentioned
## Pain Points & Needs
- Key problems the prospect described
## Objections Raised
- Any concerns, pushback, or objections
## Product Fit
- Which features/solutions were discussed that align with their needs
## Competitive Mentions
- Any competitor products or alternatives mentioned
## Next Steps
- Agreed follow-ups, demos, or actions
## Deal Assessment
- Overall interest level and likelihood to close`,
    outputFormat: 'markdown',
    isShared: false,
    isSystem: true,
    usageCount: 0,
  },
  {
    name: 'Daily Standup',
    description: 'Quick standup format: what was done, what\'s planned, blockers',
    category: 'standup',
    promptTemplate: `Summarize this standup meeting for each participant:
## Per Person
For each speaker, extract:
- **Yesterday**: What they completed
- **Today**: What they plan to work on
- **Blockers**: Any impediments or dependencies mentioned
## Team Summary
- Overall progress highlights
- Shared blockers or cross-team dependencies
- Any decisions made`,
    outputFormat: 'bullet_points',
    isShared: false,
    isSystem: true,
    usageCount: 0,
  },
  {
    name: '1:1 Meeting Notes',
    description: 'Manager-report 1:1 format with feedback, goals, and action items',
    category: '1on1',
    promptTemplate: `Summarize this 1:1 meeting:
## Topics Discussed
- Main themes and subjects covered
## Feedback Given
- Any positive or constructive feedback exchanged
## Career & Growth
- Career development, goals, or aspirations discussed
## Concerns & Challenges
- Issues raised by either party
## Action Items
- Specific commitments with owners
## Mood & Engagement
- Overall tone and engagement level of the conversation`,
    outputFormat: 'markdown',
    isShared: false,
    isSystem: true,
    usageCount: 0,
  },
  {
    name: 'Interview Debrief',
    description: 'Structured interview evaluation with competency assessment',
    category: 'interview',
    promptTemplate: `Summarize this interview:
## Candidate Overview
- Position applied for, background summary
## Technical Assessment
- Technical skills demonstrated, depth of knowledge
## Behavioral Indicators
- Communication style, problem-solving approach, cultural fit signals
## Strengths
- Top 3-5 strengths observed
## Areas of Concern
- Any red flags or gaps identified
## Key Quotes
- Notable or memorable statements from the candidate
## Hiring Recommendation
- Overall assessment and recommended next steps`,
    outputFormat: 'structured',
    isShared: false,
    isSystem: true,
    usageCount: 0,
  },
  {
    name: 'Legal Meeting Notes',
    description: 'Legal-focused summary with compliance and action tracking',
    category: 'legal',
    promptTemplate: `Summarize this legal meeting:
## Matter / Case Reference
- Case name, matter number, or subject
## Parties Involved
- All parties and their roles
## Key Legal Points
- Legal arguments, interpretations, or positions discussed
## Risks Identified
- Legal risks, compliance concerns, or exposure
## Deadlines & Filing Dates
- Any time-sensitive dates or filing requirements
## Decisions Made
- Resolutions or directions agreed upon
## Privileged Notes
- Items marked as attorney-client privileged
## Next Steps
- Required actions with responsible parties`,
    outputFormat: 'structured',
    isShared: false,
    isSystem: true,
    usageCount: 0,
  },
  {
    name: 'Medical Consultation',
    description: 'Healthcare/medical meeting format with patient-safe structure',
    category: 'medical',
    promptTemplate: `Summarize this medical meeting/consultation:
## Meeting Type
- Consultation, case review, team meeting, etc.
## Key Discussion Points
- Primary medical topics or cases discussed
## Clinical Decisions
- Treatment decisions, diagnostic plans, or protocol changes
## Follow-up Required
- Tests, referrals, or appointments needed
## Team Assignments
- Who is responsible for what
## Important Notes
- Critical observations or warnings
## Timeline
- Key dates and milestones`,
    outputFormat: 'structured',
    isShared: false,
    isSystem: true,
    usageCount: 0,
  },
  {
    name: 'Lecture / Class Notes',
    description: 'Educational format with key concepts, examples, and study notes',
    category: 'education',
    promptTemplate: `Summarize this lecture/class session:
## Topic & Subject
- Main topic and subject area
## Key Concepts
- Core concepts and theories covered (with brief explanations)
## Important Details
- Definitions, formulas, dates, or facts to remember
## Examples Given
- Examples or case studies used to illustrate concepts
## Questions Raised
- Questions asked by students and answers provided
## Reading & Assignments
- Any homework, reading, or assignments mentioned
## Study Notes
- Most important takeaways for exam/review preparation`,
    outputFormat: 'markdown',
    isShared: false,
    isSystem: true,
    usageCount: 0,
  },
];

const AITemplatesView: React.FC<AITemplatesViewProps> = ({ onApplyTemplate }) => {
  const [templates, setTemplates] = useState<AITemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AITemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<AITemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<string>('custom');
  const [formPrompt, setFormPrompt] = useState('');
  const [formOutputFormat, setFormOutputFormat] = useState<string>('markdown');
  const [formIsShared, setFormIsShared] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const result = await apiService.getAITemplates();
      if (result.templates) {
        setTemplates(result.templates.map(mapTemplate));
      } else {
        // Initialize with system templates from localStorage
        const saved = localStorage.getItem('lumina_ai_templates');
        if (saved) {
          setTemplates(JSON.parse(saved));
        } else {
          const systemTemplates: AITemplate[] = SYSTEM_TEMPLATES.map((t, i) => ({
            ...t,
            id: `system-${i}`,
            userId: undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));
          setTemplates(systemTemplates);
          localStorage.setItem('lumina_ai_templates', JSON.stringify(systemTemplates));
        }
      }
    } catch {
      const saved = localStorage.getItem('lumina_ai_templates');
      if (saved) {
        setTemplates(JSON.parse(saved));
      } else {
        const systemTemplates: AITemplate[] = SYSTEM_TEMPLATES.map((t, i) => ({
          ...t,
          id: `system-${i}`,
          userId: undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
        setTemplates(systemTemplates);
        localStorage.setItem('lumina_ai_templates', JSON.stringify(systemTemplates));
      }
    }
  };

  const mapTemplate = (t: any): AITemplate => ({
    id: t.id,
    userId: t.user_id,
    name: t.name,
    description: t.description,
    category: t.category || 'custom',
    promptTemplate: t.prompt_template,
    outputFormat: t.output_format || 'markdown',
    isShared: t.is_shared || false,
    isSystem: t.is_system || false,
    usageCount: t.usage_count || 0,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  });

  const saveTemplates = (updated: AITemplate[]) => {
    setTemplates(updated);
    localStorage.setItem('lumina_ai_templates', JSON.stringify(updated));
  };

  const handleCreateTemplate = async () => {
    if (!formName.trim() || !formPrompt.trim()) return;

    const newTemplate: AITemplate = {
      id: `template-${Date.now()}`,
      name: formName,
      description: formDescription,
      category: formCategory as AITemplate['category'],
      promptTemplate: formPrompt,
      outputFormat: formOutputFormat as AITemplate['outputFormat'],
      isShared: formIsShared,
      isSystem: false,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const result = await apiService.createAITemplate(newTemplate);
      if (result.template) newTemplate.id = result.template.id;
    } catch {
      // Keep local ID
    }

    saveTemplates([...templates, newTemplate]);
    resetForm();
    setShowCreateModal(false);
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate || !formName.trim() || !formPrompt.trim()) return;

    const updated: AITemplate = {
      ...editingTemplate,
      name: formName,
      description: formDescription,
      category: formCategory as AITemplate['category'],
      promptTemplate: formPrompt,
      outputFormat: formOutputFormat as AITemplate['outputFormat'],
      isShared: formIsShared,
      updatedAt: new Date().toISOString(),
    };

    try {
      await apiService.updateAITemplate(updated.id, updated);
    } catch {
      // Continue with local update
    }

    saveTemplates(templates.map(t => t.id === updated.id ? updated : t));
    resetForm();
    setEditingTemplate(null);
    setShowCreateModal(false);
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await apiService.deleteAITemplate(id);
    } catch {
      // Continue with local
    }
    saveTemplates(templates.filter(t => t.id !== id));
    if (selectedTemplate?.id === id) setSelectedTemplate(null);
  };

  const handleShareTemplate = async (template: AITemplate) => {
    const updated = { ...template, isShared: !template.isShared, updatedAt: new Date().toISOString() };
    try {
      await apiService.updateAITemplate(updated.id, updated);
    } catch {
      // Continue
    }
    saveTemplates(templates.map(t => t.id === updated.id ? updated : t));
  };

  const handleUseTemplate = (template: AITemplate) => {
    const updated = { ...template, usageCount: template.usageCount + 1 };
    saveTemplates(templates.map(t => t.id === template.id ? updated : t));
    onApplyTemplate?.(template);
  };

  const openEditModal = (template: AITemplate) => {
    setFormName(template.name);
    setFormDescription(template.description || '');
    setFormCategory(template.category);
    setFormPrompt(template.promptTemplate);
    setFormOutputFormat(template.outputFormat);
    setFormIsShared(template.isShared);
    setEditingTemplate(template);
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormCategory('custom');
    setFormPrompt('');
    setFormOutputFormat('markdown');
    setFormIsShared(false);
  };

  const filteredTemplates = templates.filter(t => {
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
    }
    return true;
  });

  const getCategoryMeta = (cat: string) => {
    const found = DEFAULT_TEMPLATE_CATEGORIES.find(c => c.value === cat);
    return found || { label: cat, icon: 'fa-file', color: 'gray' };
  };

  const colorClasses: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    amber: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
    teal: 'bg-teal-100 text-teal-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    gray: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center">
              <i className="fas fa-wand-magic-sparkles text-white"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI Templates</h1>
              <p className="text-xs text-gray-500">Custom prompt templates for meeting summaries</p>
            </div>
          </div>

          <button
            onClick={() => { resetForm(); setEditingTemplate(null); setShowCreateModal(true); }}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
          >
            <i className="fas fa-plus text-xs"></i>
            Create Template
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${selectedCategory === 'all' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
            >
              All
            </button>
            {DEFAULT_TEMPLATE_CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${selectedCategory === cat.value ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
          <i className="fas fa-exclamation-circle"></i>
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <i className="fas fa-xmark"></i>
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {selectedTemplate ? (
          /* Template Detail */
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => setSelectedTemplate(null)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
            >
              <i className="fas fa-arrow-left text-xs"></i>
              Back to templates
            </button>

            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorClasses[getCategoryMeta(selectedTemplate.category).color]}`}>
                    <i className={`fas ${getCategoryMeta(selectedTemplate.category).icon} text-lg`}></i>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{selectedTemplate.name}</h2>
                    <p className="text-xs text-gray-500">
                      {getCategoryMeta(selectedTemplate.category).label} · Used {selectedTemplate.usageCount} times
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedTemplate.isShared && (
                    <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">SHARED</span>
                  )}
                  {selectedTemplate.isSystem && (
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">BUILT-IN</span>
                  )}
                </div>
              </div>

              {selectedTemplate.description && (
                <p className="text-sm text-gray-600 mb-4">{selectedTemplate.description}</p>
              )}

              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Prompt Template</h3>
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">{selectedTemplate.promptTemplate}</pre>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleUseTemplate(selectedTemplate)}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  <i className="fas fa-play mr-2"></i>
                  Use Template
                </button>
                {!selectedTemplate.isSystem && (
                  <>
                    <button
                      onClick={() => openEditModal(selectedTemplate)}
                      className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
                    >
                      <i className="fas fa-pen mr-2"></i>Edit
                    </button>
                    <button
                      onClick={() => handleShareTemplate(selectedTemplate)}
                      className="px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-sm font-medium transition-colors"
                    >
                      <i className={`fas ${selectedTemplate.isShared ? 'fa-lock' : 'fa-share-nodes'} mr-2`}></i>
                      {selectedTemplate.isShared ? 'Make Private' : 'Share with Team'}
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                      className="px-4 py-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl text-sm transition-colors"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Templates Grid */
          <div>
            {filteredTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center mt-20 text-center">
                <div className="w-20 h-20 bg-violet-50 rounded-2xl flex items-center justify-center mb-4">
                  <i className="fas fa-wand-magic-sparkles text-3xl text-violet-400"></i>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">No Templates Found</h3>
                <p className="text-sm text-gray-500">
                  {searchQuery ? 'Try a different search term' : 'Create your first custom template'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredTemplates.map(template => {
                  const catMeta = getCategoryMeta(template.category);
                  return (
                    <div
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className="bg-white rounded-2xl border border-gray-200 p-5 cursor-pointer hover:shadow-md hover:border-violet-200 transition-all group"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClasses[catMeta.color]}`}>
                          <i className={`fas ${catMeta.icon} text-sm`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-gray-900 truncate">{template.name}</h3>
                          <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                            {catMeta.label}
                            {template.isSystem && <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1 rounded">BUILT-IN</span>}
                            {template.isShared && <span className="text-[9px] font-bold text-purple-500 bg-purple-50 px-1 rounded">SHARED</span>}
                          </p>
                        </div>
                      </div>

                      {template.description && (
                        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{template.description}</p>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-400">
                          Used {template.usageCount} times
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUseTemplate(template); }}
                            className="w-7 h-7 bg-brand-50 hover:bg-brand-100 text-brand-600 rounded-lg flex items-center justify-center transition-colors"
                            title="Use template"
                          >
                            <i className="fas fa-play text-[10px]"></i>
                          </button>
                          {!template.isSystem && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(template.id); }}
                              className="w-7 h-7 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg flex items-center justify-center transition-colors"
                              title="Delete"
                            >
                              <i className="fas fa-trash text-[10px]"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingTemplate ? 'Edit Template' : 'Create Template'}
                </h2>
                <button
                  onClick={() => { setShowCreateModal(false); setEditingTemplate(null); resetForm(); }}
                  className="w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg flex items-center justify-center transition-colors"
                >
                  <i className="fas fa-xmark"></i>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. 'Sprint Retro Summary'"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description of what this template does"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_TEMPLATE_CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => setFormCategory(cat.value)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${formCategory === cat.value
                        ? 'bg-brand-50 border-brand-200 text-brand-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                      <i className={`fas ${cat.icon} mr-1.5`}></i>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt Template */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prompt Template *</label>
                <textarea
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  placeholder={`Write your summary prompt template here...\n\nExample:\n## Key Discussion Points\n- Main topics discussed\n## Decisions Made\n- Agreed outcomes\n## Action Items\n- Tasks with assignees`}
                  rows={10}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>

              {/* Output Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Output Format</label>
                <div className="flex items-center gap-2">
                  {['markdown', 'bullet_points', 'structured'].map(fmt => (
                    <button
                      key={fmt}
                      onClick={() => setFormOutputFormat(fmt)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${formOutputFormat === fmt
                        ? 'bg-brand-50 border-brand-200 text-brand-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                      {fmt === 'markdown' ? 'Markdown' : fmt === 'bullet_points' ? 'Bullet Points' : 'Structured'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Share Toggle */}
              <label className="flex items-center gap-3 p-3 bg-purple-50/50 border border-purple-100 rounded-xl cursor-pointer">
                <ContrastSwitch checked={formIsShared} onChange={setFormIsShared} size="sm" />
                <div>
                  <span className="text-sm font-medium text-gray-700">Share with team</span>
                  <p className="text-[11px] text-gray-500">Allow team members to use this template</p>
                </div>
              </label>
            </div>

            <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => { setShowCreateModal(false); setEditingTemplate(null); resetForm(); }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
                disabled={!formName.trim() || !formPrompt.trim()}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AITemplatesView;
