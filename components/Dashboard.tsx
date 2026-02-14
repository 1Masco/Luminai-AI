import React, { useRef, useState } from 'react';
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

const Dashboard: React.FC<DashboardProps> = ({ meetings, minutesUsed, onViewMeeting, onDeleteMeeting, onStartRecording, onFileSelect, onOpenCalendar }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCloudPicker, setShowCloudPicker] = useState(false);

  const handleImportClick = () => {
    // Local file import is available to all plans
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

    // Helper to load a script if not already loaded
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

    // Load both scripts, then request token and open picker
    const initPicker = async () => {
      try {
        // Load Google API (for Picker) and Google Identity Services (for auth)
        await Promise.all([
          loadScript('https://apis.google.com/js/api.js', 'google-api-script'),
          loadScript('https://accounts.google.com/gsi/client', 'google-gsi-script'),
        ]);

        // Load the Picker module
        await new Promise<void>((resolve) => {
          (window as any).gapi.load('picker', { callback: resolve });
        });

        // Request an access token using Google Identity Services
        const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive.readonly',
          callback: (tokenResponse: any) => {
            if (tokenResponse.error) {
              console.error('Google OAuth error:', tokenResponse);
              alert('Failed to authenticate with Google. Please try again.');
              return;
            }
            // Build and show the picker
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

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">

      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Good day!</h1>
          <p className="text-sm md:text-base text-gray-500">Capture and summarize your conversations with AI.</p>
        </div>
        <div className="w-full md:w-auto text-left md:text-right flex flex-col items-start md:items-end gap-1">
          <p className="text-xs md:text-sm font-medium text-gray-500">Total minutes recorded</p>
          <p className="text-xl md:text-2xl font-bold text-gray-900">{minutesUsed}</p>
        </div>
      </header>

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
            <div className="space-y-3 md:space-y-4">
              {meetings.map(meeting => (
                <div
                  key={meeting.id}
                  className="bg-white p-3 md:p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3 md:gap-4 hover:border-blue-200 transition-colors cursor-pointer group"
                  onClick={() => onViewMeeting(meeting.id)}
                >
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-50 rounded-lg flex flex-col items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors shrink-0">
                    <span className="text-[8px] md:text-[10px] font-bold uppercase">{new Date(meeting.date).toLocaleString('default', { month: 'short' })}</span>
                    <span className="text-sm md:text-lg font-bold">{new Date(meeting.date).getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 leading-tight truncate text-sm md:text-base">{meeting.title}</h4>
                    <p className="text-xs text-gray-500 flex items-center gap-2 md:gap-3 truncate">
                      <span>{Math.floor(meeting.duration / 60)}m {meeting.duration % 60}s</span>
                      <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                      <span>{meeting.transcript.length} parts</span>
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Are you sure?')) onDeleteMeeting(meeting.id);
                    }}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <i className="fas fa-trash-can text-sm md:text-base"></i>
                  </button>
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
    </div>
  );
};

const QuickActionCard: React.FC<{ icon: string, color: string, activeColor: string, title: string, desc: string, onClick: () => void }> = ({ icon, color, activeColor, title, desc, onClick }) => (
  <div
    className="bg-white p-3 md:p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
    onClick={onClick}
  >
    <div className={`w-8 h-8 md:w-12 md:h-12 ${color} rounded-full flex items-center justify-center mb-2 md:mb-4 text-sm md:text-xl ${activeColor} group-hover:text-white transition-colors`}>
      <i className={`fas ${icon}`}></i>
    </div>
    <h3 className="font-bold text-gray-800 mb-0.5 md:mb-1 text-[11px] md:text-sm">{title}</h3>
    <p className="text-[9px] md:text-xs text-gray-500 leading-tight">{desc}</p>
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
