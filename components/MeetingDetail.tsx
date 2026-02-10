
import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Meeting } from '../types';

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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const fullTranscript = meeting.transcript.map(p => `${p.speaker}: ${p.text}`).join('\n');
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Please summarize this meeting transcript and identify the main sentiment. Provide a concise summary and a few bullet points for action items.
        
        Transcript:
        ${fullTranscript}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              actionItems: { type: Type.ARRAY, items: { type: Type.STRING } },
              sentiment: { type: Type.STRING, enum: ['positive', 'neutral', 'negative'] }
            },
            required: ["summary", "actionItems", "sentiment"]
          }
        }
      });
      
      const result = JSON.parse(response.text || "{}");
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

  const handleShare = () => {
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 3000);
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

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isAsking) return;

    const userMsg = chatInput;
    setChatInput("");
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsAsking(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const fullTranscript = meeting.transcript.map(p => `${p.speaker}: ${p.text}`).join('\n');
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Context: You are an assistant analyzing a meeting recording.
        Transcript: ${fullTranscript}
        
        User Question: ${userMsg}`,
        config: {
          systemInstruction: "Be professional, helpful and refer specifically to the details in the transcript provided. If information is missing, say so."
        }
      });

      setChatHistory(prev => [...prev, { role: 'ai', text: response.text || "I'm sorry, I couldn't process that." }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'ai', text: "Error connecting to AI. Please try again." }]);
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
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 w-[90%] md:w-auto">
          <i className="fas fa-link text-green-400"></i>
          <span className="text-sm font-bold">Share link copied!</span>
        </div>
      )}

      {/* Header */}
      <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 shrink-0">
            <i className="fas fa-arrow-left"></i>
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 md:gap-3">
              <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate">{meeting.title}</h1>
              {hasUnsavedChanges && (
                <span className="hidden md:inline-block text-[10px] font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full uppercase">Unsaved</span>
              )}
            </div>
            <p className="text-[10px] md:text-sm text-gray-500 truncate">
              {new Date(meeting.date).toLocaleDateString()} • {formatTime(meeting.duration)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {hasUnsavedChanges && (
            <button 
              onClick={handleSaveChanges}
              className="p-2 md:px-4 md:py-2 text-xs md:text-sm font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <i className="fas fa-check md:mr-2"></i>
              <span className="hidden md:inline">Save</span>
            </button>
          )}
          <button 
            onClick={handleShare}
            className="p-2 md:px-4 md:py-2 text-xs md:text-sm font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
          >
            <i className="fas fa-share-nodes md:mr-2"></i>
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

          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50/30">
            {activeTab === 'transcript' && (
              <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 pb-10">
                {meeting.transcript.length === 0 ? (
                  <div className="text-center py-20 text-gray-400">No transcript available.</div>
                ) : (
                  meeting.transcript.map((p) => (
                    <div key={p.id} className="flex gap-3 md:gap-4 group">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs md:text-sm shrink-0 uppercase">
                        {p.speaker.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs md:text-sm text-gray-900 truncate max-w-[120px]">{p.speaker}</span>
                            <span className="text-[10px] md:text-xs text-gray-400 font-mono">{formatTime(p.timestamp)}</span>
                          </div>
                        </div>
                        <p className="text-sm md:text-base text-gray-700 leading-relaxed">{p.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'summary' && (
              <div className="max-w-3xl mx-auto pb-10">
                {isGeneratingSummary ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-sm text-gray-500 font-medium">Gemini is analyzing...</p>
                  </div>
                ) : (
                  <div className="space-y-4 md:space-y-6">
                    <div className="bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-blue-600">
                          <i className="fas fa-sparkles text-sm"></i>
                          <span className="text-[10px] font-bold uppercase tracking-wider">AI Executive Summary</span>
                        </div>
                      </div>
                      <textarea 
                        value={summary}
                        onChange={(e) => { setSummary(e.target.value); setHasUnsavedChanges(true); }}
                        className="w-full text-gray-700 leading-relaxed text-sm md:text-lg min-h-[150px] resize-none focus:outline-none"
                        placeholder="Meeting summary..."
                      />
                    </div>

                    <div className="bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-sm md:text-base text-gray-900 flex items-center gap-2">
                          <i className="fas fa-list-check text-green-500"></i>
                          Action Items
                        </h3>
                        <button 
                          onClick={addActionItem}
                          className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-100"
                        >
                          <i className="fas fa-plus text-xs"></i>
                        </button>
                      </div>
                      
                      <div className="space-y-2 md:space-y-3">
                        {actionItems.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">No action items identified.</p>
                        ) : (
                          actionItems.map((item, i) => (
                            <div key={i} className="flex gap-2 group">
                              <span className="w-5 h-5 md:w-6 md:h-6 bg-green-50 text-green-600 rounded-full flex items-center justify-center shrink-0 mt-1">
                                <i className="fas fa-check text-[8px] md:text-[10px]"></i>
                              </span>
                              <input 
                                type="text"
                                value={item}
                                onChange={(e) => updateActionItem(i, e.target.value)}
                                className="flex-1 text-xs md:text-sm text-gray-600 border-b border-transparent focus:border-gray-100 focus:outline-none py-1"
                              />
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
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <i className="fas fa-robot text-blue-500"></i>
                Ask Lumina
              </h3>
              <p className="text-[9px] text-gray-400 uppercase font-bold tracking-widest">Meeting Assistant</p>
            </div>
            <button onClick={() => setActiveTab('transcript')} className="md:hidden text-gray-400 p-2">
              <i className="fas fa-xmark"></i>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/20">
            {chatHistory.length === 0 && (
              <div className="text-center py-8">
                <div className="w-10 h-10 bg-blue-50 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-message text-sm"></i>
                </div>
                <p className="text-xs text-gray-500 font-medium">Ask about this meeting!</p>
              </div>
            )}
            {chatHistory.map((chat, i) => (
              <div key={i} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] p-3 rounded-2xl text-xs md:text-sm ${
                  chat.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-white text-gray-800 rounded-bl-none shadow-sm border border-gray-100'
                }`}>
                  {chat.text}
                </div>
              </div>
            ))}
            {isAsking && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-bl-none shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce delay-75"></div>
                    <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce delay-150"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleAskAI} className="p-4 border-t border-gray-100 bg-white">
            <div className="relative">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask something..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-4 pr-10 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button 
                type="submit"
                disabled={isAsking || !chatInput.trim()}
                className="absolute right-1.5 top-1.5 w-7 h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center disabled:opacity-50"
              >
                <i className="fas fa-arrow-up text-xs"></i>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const TabButton: React.FC<{active: boolean, onClick: () => void, label: string}> = ({active, onClick, label}) => (
  <button 
    onClick={onClick}
    className={`flex-1 md:flex-none px-4 py-4 text-[11px] md:text-sm font-bold border-b-2 transition-colors ${
      active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
    }`}
  >
    {label}
  </button>
);

export default MeetingDetail;
