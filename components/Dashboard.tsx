import React, { useRef, useState, useMemo } from 'react';
import { Meeting } from '../types';

interface DashboardProps {
  meetings: Meeting[];
  minutesUsed: number;
  onViewMeeting: (id: string) => void;
  onDeleteMeeting: (id: string) => void;
  onStartRecording: () => void;
  onFileSelect: (file: File | { name: string, url: string }) => void;
  onOpenCalendar: () => void;
}

/** Find the best matching snippet around the first occurrence of `query` in `text`. */
const getMatchSnippet = (text: string, query: string, radius = 60): string | null => {
  if (!text || !query) return null;
  const lower = text.toLowerCase();
  const qLower = query.toLowerCase();
  const idx = lower.indexOf(qLower);
  if (idx === -1) return null;
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + query.length + radius);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return `${prefix}${text.slice(start, end)}${suffix}`;
};

/** Highlight all occurrences of `query` in `text` as React elements. */
const highlightText = (text: string, query: string): React.ReactNode => {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part)
      ? <mark key={i} className="bg-yellow-200/80 text-yellow-900 rounded-sm px-0.5">{part}</mark>
      : part
  );
};

interface SearchMatch {
  meeting: Meeting;
  matchField: 'title' | 'transcript' | 'summary' | 'actionItems';
  snippet: string;
}

const Dashboard: React.FC<DashboardProps> = ({ meetings, minutesUsed, onViewMeeting, onDeleteMeeting, onStartRecording, onFileSelect, onOpenCalendar }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCloudPicker, setShowCloudPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Compute search results
  const searchResults = useMemo((): SearchMatch[] => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) return [];

    const results: SearchMatch[] = [];
    const qLower = q.toLowerCase();

    for (const meeting of meetings) {
      // Check title
      if (meeting.title.toLowerCase().includes(qLower)) {
        results.push({ meeting, matchField: 'title', snippet: meeting.title });
      }

      // Check summary
      if (meeting.summary && meeting.summary.toLowerCase().includes(qLower)) {
        const snippet = getMatchSnippet(meeting.summary, q) || meeting.summary.slice(0, 120);
        if (!results.find(r => r.meeting.id === meeting.id)) {
          results.push({ meeting, matchField: 'summary', snippet });
        }
      }

      // Check action items
      if (meeting.actionItems) {
        const matchedItem = meeting.actionItems.find(item => item.toLowerCase().includes(qLower));
        if (matchedItem && !results.find(r => r.meeting.id === meeting.id)) {
          results.push({ meeting, matchField: 'actionItems', snippet: matchedItem });
        }
      }

      // Check transcript
      const transcriptText = meeting.transcript.map(p => `${p.speaker}: ${p.text}`).join(' ');
      if (transcriptText.toLowerCase().includes(qLower)) {
        const snippet = getMatchSnippet(transcriptText, q) || transcriptText.slice(0, 120);
        if (!results.find(r => r.meeting.id === meeting.id)) {
          results.push({ meeting, matchField: 'transcript', snippet });
        }
      }
    }

    return results;
  }, [meetings, searchQuery]);

  const isSearching = searchQuery.trim().length >= 2;

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleCloudImportClick = () => {
    setShowCloudPicker(true);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleGoogleDrivePick = () => {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!apiKey || !clientId) {
      alert('Google Drive is not configured. Please set VITE_GOOGLE_API_KEY and VITE_GOOGLE_CLIENT_ID in your environment.');
      setShowCloudPicker(false);
      return;
    }

    setShowCloudPicker(false);

    const loadScript = (src: string, id: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (document.getElementById(id)) { resolve(); return; }
        const script = document.createElement('script');
        script.src = src;
        script.id = id;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
      });
    };

    const initPicker = async () => {
      try {
        await Promise.all([
          loadScript('https://apis.google.com/js/api.js', 'google-api-script'),
          loadScript('https://accounts.google.com/gsi/client', 'google-gsi-script'),
        ]);

        await new Promise<void>((resolve) => {
          (window as any).gapi.load('picker', { callback: resolve });
        });

        const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive.readonly',
          callback: (tokenResponse: any) => {
            if (tokenResponse.error) {
              console.error('Google OAuth error:', tokenResponse);
              alert('Failed to authenticate with Google. Please try again.');
              return;
            }
            const picker = new (window as any).google.picker.PickerBuilder()
              .addView(
                new (window as any).google.picker.DocsView()
                  .setMimeTypes('audio/mpeg,audio/wav,audio/mp4,audio/ogg,audio/webm,video/mp4,video/webm,audio/x-m4a,audio/flac,audio/aac')
              )
              .setOAuthToken(tokenResponse.access_token)
              .setDeveloperKey(apiKey)
              .setCallback((data: any) => {
                if (data.action === 'picked' && data.docs?.length > 0) {
                  const file = data.docs[0];
                  onFileSelect({
                    name: file.name,
                    url: `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
                    source: 'google_drive'
                  } as any);
                }
              })
              .build();
            picker.setVisible(true);
          },
        });

        tokenClient.requestAccessToken({ prompt: '' });

      } catch (err) {
        console.error('Google Picker init error:', err);
        alert('Failed to load Google Drive picker. Please check your internet connection and try again.');
      }
    };

    initPicker();
  };

  const handleDropboxPick = () => {
    const appKey = import.meta.env.VITE_DROPBOX_APP_KEY;

    if (!appKey) {
      alert('Dropbox is not configured. Please set VITE_DROPBOX_APP_KEY in your environment.');
      setShowCloudPicker(false);
      return;
    }

    const loadDropboxChooser = () => {
      if ((window as any).Dropbox?.choose) {
        openDropboxChooser();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://www.dropbox.com/static/api/2/dropins.js';
      script.id = 'dropboxjs';
      script.setAttribute('data-app-key', appKey);
      script.onload = () => openDropboxChooser();
      document.body.appendChild(script);
    };

    const openDropboxChooser = () => {
      (window as any).Dropbox.choose({
        success: (files: any[]) => {
          if (files.length > 0) {
            const file = files[0];
            onFileSelect({
              name: file.name,
              url: file.link,
              source: 'dropbox'
            } as any);
          }
        },
        linkType: 'direct',
        multiselect: false,
        extensions: ['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.mp4', '.flac', '.aac'],
        folderselect: false,
      });
    };

    loadDropboxChooser();
    setShowCloudPicker(false);
  };

  const matchFieldLabel = (field: SearchMatch['matchField']) => {
    switch (field) {
      case 'title': return 'Title';
      case 'transcript': return 'Transcript';
      case 'summary': return 'Summary';
      case 'actionItems': return 'Action Item';
    }
  };

  const matchFieldIcon = (field: SearchMatch['matchField']) => {
    switch (field) {
      case 'title': return 'fa-heading';
      case 'transcript': return 'fa-quote-left';
      case 'summary': return 'fa-sparkles';
      case 'actionItems': return 'fa-list-check';
    }
  };

  const matchFieldColor = (field: SearchMatch['matchField']) => {
    switch (field) {
      case 'title': return 'bg-blue-50 text-blue-600';
      case 'transcript': return 'bg-emerald-50 text-emerald-600';
      case 'summary': return 'bg-purple-50 text-purple-600';
      case 'actionItems': return 'bg-amber-50 text-amber-600';
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto animate-fade-in">

      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-10 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">{getGreeting()} <span className="animate-fade-in inline-block">👋</span></h1>
          <p className="text-sm md:text-base text-gray-400 mt-1">Capture and summarize your conversations with AI.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl px-5 py-3 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Minutes Recorded</p>
            <p className="text-2xl font-extrabold text-gray-900 tabular-nums">{minutesUsed}</p>
          </div>
          <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl px-5 py-3 shadow-lg shadow-brand-500/20">
            <p className="text-[10px] font-bold text-brand-200 uppercase tracking-wider">Meetings</p>
            <p className="text-2xl font-extrabold text-white tabular-nums">{meetings.length}</p>
          </div>
        </div>
      </header>

      {/* ── Search Across All Meetings ── */}
      {meetings.length > 0 && (
        <section className="mb-8 md:mb-10">
          <div
            className={`relative glass rounded-2xl border transition-all duration-300 ${isSearchFocused
              ? 'border-brand-300 shadow-lg shadow-brand-100/50 ring-4 ring-brand-50'
              : 'border-gray-200/60 hover:border-gray-300/60 shadow-sm'
              }`}
          >
            <div className="flex items-center gap-3 px-4 md:px-5 py-3.5 md:py-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isSearchFocused ? 'bg-brand-50 text-brand-500' : 'bg-gray-100 text-gray-400'}`}>
                <i className="fas fa-magnifying-glass text-xs"></i>
              </div>
              <input
                ref={searchInputRef}
                id="global-meeting-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Search titles, transcripts, summaries, action items…"
                className="flex-1 bg-transparent text-sm md:text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none font-medium"
                style={{ boxShadow: 'none' }}
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}
                  className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <i className="fas fa-xmark text-xs"></i>
                </button>
              )}
              <div className="hidden md:flex items-center gap-1 pl-3 border-l border-gray-200/50">
                <kbd className="px-1.5 py-0.5 bg-gray-100/80 border border-gray-200/60 rounded-md text-[10px] font-mono text-gray-400">⌘</kbd>
                <kbd className="px-1.5 py-0.5 bg-gray-100/80 border border-gray-200/60 rounded-md text-[10px] font-mono text-gray-400">K</kbd>
              </div>
            </div>
          </div>

          {/* Search Results */}
          {isSearching && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {searchResults.length === 0
                    ? 'No results found'
                    : `${searchResults.length} meeting${searchResults.length !== 1 ? 's' : ''} found`}
                </p>
                {searchResults.length > 0 && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Clear search
                  </button>
                )}
              </div>

              {searchResults.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl text-gray-300">
                    <i className="fas fa-magnifying-glass"></i>
                  </div>
                  <h3 className="text-base font-bold text-gray-800 mb-1">No matches for "{searchQuery}"</h3>
                  <p className="text-sm text-gray-500">Try a different search term or check your spelling.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {searchResults.map((result) => (
                    <div
                      key={result.meeting.id}
                      onClick={() => onViewMeeting(result.meeting.id)}
                      className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-blue-200 hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gray-50 rounded-lg flex flex-col items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors shrink-0">
                          <span className="text-[8px] font-bold uppercase">{new Date(result.meeting.date).toLocaleString('default', { month: 'short' })}</span>
                          <span className="text-sm font-bold">{new Date(result.meeting.date).getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-gray-900 text-sm truncate">
                              {highlightText(result.meeting.title, searchQuery)}
                            </h4>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${matchFieldColor(result.matchField)}`}>
                              <i className={`fas ${matchFieldIcon(result.matchField)} text-[8px]`}></i>
                              {matchFieldLabel(result.matchField)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                            {highlightText(result.snippet, searchQuery)}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[10px] text-gray-400">
                              {new Date(result.meeting.date).toLocaleDateString()}
                            </span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                            <span className="text-[10px] text-gray-400">
                              {Math.floor(result.meeting.duration / 60)}m {result.meeting.duration % 60}s
                            </span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                            <span className="text-[10px] text-gray-400">
                              {result.meeting.transcript.length} parts
                            </span>
                          </div>
                        </div>
                        <i className="fas fa-chevron-right text-gray-300 group-hover:text-blue-400 transition-colors text-xs mt-1"></i>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8 md:mb-12">
        <QuickActionCard
          icon="fa-microphone"
          color="bg-blue-100 text-blue-600"
          activeColor="group-hover:bg-blue-600"
          title="Record Live"
          desc="Real-time highlights"
          onClick={onStartRecording}
        />
        <QuickActionCard
          icon="fa-upload"
          color="bg-purple-100 text-purple-600"
          activeColor="group-hover:bg-purple-600"
          title="Upload File"
          desc="MP3, WAV, PDF"
          onClick={handleImportClick}
        />
        <div className="relative group">
          <QuickActionCard
            icon="fa-cloud-arrow-down"
            color="bg-orange-100 text-orange-600"
            activeColor="group-hover:bg-orange-600"
            title="Cloud Import"
            desc="Drive / Dropbox"
            onClick={handleCloudImportClick}
          />
          {showCloudPicker && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-50 p-2 animate-in fade-in slide-in-from-top-2">
              <button onClick={(e) => { e.stopPropagation(); handleGoogleDrivePick(); }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg text-sm text-gray-700 font-medium">
                <i className="fab fa-google-drive text-blue-500"></i>
                Google Drive
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleDropboxPick(); }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg text-sm text-gray-700 font-medium">
                <i className="fab fa-dropbox text-blue-400"></i>
                Dropbox
              </button>
            </div>
          )}
        </div>
        <QuickActionCard
          icon="fa-calendar-check"
          color="bg-green-100 text-green-600"
          activeColor="group-hover:bg-green-600"
          title="Calendar Sync"
          desc="Auto-join bots"
          onClick={onOpenCalendar}
        />
        <input type="file" ref={fileInputRef} className="hidden" accept="audio/*,video/*,application/pdf" onChange={onFileChange} />
      </section>

      {/* Hide recent activity section when actively searching to avoid confusion */}
      {!isSearching && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2 order-2 lg:order-1">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg md:text-xl font-bold text-gray-900">Recent Activity</h2>
              <button className="text-xs md:text-sm font-semibold text-blue-600 hover:text-blue-700">View All</button>
            </div>

            {meetings.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-8 md:p-12 text-center">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4 text-xl md:text-2xl">
                  <i className="fas fa-file-invoice"></i>
                </div>
                <h3 className="text-base md:text-lg font-medium text-gray-900 mb-1">No recordings yet</h3>
                <p className="text-sm text-gray-500 mb-6">Start your first recording to see it here.</p>
                <button
                  onClick={onStartRecording}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Get Started
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {meetings.map((meeting, index) => (
                  <div
                    key={meeting.id}
                    className="bg-white p-3.5 md:p-4 rounded-2xl border border-gray-100/80 shadow-sm flex items-center gap-3 md:gap-4 hover:border-brand-200 hover:shadow-md transition-all duration-200 cursor-pointer group"
                    onClick={() => onViewMeeting(meeting.id)}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="w-11 h-11 md:w-12 md:h-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-400 group-hover:from-brand-50 group-hover:to-brand-100 group-hover:text-brand-600 transition-all shrink-0">
                      <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-wide">{new Date(meeting.date).toLocaleString('default', { month: 'short' })}</span>
                      <span className="text-sm md:text-base font-extrabold -mt-0.5">{new Date(meeting.date).getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 leading-tight truncate text-sm md:text-[15px]">{meeting.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-gray-400 font-medium">{Math.floor(meeting.duration / 60)}m {meeting.duration % 60}s</span>
                        <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                        <span className="text-[11px] text-gray-400 font-medium">{meeting.transcript.length} segments</span>
                        {meeting.actionItems && meeting.actionItems.length > 0 && (
                          <>
                            <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                            <span className="text-[11px] text-brand-500 font-semibold">{meeting.actionItems.length} actions</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to delete this meeting?')) onDeleteMeeting(meeting.id);
                        }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <i className="fas fa-trash-can text-xs"></i>
                      </button>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 group-hover:text-brand-500 transition-colors">
                        <i className="fas fa-chevron-right text-[10px]"></i>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="lg:col-span-1 order-1 lg:order-2">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg md:text-xl font-bold text-gray-900">Today</h2>
              <button onClick={onOpenCalendar} className="text-[10px] md:text-xs font-bold text-blue-600 hover:underline uppercase">Edit Sync</button>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6 shadow-sm">
              <div className="space-y-4 md:space-y-6">
                <UpcomingMeeting time="10:00 AM" title="Product Sync" platform="google_meet" isRecording={true} />
                <UpcomingMeeting time="1:30 PM" title="Design Review" platform="zoom" isRecording={false} />
              </div>
              <button onClick={onOpenCalendar} className="w-full mt-6 py-2 md:py-3 border border-gray-100 rounded-xl text-[10px] md:text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors">
                View Full Schedule
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

const QuickActionCard: React.FC<{ icon: string, color: string, activeColor: string, title: string, desc: string, onClick: () => void }> = ({ icon, color, activeColor, title, desc, onClick }) => (
  <div
    className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200/80 transition-all duration-200 cursor-pointer group hover:scale-[1.02] active:scale-[0.98]"
    onClick={onClick}
  >
    <div className={`w-10 h-10 md:w-12 md:h-12 ${color} rounded-xl flex items-center justify-center mb-3 md:mb-4 text-sm md:text-lg ${activeColor} group-hover:text-white transition-all group-hover:shadow-md group-hover:scale-110`}>
      <i className={`fas ${icon}`}></i>
    </div>
    <h3 className="font-bold text-gray-800 mb-0.5 text-xs md:text-sm">{title}</h3>
    <p className="text-[10px] md:text-xs text-gray-400">{desc}</p>
  </div>
);

const UpcomingMeeting: React.FC<{ time: string, title: string, platform: string, isRecording: boolean }> = ({ time, title, platform, isRecording }) => (
  <div className="flex items-start gap-3">
    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0 ${platform === 'google_meet' ? 'bg-blue-50 text-blue-500' :
      platform === 'zoom' ? 'bg-blue-50 text-blue-600' :
        'bg-purple-50 text-purple-600'
      }`}>
      <i className={`fas ${platform === 'google_meet' ? 'fa-video' : 'fa-video'} text-sm`}></i>
    </div>
    <div className="flex-1 overflow-hidden">
      <div className="flex justify-between items-center mb-0.5">
        <span className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider">{time}</span>
        {isRecording && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-50 text-red-600 rounded-full text-[8px] md:text-[9px] font-bold uppercase tracking-tight animate-pulse">
            <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-red-600 rounded-full"></span>
            Live
          </span>
        )}
      </div>
      <h4 className="text-xs md:text-sm font-bold text-gray-800 truncate">{title}</h4>
    </div>
  </div>
);

export default Dashboard;
