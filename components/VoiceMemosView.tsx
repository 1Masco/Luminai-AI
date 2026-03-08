import React, { useState, useEffect, useRef } from 'react';
import { VoiceMemo, Meeting } from '../types';
import apiService from '../utils/apiService';

interface VoiceMemosViewProps {
  meetings: Meeting[];
  onViewMeeting: (id: string) => void;
}

const CATEGORIES = [
  { value: 'general', label: 'General', icon: 'fa-microphone', color: 'gray' },
  { value: 'standup', label: 'Standup', icon: 'fa-users', color: 'blue' },
  { value: 'idea', label: 'Idea', icon: 'fa-lightbulb', color: 'amber' },
  { value: 'todo', label: 'To-Do', icon: 'fa-check-circle', color: 'emerald' },
] as const;

const VoiceMemosView: React.FC<VoiceMemosViewProps> = ({ meetings, onViewMeeting }) => {
  const [memos, setMemos] = useState<VoiceMemo[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isQuickCapture, setIsQuickCapture] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingMemo, setEditingMemo] = useState<VoiceMemo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    loadMemos();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const loadMemos = async () => {
    try {
      const result = await apiService.getVoiceMemos();
      if (result.memos) {
        setMemos(result.memos.map(mapMemo));
      }
    } catch (err) {
      // Fallback to localStorage
      const saved = localStorage.getItem('lumina_voice_memos');
      if (saved) setMemos(JSON.parse(saved));
    }
  };

  const mapMemo = (m: any): VoiceMemo => ({
    id: m.id,
    title: m.title,
    transcription: m.transcription,
    duration: m.duration,
    category: m.category || 'general',
    linkedMeetingId: m.linked_meeting_id,
    tags: m.tags || [],
    isQuickCapture: m.is_quick_capture || false,
    audioUrl: m.audio_url,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  });

  const saveMemos = (updatedMemos: VoiceMemo[]) => {
    setMemos(updatedMemos);
    localStorage.setItem('lumina_voice_memos', JSON.stringify(updatedMemos));
  };

  const startRecording = async (quickCapture = false) => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'
      });

      audioChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setIsQuickCapture(quickCapture);
      setRecordingDuration(0);

      timerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      setError('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return;

    return new Promise<void>((resolve) => {
      mediaRecorderRef.current!.onstop = async () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }

        setIsRecording(false);
        setIsProcessing(true);

        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

          // Convert to base64 for API
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];

            try {
              // Transcribe
              const transcribeResult = await apiService.transcribeAudio(base64Audio, 'audio/webm', 'voice_memo.webm');
              const transcription = transcribeResult.transcript || transcribeResult.text || '';

              // Auto-categorize via AI
              let category: VoiceMemo['category'] = 'general';
              let title = 'Voice Memo';
              let tags: string[] = [];
              let linkedMeetingId: string | undefined;

              try {
                const categorizeResult = await apiService.categorizeMemo(transcription, meetings.map(m => ({ id: m.id, title: m.title })));
                category = categorizeResult.category || 'general';
                title = categorizeResult.title || 'Voice Memo';
                tags = categorizeResult.tags || [];
                linkedMeetingId = categorizeResult.linkedMeetingId;
              } catch {
                // Use defaults
                title = transcription.split('.')[0]?.slice(0, 50) || 'Voice Memo';
              }

              if (isQuickCapture) {
                category = 'standup';
                title = `Standup — ${new Date().toLocaleDateString()}`;
              }

              const newMemo: VoiceMemo = {
                id: `memo-${Date.now()}`,
                title,
                transcription,
                duration: recordingDuration,
                category,
                linkedMeetingId,
                tags,
                isQuickCapture,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };

              // Save to backend
              try {
                const saved = await apiService.saveVoiceMemo(newMemo);
                if (saved.memo) newMemo.id = saved.memo.id;
              } catch {
                // Keep local ID
              }

              saveMemos([newMemo, ...memos]);
            } catch (err: any) {
              setError(`Transcription failed: ${err.message}`);
            } finally {
              setIsProcessing(false);
            }
          };
        } catch (err: any) {
          setError('Failed to process audio');
          setIsProcessing(false);
        }

        resolve();
      };

      mediaRecorderRef.current!.stop();
    });
  };

  const deleteMemo = async (id: string) => {
    try {
      await apiService.deleteVoiceMemo(id);
    } catch {
      // Continue with local delete
    }
    saveMemos(memos.filter(m => m.id !== id));
  };

  const updateMemo = async (memo: VoiceMemo) => {
    try {
      await apiService.updateVoiceMemo(memo.id, memo);
    } catch {
      // Continue with local update
    }
    saveMemos(memos.map(m => m.id === memo.id ? memo : m));
    setEditingMemo(null);
  };

  const filteredMemos = memos.filter(m => {
    if (selectedCategory !== 'all' && m.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        m.title.toLowerCase().includes(q) ||
        m.transcription?.toLowerCase().includes(q) ||
        m.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const getCategoryStyle = (cat: string) => {
    const found = CATEGORIES.find(c => c.value === cat);
    const colorMap: Record<string, string> = {
      gray: 'bg-gray-100 text-gray-600',
      blue: 'bg-blue-100 text-blue-600',
      amber: 'bg-amber-100 text-amber-600',
      emerald: 'bg-emerald-100 text-emerald-600',
    };
    return colorMap[found?.color || 'gray'] || colorMap.gray;
  };

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="px-6 py-5 shrink-0" style={{ backgroundColor: 'var(--card-bg)', borderBottom: '1px solid var(--border-secondary)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-orange-500 rounded-xl flex items-center justify-center">
              <i className="fas fa-microphone text-white"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Voice Memos</h1>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{memos.length} memo{memos.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => startRecording(true)}
              disabled={isRecording || isProcessing}
              className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <i className="fas fa-bolt text-xs"></i>
              Quick Standup
            </button>
            <button
              onClick={() => startRecording(false)}
              disabled={isRecording || isProcessing}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <i className="fas fa-microphone text-xs"></i>
              Record Memo
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-tertiary)' }}></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memos..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)', color: 'var(--text-primary)' }}
            />
          </div>

          <div className="flex items-center gap-1 rounded-xl p-1" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedCategory === 'all' ? 'shadow-sm' : ''}`}
              style={selectedCategory === 'all' ? { backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' } : { color: 'var(--text-secondary)' }}
            >
              All
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedCategory === cat.value ? 'shadow-sm' : ''}`}
                style={selectedCategory === cat.value ? { backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' } : { color: 'var(--text-secondary)' }}
              >
                <i className={`fas ${cat.icon} mr-1`}></i>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recording Banner */}
      {(isRecording || isProcessing) && (
        <div className={`mx-6 mt-4 p-4 rounded-2xl border ${isRecording
          ? 'bg-red-50 border-red-200'
          : 'bg-blue-50 border-blue-200'
          }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isRecording ? (
                <>
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <div>
                    <p className="text-sm font-bold text-red-800">
                      {isQuickCapture ? 'Quick Standup Capture' : 'Recording Voice Memo'}
                    </p>
                    <p className="text-xs text-red-600">{formatDuration(recordingDuration)}</p>
                  </div>
                </>
              ) : (
                <>
                  <i className="fas fa-spinner fa-spin text-blue-600"></i>
                  <div>
                    <p className="text-sm font-bold text-blue-800">Processing...</p>
                    <p className="text-xs text-blue-600">Transcribing & categorizing</p>
                  </div>
                </>
              )}
            </div>

            {isRecording && (
              <button
                onClick={stopRecording}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
              >
                <i className="fas fa-stop text-xs"></i>
                Stop
              </button>
            )}
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

      {/* Memos List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredMemos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 bg-rose-50 rounded-2xl flex items-center justify-center mb-4">
              <i className="fas fa-microphone-lines text-3xl text-rose-400"></i>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No Voice Memos Yet</h3>
            <p className="text-sm text-gray-500 max-w-md mb-4">
              Record quick voice memos that auto-transcribe and get AI-categorized. 
              Use Quick Standup for morning capture mode.
            </p>
            <button
              onClick={() => startRecording(false)}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <i className="fas fa-microphone mr-2"></i>
              Record First Memo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredMemos.map(memo => (
              <div
                key={memo.id}
                className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-md transition-shadow group"
              >
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${getCategoryStyle(memo.category)}`}>
                    <i className={`fas ${CATEGORIES.find(c => c.value === memo.category)?.icon || 'fa-microphone'} text-sm`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingMemo?.id === memo.id ? (
                      <input
                        type="text"
                        value={editingMemo.title}
                        onChange={(e) => setEditingMemo({ ...editingMemo, title: e.target.value })}
                        onBlur={() => updateMemo(editingMemo)}
                        onKeyDown={(e) => e.key === 'Enter' && updateMemo(editingMemo)}
                        className="text-sm font-bold text-gray-900 w-full px-2 py-1 border border-brand-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                        autoFocus
                      />
                    ) : (
                      <h3
                        className="text-sm font-bold text-gray-900 truncate cursor-pointer hover:text-brand-600"
                        onClick={() => setEditingMemo(memo)}
                      >
                        {memo.title}
                      </h3>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-gray-400">
                        {new Date(memo.createdAt).toLocaleDateString()} · {formatDuration(memo.duration)}
                      </span>
                      {memo.isQuickCapture && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                          QUICK
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMemo(memo.id)}
                    className="opacity-0 group-hover:opacity-100 w-7 h-7 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg flex items-center justify-center transition-all"
                  >
                    <i className="fas fa-trash text-xs"></i>
                  </button>
                </div>

                {/* Transcription */}
                {memo.transcription && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-3 leading-relaxed">
                    {memo.transcription}
                  </p>
                )}

                {/* Tags & Linked Meeting */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {memo.tags.map((tag, i) => (
                    <span key={i} className="text-[11px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                      #{tag}
                    </span>
                  ))}

                  {memo.linkedMeetingId && (() => {
                    const linkedMeeting = meetings.find(m => m.id === memo.linkedMeetingId);
                    return linkedMeeting ? (
                      <button
                        onClick={() => onViewMeeting(memo.linkedMeetingId!)}
                        className="text-[11px] px-2 py-0.5 bg-brand-50 text-brand-600 rounded-full hover:bg-brand-100 transition-colors flex items-center gap-1"
                      >
                        <i className="fas fa-link text-[9px]"></i>
                        {linkedMeeting.title}
                      </button>
                    ) : null;
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceMemosView;
