
import React, { useState, useMemo } from 'react';
import { Note, Meeting } from '../types';
import config from '../utils/config';

const API_URL = config.apiUrl;

interface NotesViewProps {
  notes: Note[];
  meetings: Meeting[];
  onSaveNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onViewMeeting: (id: string) => void;
}

const NotesView: React.FC<NotesViewProps> = ({ notes, meetings, onSaveNote, onDeleteNote, onViewMeeting }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isMagicWriting, setIsMagicWriting] = useState(false);
  const [activeFolder, setActiveFolder] = useState<string>('all');
  const [showEditorMobile, setShowEditorMobile] = useState(false);

  // Unified items list
  const allItems = useMemo(() => {
    const recordingItems: (Note & { type: 'recording' })[] = meetings.map(m => ({
      id: m.id,
      title: m.title,
      content: m.summary || "No summary available.",
      date: m.date,
      isRecording: true,
      type: 'recording'
    }));

    const manualNotes: (Note & { type: 'note' })[] = notes.map(n => ({
      ...n,
      type: 'note'
    }));

    return [...recordingItems, ...manualNotes].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [meetings, notes]);

  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFolder = activeFolder === 'all' || 
                            (activeFolder === 'recordings' && item.isRecording) ||
                            (activeFolder === 'scratchpad' && !item.isRecording);
      return matchesSearch && matchesFolder;
    });
  }, [allItems, searchQuery, activeFolder]);

  const selectedItem = useMemo(() => {
    return allItems.find(i => i.id === selectedNoteId);
  }, [allItems, selectedNoteId]);

  const handleCreateNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'Untitled Note',
      content: '',
      date: new Date().toISOString(),
    };
    onSaveNote(newNote);
    setSelectedNoteId(newNote.id);
    setActiveFolder('scratchpad');
    setShowEditorMobile(true);
  };

  const updateSelectedNote = (field: keyof Note, value: string) => {
    if (!selectedItem || selectedItem.isRecording) return;
    onSaveNote({ ...selectedItem, [field]: value });
  };

  const handleMagicWrite = async () => {
    if (!selectedItem || selectedItem.isRecording || isMagicWriting) return;
    setIsMagicWriting(true);
    try {
      const response = await fetch(`${API_URL}/api/ai/refine-note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: selectedItem.content,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to refine note');
      }

      const result = await response.json();
      if (typeof result.content === 'string' && result.content.trim()) {
        updateSelectedNote('content', result.content.trim());
      }
    } catch (err) {
      console.error("Magic Write error:", err);
    } finally {
      setIsMagicWriting(false);
    }
  };

  const handleSelectItem = (id: string) => {
    setSelectedNoteId(id);
    setShowEditorMobile(true);
  };

  return (
    <div className="flex h-full bg-white overflow-hidden relative">
      {/* List Panel */}
      <div className={`
        ${showEditorMobile ? 'hidden md:flex' : 'flex'}
        w-full md:w-80 border-r border-gray-100 flex-col h-full bg-gray-50/30 shrink-0
      `}>
        <div className="p-4 border-b border-gray-100 bg-white">
          <div className="relative mb-4">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
            <input 
              type="text" 
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-100 border-none rounded-lg py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <button 
            onClick={handleCreateNote}
            className="w-full py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 shadow-sm"
          >
            <i className="fas fa-plus text-blue-500"></i>
            New Scratchpad
          </button>
        </div>

        <div className="p-2 space-y-1 flex-1 overflow-y-auto">
          <FolderItem icon="fa-layer-group" label="All Files" isActive={activeFolder === 'all'} onClick={() => setActiveFolder('all')} />
          <FolderItem icon="fa-microphone" label="Transcripts" isActive={activeFolder === 'recordings'} onClick={() => setActiveFolder('recordings')} />
          <FolderItem icon="fa-pen-to-square" label="Scratchpad" isActive={activeFolder === 'scratchpad'} onClick={() => setActiveFolder('scratchpad')} />
          
          <div className="mt-4 pt-4 border-t border-gray-100 px-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Recent Files</span>
          </div>
          
          <div className="mt-2">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">No matching files found.</div>
            ) : (
              filteredItems.map(item => (
                <div 
                  key={item.id}
                  onClick={() => handleSelectItem(item.id)}
                  className={`p-3 rounded-xl cursor-pointer transition-all mb-1 mx-2 ${
                    selectedNoteId === item.id ? 'bg-white shadow-sm ring-1 ring-blue-500/10' : 'hover:bg-gray-200/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <i className={`fas ${item.isRecording ? 'fa-microphone text-blue-500' : 'fa-note-sticky text-yellow-500'} text-[10px]`}></i>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                      {new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <h4 className={`text-sm font-bold truncate ${selectedNoteId === item.id ? 'text-blue-600' : 'text-gray-800'}`}>{item.title}</h4>
                  <p className="text-xs text-gray-500 truncate mt-1">{item.content || 'Empty note'}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Editor Panel */}
      <div className={`
        ${showEditorMobile ? 'flex' : 'hidden md:flex'}
        flex-1 flex-col bg-white overflow-hidden h-full
      `}>
        {selectedItem ? (
          <>
            <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <button onClick={() => setShowEditorMobile(false)} className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                  <i className="fas fa-arrow-left"></i>
                </button>
                <div className="min-w-0">
                   {selectedItem.isRecording ? (
                     <h2 className="text-lg md:text-xl font-bold text-gray-900 truncate">{selectedItem.title}</h2>
                   ) : (
                     <input 
                       type="text" 
                       value={selectedItem.title}
                       onChange={(e) => updateSelectedNote('title', e.target.value)}
                       className="text-lg md:text-xl font-bold text-gray-900 focus:outline-none border-b border-transparent focus:border-gray-200 w-full truncate"
                     />
                   )}
                   <p className="text-[10px] md:text-xs text-gray-400 font-medium">Modified {new Date(selectedItem.date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex gap-1 md:gap-2">
                {!selectedItem.isRecording && (
                  <button 
                    onClick={handleMagicWrite}
                    disabled={isMagicWriting}
                    className="p-2 md:px-4 md:py-2 bg-purple-50 text-purple-600 rounded-lg text-xs font-bold hover:bg-purple-100 disabled:opacity-50"
                  >
                    <i className={`fas ${isMagicWriting ? 'fa-circle-notch fa-spin' : 'fa-wand-magic-sparkles'} md:mr-2`}></i>
                    <span className="hidden md:inline">Magic Write</span>
                  </button>
                )}
                <button 
                  onClick={() => selectedItem.isRecording ? onViewMeeting(selectedItem.id) : onDeleteNote(selectedItem.id)}
                  className={`p-2 md:px-4 md:py-2 rounded-lg text-xs font-bold transition-colors ${
                    selectedItem.isRecording 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-red-50 text-red-600'
                  }`}
                >
                  <i className={`fas ${selectedItem.isRecording ? 'fa-arrow-right' : 'fa-trash-can'} md:mr-2`}></i>
                  <span className="hidden md:inline">{selectedItem.isRecording ? 'Open' : 'Delete'}</span>
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-12 bg-white">
              <div className="max-w-3xl mx-auto h-full">
                {selectedItem.isRecording ? (
                  <div className="prose prose-blue max-w-none">
                     <div className="bg-blue-50 p-6 md:p-8 rounded-2xl md:rounded-3xl mb-8 border border-blue-100/50">
                       <h3 className="text-blue-900 font-bold mb-4 flex items-center gap-2">
                         <i className="fas fa-sparkles"></i>
                         AI Summary Highlights
                       </h3>
                       <p className="text-blue-800 leading-relaxed text-sm md:text-lg whitespace-pre-wrap">{selectedItem.content}</p>
                     </div>
                     <div className="text-center py-10 border-t border-dashed border-gray-200">
                        <p className="text-gray-400 text-xs md:text-sm mb-4">Detailed transcript is available in Meeting view.</p>
                        <button onClick={() => onViewMeeting(selectedItem.id)} className="px-6 py-2 border border-blue-500 text-blue-500 font-bold rounded-xl text-xs hover:bg-blue-50 transition-colors">View Full Transcript</button>
                     </div>
                  </div>
                ) : (
                  <textarea 
                    value={selectedItem.content}
                    onChange={(e) => updateSelectedNote('content', e.target.value)}
                    placeholder="Start typing your thoughts..."
                    className="w-full h-full text-sm md:text-lg text-gray-700 leading-relaxed resize-none focus:outline-none placeholder:text-gray-300 bg-transparent"
                  />
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 md:p-12 bg-gray-50/20">
            <div className="w-16 h-16 md:w-24 md:h-24 bg-gray-100 text-gray-300 rounded-full flex items-center justify-center mb-6 text-2xl md:text-4xl shadow-inner">
              <i className="fas fa-file-lines"></i>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-2">Select a file</h2>
            <p className="text-xs md:text-sm text-gray-500 max-w-xs">
              Manage all your transcripts and manual notes in one place. 
              Search, organize, and refine with AI.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const FolderItem: React.FC<{icon: string, label: string, isActive: boolean, onClick: () => void}> = ({icon, label, isActive, onClick}) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
      isActive ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-700'
    }`}
  >
    <i className={`fas ${icon} w-5`}></i>
    {label}
  </button>
);

export default NotesView;
