import React, { useState, useEffect } from 'react';
import { Meeting, MeetingPrepBrief, ContextCard } from '../types';
import apiService from '../utils/apiService';

interface MeetingPrepViewProps {
  meetings: Meeting[];
  onViewMeeting: (id: string) => void;
}

const MeetingPrepView: React.FC<MeetingPrepViewProps> = ({ meetings, onViewMeeting }) => {
  const [briefs, setBriefs] = useState<MeetingPrepBrief[]>([]);
  const [selectedBrief, setSelectedBrief] = useState<MeetingPrepBrief | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMeetingTitle, setSelectedMeetingTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showGenerateForm, setShowGenerateForm] = useState(false);

  useEffect(() => {
    loadBriefs();
  }, []);

  const loadBriefs = async () => {
    try {
      const result = await apiService.getMeetingPrepBriefs();
      if (result.briefs) {
        setBriefs(result.briefs.map(mapBrief));
      }
    } catch (err) {
      const saved = localStorage.getItem('lumina_prep_briefs');
      if (saved) setBriefs(JSON.parse(saved));
    }
  };

  const mapBrief = (b: any): MeetingPrepBrief => ({
    id: b.id,
    meetingTitle: b.meeting_title,
    relatedMeetingIds: b.related_meeting_ids || [],
    briefContent: b.brief_content || { lastDiscussed: [], unresolvedActions: [], suggestedAgenda: [], contextCards: [] },
    generatedForDate: b.generated_for_date,
    createdAt: b.created_at,
  });

  // Find recurring meeting titles (ones that appear multiple times)
  const getRecurringMeetings = () => {
    const titleCounts: Record<string, { count: number; meetings: Meeting[] }> = {};
    meetings.forEach(m => {
      // Normalize: remove date-like suffixes
      const normalized = m.title.replace(/\s*[-–]\s*\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?/g, '').trim();
      if (!titleCounts[normalized]) {
        titleCounts[normalized] = { count: 0, meetings: [] };
      }
      titleCounts[normalized].count++;
      titleCounts[normalized].meetings.push(m);
    });

    return Object.entries(titleCounts)
      .filter(([_, v]) => v.count >= 2)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([title, data]) => ({ title, ...data }));
  };

  const recurringMeetings = getRecurringMeetings();

  const handleGenerateBrief = async (meetingTitle?: string) => {
    const title = meetingTitle || selectedMeetingTitle;
    if (!title.trim()) return;

    setIsGenerating(true);
    setError(null);
    setShowGenerateForm(false);

    try {
      // Find related meetings
      const related = meetings.filter(m =>
        m.title.toLowerCase().includes(title.toLowerCase()) ||
        title.toLowerCase().includes(m.title.toLowerCase().replace(/\s*[-–]\s*\d.*$/, ''))
      ).slice(0, 10);

      const meetingData = related.map(m => ({
        id: m.id,
        title: m.title,
        date: m.date,
        summary: m.summary || '',
        actionItems: m.actionItems || [],
        transcript: m.transcript.map(t => `${t.speaker}: ${t.text}`).join('\n'),
      }));

      const result = await apiService.generateMeetingPrep(title, meetingData);

      const newBrief: MeetingPrepBrief = {
        id: result.brief?.id || `brief-${Date.now()}`,
        meetingTitle: title,
        relatedMeetingIds: related.map(m => m.id),
        briefContent: result.briefContent || {
          lastDiscussed: [],
          unresolvedActions: [],
          suggestedAgenda: [],
          contextCards: [],
        },
        generatedForDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      setBriefs(prev => [newBrief, ...prev]);
      setSelectedBrief(newBrief);
      localStorage.setItem('lumina_prep_briefs', JSON.stringify([newBrief, ...briefs]));
    } catch (err: any) {
      setError(err.message || 'Failed to generate prep brief');
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteBrief = async (id: string) => {
    try {
      await apiService.deleteMeetingPrepBrief(id);
    } catch {
      // Continue with local delete
    }
    const updated = briefs.filter(b => b.id !== id);
    setBriefs(updated);
    localStorage.setItem('lumina_prep_briefs', JSON.stringify(updated));
    if (selectedBrief?.id === id) setSelectedBrief(null);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <i className="fas fa-clipboard-list text-white"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Smart Meeting Prep</h1>
              <p className="text-xs text-gray-500">AI-generated briefs from past meetings</p>
            </div>
          </div>

          <button
            onClick={() => setShowGenerateForm(true)}
            disabled={isGenerating}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <i className="fas fa-wand-magic-sparkles text-xs"></i>
            Generate Brief
          </button>
        </div>
      </div>

      {/* Generate Form */}
      {showGenerateForm && (
        <div className="mx-6 mt-4 bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Generate Prep Brief</h3>

          {/* Recurring Meetings */}
          {recurringMeetings.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Recurring meetings detected:</p>
              <div className="flex flex-wrap gap-2">
                {recurringMeetings.map(rm => (
                  <button
                    key={rm.title}
                    onClick={() => handleGenerateBrief(rm.title)}
                    className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-sm hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
                  >
                    <i className="fas fa-repeat text-xs"></i>
                    {rm.title}
                    <span className="text-[10px] text-indigo-400">({rm.count}x)</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={selectedMeetingTitle}
              onChange={(e) => setSelectedMeetingTitle(e.target.value)}
              placeholder="Enter meeting title (e.g. 'Weekly Sprint Review')"
              className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerateBrief()}
            />
            <button
              onClick={() => handleGenerateBrief()}
              disabled={!selectedMeetingTitle.trim() || isGenerating}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              Generate
            </button>
            <button
              onClick={() => setShowGenerateForm(false)}
              className="px-3 py-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <i className="fas fa-xmark"></i>
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {isGenerating && (
        <div className="mx-6 mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center gap-3">
          <i className="fas fa-spinner fa-spin text-indigo-600"></i>
          <div>
            <p className="text-sm font-bold text-indigo-800">Generating prep brief...</p>
            <p className="text-xs text-indigo-600">Analyzing past meetings and action items</p>
          </div>
        </div>
      )}

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
        {selectedBrief ? (
          /* Brief Detail */
          <div className="max-w-3xl mx-auto space-y-5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedBrief(null)}
                className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <i className="fas fa-arrow-left text-sm text-gray-600"></i>
              </button>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900">Prep Brief: {selectedBrief.meetingTitle}</h2>
                <p className="text-xs text-gray-500">
                  Generated {new Date(selectedBrief.createdAt).toLocaleDateString()} · 
                  Based on {selectedBrief.relatedMeetingIds.length} past meeting(s)
                </p>
              </div>
            </div>

            {/* Context Cards */}
            {selectedBrief.briefContent.contextCards.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <i className="fas fa-clock-rotate-left text-indigo-500"></i>
                  Last time you discussed...
                </h3>
                <div className="space-y-3">
                  {selectedBrief.briefContent.contextCards.map((card: ContextCard, i: number) => (
                    <div key={i} className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-indigo-800">{card.topic}</span>
                        <span className="text-[11px] text-indigo-400">{new Date(card.date).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-gray-600">{card.summary}</p>
                      {card.meetingId && (
                        <button
                          onClick={() => onViewMeeting(card.meetingId!)}
                          className="mt-2 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          <i className="fas fa-arrow-right mr-1"></i>View meeting
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unresolved Actions */}
            {selectedBrief.briefContent.unresolvedActions.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <i className="fas fa-triangle-exclamation text-amber-500"></i>
                  Unresolved Action Items
                </h3>
                <ul className="space-y-2">
                  {selectedBrief.briefContent.unresolvedActions.map((action: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <i className="fas fa-circle-exclamation text-amber-400 text-xs mt-1"></i>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggested Agenda */}
            {selectedBrief.briefContent.suggestedAgenda.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <i className="fas fa-list-check text-emerald-500"></i>
                  Suggested Agenda
                </h3>
                <ol className="space-y-2">
                  {selectedBrief.briefContent.suggestedAgenda.map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                      <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-xs font-bold shrink-0">
                        {i + 1}
                      </span>
                      {item}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Last Discussed Summary */}
            {selectedBrief.briefContent.lastDiscussed.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <i className="fas fa-receipt text-blue-500"></i>
                  Key Points from Previous Meetings
                </h3>
                <ul className="space-y-2">
                  {selectedBrief.briefContent.lastDiscussed.map((point: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <i className="fas fa-check text-blue-400 text-xs mt-1"></i>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Related Meetings */}
            {selectedBrief.relatedMeetingIds.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <i className="fas fa-link text-gray-400"></i>
                  Related Meetings
                </h3>
                <div className="space-y-2">
                  {selectedBrief.relatedMeetingIds.map(id => {
                    const m = meetings.find(meeting => meeting.id === id);
                    if (!m) return null;
                    return (
                      <button
                        key={id}
                        onClick={() => onViewMeeting(id)}
                        className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors flex items-center gap-3"
                      >
                        <i className="fas fa-calendar-day text-gray-400 text-sm"></i>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{m.title}</p>
                          <p className="text-[11px] text-gray-400">{new Date(m.date).toLocaleDateString()}</p>
                        </div>
                        <i className="fas fa-chevron-right text-gray-300 text-xs"></i>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Briefs List */
          <div>
            {briefs.length === 0 && !showGenerateForm ? (
              <div className="flex flex-col items-center justify-center h-full text-center mt-20">
                <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
                  <i className="fas fa-clipboard-list text-3xl text-indigo-400"></i>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Smart Meeting Prep</h3>
                <p className="text-sm text-gray-500 max-w-md mb-4">
                  Before a recurring meeting, auto-generate a brief from past meetings. Get context cards, 
                  unresolved action items, and agenda suggestions.
                </p>
                <button
                  onClick={() => setShowGenerateForm(true)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  <i className="fas fa-wand-magic-sparkles mr-2"></i>
                  Generate Your First Brief
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {briefs.map(brief => (
                  <div
                    key={brief.id}
                    onClick={() => setSelectedBrief(brief)}
                    className="bg-white rounded-2xl border border-gray-200 p-5 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <i className="fas fa-clipboard-list text-indigo-600 text-sm"></i>
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-gray-900">{brief.meetingTitle}</h3>
                          <p className="text-[11px] text-gray-400">
                            {new Date(brief.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteBrief(brief.id); }}
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg flex items-center justify-center transition-all"
                      >
                        <i className="fas fa-trash text-xs"></i>
                      </button>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-gray-500">
                      <span>
                        <i className="fas fa-calendar mr-1"></i>
                        {brief.relatedMeetingIds.length} related meetings
                      </span>
                      {brief.briefContent.unresolvedActions.length > 0 && (
                        <span className="text-amber-600">
                          <i className="fas fa-triangle-exclamation mr-1"></i>
                          {brief.briefContent.unresolvedActions.length} unresolved
                        </span>
                      )}
                      {brief.briefContent.suggestedAgenda.length > 0 && (
                        <span className="text-emerald-600">
                          <i className="fas fa-list-check mr-1"></i>
                          {brief.briefContent.suggestedAgenda.length} agenda items
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingPrepView;
