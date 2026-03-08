
import React, { useState, useEffect, useCallback } from 'react';
import { Meeting } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../utils/supabaseClient';
import apiService from '../utils/apiService';

interface SharedItem {
  shareId: string;
  permission: string;
  viewedAt: string | null;
  sharedAt: string;
  sharedBy: string;
  sharedByEmail: string;
  meeting: Meeting | null;
}

interface SharedViewProps {
  onViewMeeting: (id: string) => void;
}

const SharedView: React.FC<SharedViewProps> = ({ onViewMeeting }) => {
  const [activeTab, setActiveTab] = useState<'active' | 'recent'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [sharedItems, setSharedItems] = useState<SharedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const loadSharedItems = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setIsLoading(false);
        return;
      }

      const result = await apiService.getSharedWithMe(session.access_token);
      setSharedItems(result.sharedItems || []);
    } catch (err: any) {
      console.error('Failed to load shared items:', err);
      setError(err.message || 'Failed to load shared items');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSharedItems();
  }, [loadSharedItems]);

  const handleRemoveShare = async (shareId: string) => {
    try {
      if (!isSupabaseConfigured()) return;
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      await apiService.unshareMeeting(session.access_token, shareId);
      setSharedItems(prev => prev.filter(item => item.shareId !== shareId));
      setOpenMenu(null);
    } catch (err: any) {
      console.error('Failed to remove share:', err);
      alert('Failed to remove shared item');
    }
  };

  const handleViewShared = async (item: SharedItem) => {
    if (!item.meeting) return;

    // Mark as viewed
    try {
      if (!isSupabaseConfigured()) return;
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token && !item.viewedAt) {
        await apiService.markSharedViewed(session.access_token, item.shareId);
        setSharedItems(prev => prev.map(si =>
          si.shareId === item.shareId
            ? { ...si, viewedAt: new Date().toISOString() }
            : si
        ));
      }
    } catch (err) {
      console.error('Failed to mark as viewed:', err);
    }

    onViewMeeting(item.meeting.id);
  };

  // Filter items based on tab and search
  const filteredItems = sharedItems.filter(item => {
    if (!item.meeting) return false;

    // Tab filter
    if (activeTab === 'recent' && !item.viewedAt) return false;

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.meeting.title.toLowerCase().includes(q) ||
        item.sharedBy.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--card-bg)' }}>
      <header className="p-8 flex flex-col gap-6" style={{ borderBottom: '1px solid var(--border-primary)' }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Shared with me</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>View and collaborate on transcripts shared by your team.</p>
          </div>
          <div className="relative w-72">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-tertiary)' }}></i>
            <input
              type="text"
              placeholder="Search shared files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
              style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        <div className="flex gap-4 border-b border-transparent">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${activeTab === 'active' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'
              }`}
          >
            Active Shares
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${activeTab === 'recent' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'
              }`}
          >
            Recently Viewed
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
        <div className="max-w-5xl mx-auto space-y-4">
          {isLoading ? (
            <div className="text-center py-20">
              <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500 text-sm">Loading shared items...</p>
            </div>
          ) : error ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-red-200">
              <div className="w-16 h-16 bg-red-50 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Failed to load</h3>
              <p className="text-gray-500 max-w-xs mx-auto text-sm mb-4">{error}</p>
              <button
                onClick={loadSharedItems}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <div className="w-16 h-16 bg-gray-50 text-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                <i className="fas fa-share-nodes"></i>
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                {activeTab === 'recent' ? 'No recently viewed items' : 'No shared content yet'}
              </h3>
              <p className="text-gray-500 max-w-xs mx-auto text-sm">
                {activeTab === 'recent'
                  ? 'Items you view will appear here for quick access.'
                  : 'When teammates share transcripts or notes with you, they will appear here.'}
              </p>
            </div>
          ) : (
            filteredItems.map(item => (
              <div
                key={item.shareId}
                onClick={() => handleViewShared(item)}
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group flex items-start gap-5"
              >
                <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <i className="fas fa-file-invoice text-xl"></i>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      {new Date(item.sharedAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                    <span className="text-[10px] font-bold text-blue-600 uppercase">Shared by {item.sharedBy}</span>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2 truncate group-hover:text-blue-600 transition-colors">
                    {item.meeting?.title || 'Untitled Meeting'}
                  </h4>
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed flex-1">
                      {item.meeting?.summary || 'No summary available'}
                    </p>
                    {item.meeting?.duration ? (
                      <span className="text-[10px] text-gray-400 font-medium shrink-0">
                        {formatDuration(item.meeting.duration)}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 shrink-0 self-center">
                  {item.meeting?.sentiment && (
                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${item.meeting.sentiment === 'positive' ? 'bg-green-50 text-green-600' :
                        item.meeting.sentiment === 'negative' ? 'bg-red-50 text-red-600' :
                          'bg-gray-100 text-gray-600'
                      }`}>
                      {item.meeting.sentiment}
                    </div>
                  )}
                  {item.viewedAt && (
                    <span className="text-[9px] text-gray-400 font-medium">
                      Viewed {new Date(item.viewedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === item.shareId ? null : item.shareId); }}
                      className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-blue-500 transition-colors"
                    >
                      <i className="fas fa-ellipsis-h"></i>
                    </button>
                    {openMenu === item.shareId && (
                      <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-100 rounded-xl shadow-xl z-50 p-1 animate-in fade-in slide-in-from-top-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveShare(item.shareId); }}
                          className="w-full flex items-center gap-2 p-2.5 hover:bg-red-50 rounded-lg text-sm text-red-600 font-medium"
                        >
                          <i className="fas fa-trash-alt text-xs"></i>
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="p-6 border-t border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center text-xs">
              <i className="fas fa-share-alt"></i>
            </div>
            <p className="text-xs text-gray-500">
              {sharedItems.length === 0
                ? 'No items shared with you yet'
                : `${sharedItems.length} item${sharedItems.length !== 1 ? 's' : ''} shared with you`}
            </p>
          </div>
          <button
            onClick={loadSharedItems}
            className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
          >
            <i className="fas fa-sync-alt text-[10px]"></i>
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default SharedView;
