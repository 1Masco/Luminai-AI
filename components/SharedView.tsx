
import React, { useState } from 'react';
import { Meeting } from '../types';

interface SharedViewProps {
  onViewMeeting: (id: string) => void;
}

const SharedView: React.FC<SharedViewProps> = ({ onViewMeeting }) => {
  const [activeTab, setActiveTab] = useState<'active' | 'recent'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock shared items for demonstration
  const mockSharedItems: (Meeting & { sharedBy: string })[] = [
    {
      id: 'shared-1',
      title: 'Marketing Strategy Review',
      date: new Date(Date.now() - 86400000).toISOString(),
      duration: 1800,
      sharedBy: 'Sarah Jenkins',
      transcript: [],
      summary: 'Review of the Q4 marketing campaign results and adjustment of strategy for Q1.',
      sentiment: 'positive'
    },
    {
      id: 'shared-2',
      title: 'Design Critique: New Dashboard',
      date: new Date(Date.now() - 172800000).toISOString(),
      duration: 3600,
      sharedBy: 'David Chen',
      transcript: [],
      summary: 'In-depth review of the upcoming Lumina dashboard designs. Focus on usability and color palettes.',
      sentiment: 'neutral'
    },
    {
      id: 'shared-3',
      title: 'Weekly Standup',
      date: new Date(Date.now() - 259200000).toISOString(),
      duration: 900,
      sharedBy: 'Engineering Team',
      transcript: [],
      summary: 'Status updates on current sprints and blocker resolution.',
      sentiment: 'positive'
    }
  ];

  const filteredItems = mockSharedItems.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sharedBy.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full bg-white flex flex-col">
      <header className="p-8 border-b border-gray-100 flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shared with me</h1>
            <p className="text-sm text-gray-500">View and collaborate on transcripts shared by your team.</p>
          </div>
          <div className="relative w-72">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            <input 
              type="text" 
              placeholder="Search shared files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-4 border-b border-transparent">
          <button 
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'active' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'
            }`}
          >
            Active Shares
          </button>
          <button 
            onClick={() => setActiveTab('recent')}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'recent' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'
            }`}
          >
            Recently Viewed
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
        <div className="max-w-5xl mx-auto space-y-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
               <div className="w-16 h-16 bg-gray-50 text-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                 <i className="fas fa-share-nodes"></i>
               </div>
               <h3 className="text-lg font-bold text-gray-900">No shared content yet</h3>
               <p className="text-gray-500 max-w-xs mx-auto text-sm">When teammates share transcripts or notes with you, they will appear here.</p>
            </div>
          ) : (
            filteredItems.map(item => (
              <div 
                key={item.id}
                onClick={() => onViewMeeting(item.id)}
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group flex items-start gap-5"
              >
                <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <i className="fas fa-file-invoice text-xl"></i>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      {new Date(item.date).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                    <span className="text-[10px] font-bold text-blue-600 uppercase">Shared by {item.sharedBy}</span>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2 truncate group-hover:text-blue-600 transition-colors">{item.title}</h4>
                  <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{item.summary}</p>
                </div>

                <div className="flex flex-col items-end gap-3 shrink-0 self-center">
                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${
                    item.sentiment === 'positive' ? 'bg-green-50 text-green-600' :
                    item.sentiment === 'negative' ? 'bg-red-50 text-red-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {item.sentiment}
                  </div>
                  <button className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-blue-500 transition-colors">
                    <i className="fas fa-ellipsis-h"></i>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="p-6 border-t border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
           <div className="flex items-center gap-2">
             <div className="flex -space-x-2">
               <img src="https://i.pravatar.cc/32?u=1" className="w-8 h-8 rounded-full border-2 border-white shadow-sm" alt="User" />
               <img src="https://i.pravatar.cc/32?u=2" className="w-8 h-8 rounded-full border-2 border-white shadow-sm" alt="User" />
               <img src="https://i.pravatar.cc/32?u=3" className="w-8 h-8 rounded-full border-2 border-white shadow-sm" alt="User" />
               <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-bold text-gray-400">+5</div>
             </div>
             <p className="text-xs text-gray-500">Collaborating with 8 team members</p>
           </div>
           <button className="text-xs font-bold text-blue-600 hover:underline">Manage Team Permissions</button>
        </div>
      </div>
    </div>
  );
};

export default SharedView;
