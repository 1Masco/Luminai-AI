
import React, { useState } from 'react';
import { CalendarEvent } from '../types';

interface CalendarSyncProps {
  onBack: () => void;
}

const CalendarSync: React.FC<CalendarSyncProps> = ({ onBack }) => {
  const [isSynced, setIsSynced] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([
    {
      id: '1',
      title: 'Marketing Weekly Sync',
      startTime: new Date(Date.now() + 3600000).toISOString(),
      platform: 'google_meet',
      autoJoin: true,
      link: 'https://meet.google.com/abc-defg-hij'
    },
    {
      id: '2',
      title: 'Customer Interview: Sarah J.',
      startTime: new Date(Date.now() + 7200000).toISOString(),
      platform: 'zoom',
      autoJoin: false,
      link: 'https://zoom.us/j/123456789'
    },
    {
      id: '3',
      title: 'Sprint Planning',
      startTime: new Date(Date.now() + 86400000).toISOString(),
      platform: 'teams',
      autoJoin: true,
      link: 'https://teams.microsoft.com/l/meetup-join/...'
    }
  ]);

  const toggleAutoJoin = (id: string) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, autoJoin: !e.autoJoin } : e));
  };

  const handleConnect = () => {
    setIsSynced(true);
  };

  return (
    <div className="h-full bg-white flex flex-col">
      <header className="p-6 border-b border-gray-100 flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
          <i className="fas fa-arrow-left"></i>
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Auto-Join Settings</h1>
          <p className="text-sm text-gray-500">Automatically record and transcribe your meetings.</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
        {!isSynced ? (
          <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-300 px-6">
            <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-6 text-3xl text-gray-400">
              <i className="fas fa-calendar-plus"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect your calendar</h2>
            <p className="text-gray-500 max-w-sm mx-auto mb-10">
              Lumina will scan your calendar for Zoom, Google Meet, and Teams links to automatically record them for you.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={handleConnect}
                className="flex items-center justify-center gap-3 px-8 py-4 bg-white border border-gray-200 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
              >
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                Connect Google Calendar
              </button>
              <button 
                onClick={handleConnect}
                className="flex items-center justify-center gap-3 px-8 py-4 bg-white border border-gray-200 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
              >
                <img src="https://www.microsoft.com/favicon.ico" className="w-5 h-5" alt="Outlook" />
                Connect Outlook
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            <section>
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-gray-900">Connected Accounts</h3>
                <button className="text-xs font-bold text-red-500 hover:underline">Disconnect All</button>
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                  <i className="fab fa-google"></i>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-800">alex.transcribe@gmail.com</p>
                  <p className="text-xs text-green-600 font-medium">Synced successfully</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-lg text-[10px] font-bold text-gray-400 uppercase">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Active
                </div>
              </div>
            </section>

            <section>
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-gray-900">Upcoming Meetings</h3>
                <div className="flex items-center gap-2">
                   <span className="text-xs text-gray-400">Refresh</span>
                   <button className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50">
                     <i className="fas fa-rotate text-xs text-gray-400"></i>
                   </button>
                </div>
              </div>

              <div className="space-y-3">
                {events.map(event => (
                  <div key={event.id} className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4 hover:border-blue-100 transition-colors shadow-sm">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-xl ${
                      event.platform === 'google_meet' ? 'bg-blue-50 text-blue-600' :
                      event.platform === 'zoom' ? 'bg-blue-100 text-blue-700' :
                      'bg-purple-50 text-purple-600'
                    }`}>
                      <i className={`fas ${
                        event.platform === 'google_meet' ? 'fa-video' :
                        event.platform === 'zoom' ? 'fa-video' :
                        'fa-users-rectangle'
                      }`}></i>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">
                          {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[10px] font-medium text-gray-400">
                          {new Date(event.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <h4 className="font-bold text-gray-900 truncate mb-1">{event.title}</h4>
                      <div className="flex items-center gap-3">
                        <a href={event.link} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-blue-500 flex items-center gap-1">
                          <i className="fas fa-link text-[10px]"></i>
                          Meeting Link
                        </a>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`text-[10px] font-bold uppercase tracking-tight ${event.autoJoin ? 'text-green-600' : 'text-gray-400'}`}>
                        {event.autoJoin ? 'Auto-Record ON' : 'Auto-Record OFF'}
                      </span>
                      <button 
                        onClick={() => toggleAutoJoin(event.id)}
                        className={`w-14 h-7 rounded-full relative transition-colors ${event.autoJoin ? 'bg-blue-600' : 'bg-gray-200'}`}
                      >
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${event.autoJoin ? 'right-1' : 'left-1'}`}></div>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="p-6 bg-blue-50 rounded-3xl flex items-start gap-4">
               <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-500 shrink-0 shadow-sm">
                 <i className="fas fa-lightbulb"></i>
               </div>
               <div>
                 <h4 className="font-bold text-blue-900 mb-1">How does Auto-Join work?</h4>
                 <p className="text-sm text-blue-700/80 leading-relaxed">
                   Lumina will automatically join your scheduled meetings 1 minute before they start. 
                   It will record the audio, transcribe the conversation, and generate a summary 
                   immediately after the meeting ends. You can disable this for any specific meeting above.
                 </p>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarSync;
