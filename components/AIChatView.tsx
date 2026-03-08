import React, { useState, useEffect, useRef } from 'react';
import { Meeting, AIChatMessage, AIChatConversation } from '../types';
import apiService from '../utils/apiService';

interface AIChatViewProps {
  meetings: Meeting[];
  onViewMeeting: (id: string) => void;
}

const AIChatView: React.FC<AIChatViewProps> = ({ meetings, onViewMeeting }) => {
  const [conversations, setConversations] = useState<AIChatConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<AIChatConversation | null>(null);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMeetingIds, setSelectedMeetingIds] = useState<string[]>([]);
  const [showMeetingSelector, setShowMeetingSelector] = useState(false);
  const [searchScope, setSearchScope] = useState<'all' | 'selected'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    try {
      const result = await apiService.getChatConversations();
      if (result.conversations) {
        setConversations(result.conversations.map(mapConversation));
      }
    } catch (err) {
      console.warn('Could not load conversations:', err);
    }
  };

  const mapConversation = (c: any): AIChatConversation => ({
    id: c.id,
    title: c.title,
    meetingIds: c.meeting_ids || [],
    messages: (c.messages || []).map(mapMessage),
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  });

  const mapMessage = (m: any): AIChatMessage => ({
    id: m.id,
    role: m.role,
    content: m.content,
    meetingReferences: m.meeting_references || [],
    createdAt: m.created_at,
  });

  const handleNewConversation = () => {
    setActiveConversation(null);
    setMessages([]);
    setSelectedMeetingIds([]);
    setSearchScope('all');
    setInputMessage('');
  };

  const handleSelectConversation = async (conv: AIChatConversation) => {
    setActiveConversation(conv);
    setSelectedMeetingIds(conv.meetingIds);
    try {
      const result = await apiService.getChatMessages(conv.id);
      if (result.messages) {
        setMessages(result.messages.map(mapMessage));
      }
    } catch (err) {
      setMessages(conv.messages || []);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: AIChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputMessage.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Build context from meetings
      const contextMeetings = searchScope === 'all' ? meetings : meetings.filter(m => selectedMeetingIds.includes(m.id));

      const meetingContext = contextMeetings.map(m => ({
        id: m.id,
        title: m.title,
        date: m.date,
        summary: m.summary || '',
        transcript: m.transcript.map(t => `${t.speaker}: ${t.text}`).join('\n'),
        actionItems: m.actionItems || [],
      }));

      const result = await apiService.crossMeetingChat(
        inputMessage.trim(),
        meetingContext,
        activeConversation?.id,
        messages.map(m => ({ role: m.role, content: m.content }))
      );

      const assistantMessage: AIChatMessage = {
        id: result.messageId || `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: result.response,
        meetingReferences: result.meetingReferences || [],
        createdAt: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Update or create conversation
      if (result.conversationId) {
        const updatedConv: AIChatConversation = {
          id: result.conversationId,
          title: result.conversationTitle || activeConversation?.title || inputMessage.trim().slice(0, 50),
          meetingIds: searchScope === 'all' ? [] : selectedMeetingIds,
          messages: [...messages, userMessage, assistantMessage],
          createdAt: activeConversation?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setActiveConversation(updatedConv);
        setConversations(prev => {
          const idx = prev.findIndex(c => c.id === updatedConv.id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = updatedConv;
            return updated;
          }
          return [updatedConv, ...prev];
        });
      }
    } catch (err: any) {
      const errorMessage: AIChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${err.message || 'Unknown error'}. Please try again.`,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleMeetingSelection = (meetingId: string) => {
    setSelectedMeetingIds(prev =>
      prev.includes(meetingId) ? prev.filter(id => id !== meetingId) : [...prev, meetingId]
    );
  };

  const suggestedQuestions = [
    "What were the key decisions made this month?",
    "Summarize all action items across recent meetings",
    "What topics keep coming up in our meetings?",
    "Are there any unresolved issues from last week?",
    "What's the overall sentiment trend in recent meetings?",
  ];

  return (
    <div className="h-full flex" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Sidebar - Conversations */}
      <div className="w-72 flex-col hidden lg:flex" style={{ backgroundColor: 'var(--card-bg)', borderRight: '1px solid var(--border-secondary)' }}>
        <div className="p-4" style={{ borderBottom: '1px solid var(--border-primary)' }}>
          <button
            onClick={handleNewConversation}
            className="w-full px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <i className="fas fa-plus text-xs"></i>
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
              No conversations yet
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={`w-full text-left p-3 transition-colors ${activeConversation?.id === conv.id ? 'bg-brand-50 border-l-2 border-l-brand-500' : ''
                  }`}
                style={{ borderBottom: '1px solid var(--border-primary)' }}
              >
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{conv.title}</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  {new Date(conv.updatedAt).toLocaleDateString()}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 shrink-0" style={{ backgroundColor: 'var(--card-bg)', borderBottom: '1px solid var(--border-secondary)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-brand-600 rounded-xl flex items-center justify-center">
                <i className="fas fa-robot text-white text-sm"></i>
              </div>
              <div>
                <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>AI Meeting Assistant</h1>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {searchScope === 'all'
                    ? `Searching across ${meetings.length} meetings`
                    : `${selectedMeetingIds.length} meeting(s) selected`
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Scope Toggle */}
              <div className="flex items-center gap-1 rounded-xl p-1" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <button
                  onClick={() => setSearchScope('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${searchScope === 'all' ? 'shadow-sm text-brand-600' : ''}`}
                  style={searchScope === 'all' ? { backgroundColor: 'var(--card-bg)' } : { color: 'var(--text-secondary)' }}
                >
                  All Meetings
                </button>
                <button
                  onClick={() => {
                    setSearchScope('selected');
                    if (selectedMeetingIds.length === 0) setShowMeetingSelector(true);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${searchScope === 'selected' ? 'shadow-sm text-brand-600' : ''}`}
                  style={searchScope === 'selected' ? { backgroundColor: 'var(--card-bg)' } : { color: 'var(--text-secondary)' }}
                >
                  Selected
                </button>
              </div>

              {searchScope === 'selected' && (
                <button
                  onClick={() => setShowMeetingSelector(!showMeetingSelector)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                >
                  <i className="fas fa-filter mr-1"></i>
                  Filter ({selectedMeetingIds.length})
                </button>
              )}

              <button
                onClick={handleNewConversation}
                className="lg:hidden px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-600 rounded-lg text-xs font-medium transition-colors"
              >
                <i className="fas fa-plus mr-1"></i> New
              </button>
            </div>
          </div>

          {/* Meeting Selector Dropdown */}
          {showMeetingSelector && (
            <div className="mt-3 rounded-xl p-3 max-h-48 overflow-y-auto" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)' }}>
              <div className="space-y-1">
                {meetings.slice(0, 20).map(m => (
                  <label key={m.id} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors" style={{ color: 'var(--text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={selectedMeetingIds.includes(m.id)}
                      onChange={() => toggleMeetingSelection(m.id)}
                      className="w-4 h-4 text-brand-600 rounded"
                      style={{ borderColor: 'var(--border-secondary)' }}
                    />
                    <span className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{m.title}</span>
                    <span className="text-[10px] ml-auto whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>
                      {new Date(m.date).toLocaleDateString()}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            /* Welcome / Suggestions */
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-brand-100 rounded-2xl flex items-center justify-center mb-4">
                <i className="fas fa-comments text-2xl text-brand-500"></i>
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Ask anything about your meetings</h3>
              <p className="text-sm mb-6 max-w-md" style={{ color: 'var(--text-secondary)' }}>
                Get cross-meeting intelligence, trend analysis, and instant answers from your entire meeting history.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInputMessage(q);
                      inputRef.current?.focus();
                    }}
                    className="text-left p-3 rounded-xl text-sm hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700 transition-colors"
                    style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-secondary)', color: 'var(--text-secondary)' }}
                  >
                    <i className="fas fa-lightbulb text-amber-400 mr-2"></i>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-1' : 'order-1'}`}>
                    <div className={`rounded-2xl px-4 py-3 ${msg.role === 'user'
                      ? 'bg-brand-600 text-white'
                      : ''
                      }`}
                      style={msg.role !== 'user' ? { backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-secondary)', color: 'var(--text-primary)' } : {}}>
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                    </div>

                    {/* Meeting References */}
                    {msg.meetingReferences && msg.meetingReferences.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {msg.meetingReferences.map(refId => {
                          const meeting = meetings.find(m => m.id === refId);
                          if (!meeting) return null;
                          return (
                            <button
                              key={refId}
                              onClick={() => onViewMeeting(refId)}
                              className="px-2.5 py-1 bg-brand-50 border border-brand-100 rounded-lg text-[11px] font-medium text-brand-600 hover:bg-brand-100 transition-colors"
                            >
                              <i className="fas fa-link mr-1"></i>
                              {meeting.title}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <p className="text-[10px] mt-1 px-1" style={{ color: 'var(--text-tertiary)' }}>
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-secondary)' }}>
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                      Analyzing your meetings...
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="p-4 shrink-0" style={{ backgroundColor: 'var(--card-bg)', borderTop: '1px solid var(--border-secondary)' }}>
          <div className="flex items-end gap-3 max-w-4xl mx-auto">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your meetings... (Enter to send, Shift+Enter for new line)"
                rows={1}
                className="w-full px-4 py-3 rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-secondary)',
                  color: 'var(--text-primary)',
                  minHeight: '44px',
                  maxHeight: '120px'
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = '44px';
                  target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                }}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="w-11 h-11 bg-brand-600 hover:bg-brand-700 text-white rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <i className="fas fa-paper-plane text-sm"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatView;
