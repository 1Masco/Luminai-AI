
import React, { useState, useEffect } from 'react';
import { Meeting } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../utils/supabaseClient';
import apiService from '../utils/apiService';
import { exportSummaryAsPDF, exportTranscriptAsPDF, exportFullReportAsPDF } from '../utils/pdfExport';
import config from '../utils/config';

interface MeetingDetailProps {
  meeting: Meeting;
  onBack: () => void;
  onUpdateMeeting: (meeting: Meeting) => void;
}

const MeetingDetail: React.FC<MeetingDetailProps> = ({ meeting, onBack, onUpdateMeeting }) => {
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'chat'>('transcript');
  const [summary, setSummary] = useState<string>(meeting.summary || "");
  const [actionItems, setActionItems] = useState<string[]>(meeting.actionItems || []);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState<'view' | 'comment'>('view');
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState('');
  const [showPDFMenu, setShowPDFMenu] = useState(false);

  useEffect(() => {
    setSummary(meeting.summary || "");
    setActionItems(meeting.actionItems || []);
    setHasUnsavedChanges(false);
  }, [meeting.id]);

  useEffect(() => {
    if (!meeting.summary && meeting.transcript.length > 0) {
      generateSummary();
    }
  }, [meeting.id]);

  const generateSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const fullTranscript = meeting.transcript.map(p => `${p.speaker}: ${p.text}`).join('\n');

      // Use backend API proxy
      const response = await fetch(`${config.apiUrl}/api/ai/generate-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript: fullTranscript })
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const result = await response.json();
      setSummary(result.summary);
      setActionItems(result.actionItems || []);
      onUpdateMeeting({
        ...meeting,
        summary: result.summary,
        actionItems: result.actionItems,
        sentiment: result.sentiment
      });
    } catch (err) {
      console.error("Summary error:", err);
      setSummary("Failed to generate summary. Please try again later.");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleSaveChanges = () => {
    onUpdateMeeting({
      ...meeting,
      summary: summary,
      actionItems: actionItems,
    });
    setHasUnsavedChanges(false);
  };

  const handleShare = async () => {
    if (!isSupabaseConfigured()) {
      // Fallback: copy link to clipboard
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 3000);
      return;
    }
    setShowShareDialog(true);
    setShareEmail('');
    setShareSuccess('');
  };

  const handleShareSubmit = async () => {
    if (!shareEmail.trim()) return;

    setIsSharing(true);
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert('Please sign in to share meetings.');
        return;
      }

      const result = await apiService.shareMeeting(
        session.access_token,
        meeting.id,
        shareEmail.trim(),
        sharePermission
      );

      setShareSuccess(result.message || `Shared with ${shareEmail}`);
      setShareEmail('');
      setTimeout(() => {
        setShowShareDialog(false);
        setShareSuccess('');
      }, 2000);
    } catch (err: any) {
      alert(err.message || 'Failed to share meeting');
    } finally {
      setIsSharing(false);
    }
  };

  const updateActionItem = (index: number, text: string) => {
    const newItems = [...actionItems];
    newItems[index] = text;
    setActionItems(newItems);
    setHasUnsavedChanges(true);
  };

  const addActionItem = () => {
    setActionItems([...actionItems, ""]);
    setHasUnsavedChanges(true);
  };

  const removeActionItem = (index: number) => {
    setActionItems(actionItems.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  const handleDownloadPDF = () => {
    // Keep original for backward compatibility
    exportFullReportAsPDF(meeting);
  };

  const handleExportSummary = () => {
    exportSummaryAsPDF(meeting);
    setShowPDFMenu(false);
  };

  const handleExportTranscript = () => {
    exportTranscriptAsPDF(meeting);
    setShowPDFMenu(false);
  };

  const handleExportFullReport = () => {
    exportFullReportAsPDF(meeting);
    setShowPDFMenu(false);
  };

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isAsking) return;

    const userMsg = chatInput;
    setChatInput("");
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsAsking(true);

    try {
      const fullTranscript = meeting.transcript.map(p => `${p.speaker}: ${p.text}`).join('\n');

      // Use backend API proxy
      const response = await fetch(`${config.apiUrl}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript: fullTranscript, question: userMsg })
      });


      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Chat request failed with status ${response.status}`);
      }

      const result = await response.json();
      setChatHistory(prev => [...prev, { role: 'ai', text: result.answer || "I'm sorry, I couldn't process that." }]);
    } catch (err: any) {
      console.error('AI Chat Error:', err);
      const errorMessage = err.message || "Error connecting to AI. Please try again.";
      setChatHistory(prev => [...prev, { role: 'ai', text: `Error: ${errorMessage}` }]);
    } finally {
      setIsAsking(false);
    }
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col bg-white relative">
      {showShareToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 glass-dark text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-slide-down w-[90%] md:w-auto border border-white/10">
          <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
            <i className="fas fa-check text-[10px]"></i>
          </div>
          <span className="text-sm font-semibold">Share link copied!</span>
        </div>
      )}

      {/* Share Dialog */}
      {showShareDialog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowShareDialog(false)}>
          <div className="glass bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 border border-white/50 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <i className="fas fa-share-nodes text-blue-500"></i>
                Share Meeting
              </h3>
              <button onClick={() => setShowShareDialog(false)} className="text-gray-400 hover:text-gray-600">
                <i className="fas fa-xmark"></i>
              </button>
            </div>

            {shareSuccess ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-check text-xl"></i>
                </div>
                <p className="text-sm font-bold text-gray-900">{shareSuccess}</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-2">Recipient Email</label>
                    <input
                      type="email"
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                      placeholder="colleague@company.com"
                      className="w-full bg-gray-50/80 border border-gray-200/60 rounded-xl py-3 px-4 text-sm focus:bg-white focus:border-brand-300 transition-all"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-2">Permission</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSharePermission('view')}
                        className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold border-2 transition-all ${sharePermission === 'view'
                          ? 'border-brand-400 bg-brand-50 text-brand-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                      >
                        <i className="fas fa-eye mr-2"></i>View Only
                      </button>
                      <button
                        onClick={() => setSharePermission('comment')}
                        className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold border-2 transition-all ${sharePermission === 'comment'
                          ? 'border-brand-400 bg-brand-50 text-brand-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                      >
                        <i className="fas fa-comment mr-2"></i>Comment
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setShowShareDialog(false)}
                    className="flex-1 py-2.5 px-4 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleShareSubmit}
                    disabled={!shareEmail.trim() || isSharing}
                    className="flex-1 py-2.5 px-4 bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-xl text-sm font-bold hover:from-brand-700 hover:to-brand-600 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 transition-all"
                  >
                    {isSharing ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Sharing...</>
                    ) : (
                      <><i className="fas fa-paper-plane"></i> Share</>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-4 md:px-6 py-4 border-b border-gray-100/80 bg-gradient-to-r from-gray-50/80 to-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="w-9 h-9 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-700 transition-all flex items-center justify-center shrink-0">
            <i className="fas fa-arrow-left text-sm"></i>
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base md:text-lg font-extrabold text-gray-900 truncate tracking-tight">{meeting.title}</h1>
              {hasUnsavedChanges && (
                <span className="hidden md:inline-block text-[9px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">Unsaved</span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">
              {new Date(meeting.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · {formatTime(meeting.duration)}
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center shrink-0">
          <div className="relative">
            <button
              onClick={() => setShowPDFMenu(!showPDFMenu)}
              className="h-9 px-3 md:px-4 text-xs md:text-sm font-semibold border border-gray-200/80 rounded-xl hover:bg-gray-50 text-gray-600 flex items-center gap-2 transition-all"
            >
              <i className="fas fa-file-pdf text-red-400"></i>
              <span className="hidden md:inline">Export</span>
              <i className={`fas fa-chevron-down text-[10px] text-gray-400 transition-transform ${showPDFMenu ? 'rotate-180' : ''}`}></i>
            </button>

            {showPDFMenu && (
              <div className="absolute right-0 mt-2 w-56 glass rounded-2xl border border-white/40 shadow-xl z-40 overflow-hidden animate-slide-down">
                <button
                  onClick={handleExportSummary}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50/80 border-b border-gray-100/50 text-sm text-gray-700 flex items-center gap-3 transition-colors"
                >
                  <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                    <i className="fas fa-file-lines text-blue-500 text-xs"></i>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-xs">Summary Only</p>
                    <p className="text-[10px] text-gray-400">Summary + action items</p>
                  </div>
                </button>
                <button
                  onClick={handleExportTranscript}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50/80 border-b border-gray-100/50 text-sm text-gray-700 flex items-center gap-3 transition-colors"
                >
                  <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center">
                    <i className="fas fa-quote-left text-emerald-500 text-xs"></i>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-xs">Transcript Only</p>
                    <p className="text-[10px] text-gray-400">Full meeting transcript</p>
                  </div>
                </button>
                <button
                  onClick={handleExportFullReport}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50/80 text-sm text-gray-700 flex items-center gap-3 transition-colors"
                >
                  <div className="w-7 h-7 bg-purple-50 rounded-lg flex items-center justify-center">
                    <i className="fas fa-book text-purple-500 text-xs"></i>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-xs">Full Report</p>
                    <p className="text-[10px] text-gray-400">Summary + transcript</p>
                  </div>
                </button>
              </div>
            )}
          </div>

          {hasUnsavedChanges && (
            <button
              onClick={handleSaveChanges}
              className="h-9 px-3 md:px-4 text-xs md:text-sm font-bold bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-md shadow-emerald-500/20"
            >
              <i className="fas fa-check text-xs"></i>
              <span className="hidden md:inline">Save</span>
            </button>
          )}
          <button
            onClick={handleShare}
            className="h-9 px-3 md:px-4 text-xs md:text-sm font-semibold border border-gray-200/80 rounded-xl hover:bg-gray-50 text-gray-600 flex items-center gap-2 transition-all"
          >
            <i className="fas fa-share-nodes text-brand-400"></i>
            <span className="hidden md:inline">Share</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Responsive Content Tabs */}
        <div className="flex border-b border-gray-100 px-4 md:hidden shrink-0">
          <TabButton active={activeTab === 'transcript'} onClick={() => setActiveTab('transcript')} label="Transcript" />
          <TabButton active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} label="Summary" />
          <TabButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} label="AI Chat" />
        </div>

        {/* Desktop Sidebars/Main */}
        <div className={`flex-1 flex flex-col overflow-hidden border-r border-gray-100 ${activeTab === 'chat' ? 'hidden md:flex' : 'flex'}`}>
          <div className="hidden md:flex border-b border-gray-100 px-6 shrink-0">
            <TabButton active={activeTab === 'transcript'} onClick={() => setActiveTab('transcript')} label="Transcript" />
            <TabButton active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} label="AI Summary & Notes" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50/20">
            {activeTab === 'transcript' && (
              <div className="max-w-3xl mx-auto space-y-5 md:space-y-6 pb-10">
                {meeting.transcript.length === 0 ? (
                  <div className="text-center py-20 text-gray-400">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-quote-left text-2xl text-gray-200"></i>
                    </div>
                    <p className="text-sm text-gray-400">No transcript available.</p>
                  </div>
                ) : (
                  meeting.transcript.map((p, idx) => {
                    const colors = ['bg-brand-100 text-brand-700', 'bg-purple-100 text-purple-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700'];
                    const color = colors[p.speaker.charCodeAt(0) % colors.length];
                    return (
                      <div key={p.id} className="flex gap-3 md:gap-4 group animate-fade-in" style={{ animationDelay: `${idx * 30}ms` }}>
                        <div className={`w-9 h-9 md:w-10 md:h-10 ${color} rounded-xl flex items-center justify-center font-bold text-xs shrink-0 uppercase shadow-sm`}>
                          {p.speaker.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-bold text-xs md:text-sm text-gray-900">{p.speaker}</span>
                            <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded-md">{formatTime(p.timestamp)}</span>
                          </div>
                          <p className="text-sm md:text-[15px] text-gray-700 leading-relaxed bg-white p-3 md:p-4 rounded-xl rounded-tl-sm border border-gray-100/80 shadow-sm">{p.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'summary' && (
              <div className="max-w-3xl mx-auto pb-10">
                {isGeneratingSummary ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="relative mb-6">
                      <div className="w-14 h-14 border-4 border-brand-100 border-t-brand-500 rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <i className="fas fa-sparkles text-brand-400 text-xs"></i>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 font-semibold">AI is analyzing your meeting...</p>
                    <p className="text-xs text-gray-400 mt-1">This usually takes a few seconds</p>
                  </div>
                ) : (
                  <div className="space-y-4 md:space-y-5">
                    <div className="bg-white p-5 md:p-8 rounded-2xl md:rounded-3xl border border-gray-100/80 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-brand-50 rounded-lg flex items-center justify-center">
                            <i className="fas fa-sparkles text-brand-500 text-xs"></i>
                          </div>
                          <span className="text-xs font-bold uppercase tracking-[0.15em] text-brand-600">AI Executive Summary</span>
                        </div>
                        <button onClick={generateSummary} disabled={isGeneratingSummary} className="text-[10px] text-gray-400 hover:text-brand-500 font-bold uppercase tracking-wider transition-colors flex items-center gap-1">
                          <i className="fas fa-rotate text-[9px]"></i> Regenerate
                        </button>
                      </div>
                      <textarea
                        value={summary}
                        onChange={(e) => { setSummary(e.target.value); setHasUnsavedChanges(true); }}
                        className="w-full text-gray-700 leading-relaxed text-sm md:text-base min-h-[150px] resize-none focus:outline-none placeholder:text-gray-300"
                        placeholder="Meeting summary will appear here..."
                        style={{ boxShadow: 'none' }}
                      />
                    </div>

                    <div className="bg-white p-5 md:p-8 rounded-2xl md:rounded-3xl border border-gray-100/80 shadow-sm">
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center">
                            <i className="fas fa-list-check text-emerald-500 text-xs"></i>
                          </div>
                          <h3 className="font-bold text-sm text-gray-900">Action Items</h3>
                          {actionItems.length > 0 && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{actionItems.length}</span>}
                        </div>
                        <button
                          onClick={addActionItem}
                          className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors"
                        >
                          <i className="fas fa-plus text-[10px]"></i>
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        {actionItems.length === 0 ? (
                          <p className="text-xs text-gray-300 italic py-2">No action items yet. Click + to add one.</p>
                        ) : (
                          actionItems.map((item, i) => (
                            <div key={i} className="flex gap-3 group items-start">
                              <div className="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center shrink-0 mt-1.5 shadow-sm">
                                <i className="fas fa-check text-[7px]"></i>
                              </div>
                              <input
                                type="text"
                                value={item}
                                onChange={(e) => updateActionItem(i, e.target.value)}
                                className="flex-1 text-sm text-gray-700 border-b border-transparent focus:border-brand-200 focus:outline-none py-1 transition-colors"
                                style={{ boxShadow: 'none' }}
                              />
                              <button onClick={() => removeActionItem(i)} className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 flex items-center justify-center transition-all mt-1">
                                <i className="fas fa-xmark text-[10px]"></i>
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* AI Chat Side Panel */}
        <div className={`
          flex-col bg-white w-full md:w-80 lg:w-96 border-l border-gray-100 shrink-0
          ${activeTab === 'chat' ? 'flex h-full' : 'hidden md:flex'}
        `}>
          <div className="px-5 py-4 border-b border-gray-100/80 bg-gradient-to-r from-brand-50/60 to-white flex items-center justify-between shrink-0">
            <div>
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center shadow-sm shadow-brand-500/20">
                  <i className="fas fa-robot text-white text-[10px]"></i>
                </div>
                Ask Lumina
              </h3>
              <p className="text-[9px] text-gray-400 uppercase font-bold tracking-widest mt-0.5">Meeting AI Assistant</p>
            </div>
            <button onClick={() => setActiveTab('transcript')} className="md:hidden w-8 h-8 rounded-xl text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-colors">
              <i className="fas fa-xmark text-sm"></i>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatHistory.length === 0 && (
              <div className="text-center py-10">
                <div className="w-12 h-12 bg-gradient-to-br from-brand-50 to-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <i className="fas fa-message text-brand-400"></i>
                </div>
                <p className="text-xs font-semibold text-gray-500 mb-1">Ask about this meeting</p>
                <p className="text-[11px] text-gray-400">"What were the key decisions?"</p>
              </div>
            )}
            {chatHistory.map((chat, i) => (
              <div key={i} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                <div className={`max-w-[88%] px-4 py-2.5 rounded-2xl text-xs md:text-sm leading-relaxed ${chat.role === 'user'
                    ? 'bg-gradient-to-br from-brand-600 to-brand-500 text-white rounded-br-sm shadow-md shadow-brand-500/20'
                    : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
                  }`}>
                  {chat.text}
                </div>
              </div>
            ))}
            {isAsking && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
                  <div className="flex gap-1.5 items-center">
                    <div className="w-1.5 h-1.5 bg-brand-300 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleAskAI} className="p-4 border-t border-gray-100/80 bg-gray-50/30">
            <div className="relative flex items-center">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask something about this meeting..."
                className="w-full bg-white border border-gray-200/80 rounded-xl py-2.5 pl-4 pr-12 text-xs md:text-sm placeholder:text-gray-300 focus:border-brand-300 transition-all"
                style={{ boxShadow: 'none' }}
              />
              <button
                type="submit"
                disabled={isAsking || !chatInput.trim()}
                className="absolute right-1.5 w-8 h-8 bg-gradient-to-br from-brand-600 to-brand-500 text-white rounded-lg flex items-center justify-center disabled:opacity-40 hover:from-brand-700 hover:to-brand-600 transition-all shadow-sm shadow-brand-500/20"
              >
                <i className="fas fa-arrow-up text-[10px]"></i>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div >
  );
};

const TabButton: React.FC<{ active: boolean, onClick: () => void, label: string }> = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    className={`flex-1 md:flex-none px-4 py-4 text-[11px] md:text-xs font-bold border-b-2 transition-all uppercase tracking-wider ${active
      ? 'border-brand-500 text-brand-600'
      : 'border-transparent text-gray-400 hover:text-gray-600'
      }`}
  >
    {label}
  </button>
);

export default MeetingDetail;
