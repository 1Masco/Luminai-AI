import React, { useState, useEffect } from 'react';
import { Meeting, MeetingTranslation, SUPPORTED_LANGUAGES, TranslatedTranscriptPart } from '../types';
import apiService from '../utils/apiService';

interface TranslationViewProps {
  meeting: Meeting;
  onBack: () => void;
}

const TranslationView: React.FC<TranslationViewProps> = ({ meeting, onBack }) => {
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [translations, setTranslations] = useState<MeetingTranslation[]>([]);
  const [activeTranslation, setActiveTranslation] = useState<MeetingTranslation | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'translated-only'>('side-by-side');
  const [searchQuery, setSearchQuery] = useState('');

  // Detect languages present in the transcript
  const detectedLanguages = meeting.detectedLanguages || meeting.detected_languages || ['en'];

  useEffect(() => {
    loadTranslations();
  }, [meeting.id]);

  const loadTranslations = async () => {
    try {
      const result = await apiService.getTranslations(meeting.id);
      if (result.translations) {
        setTranslations(result.translations.map(mapTranslation));
      }
    } catch (err) {
      console.warn('Could not load translations:', err);
    }
  };

  const mapTranslation = (t: any): MeetingTranslation => ({
    id: t.id,
    meetingId: t.meeting_id,
    languageCode: t.language_code,
    languageName: t.language_name,
    translatedTranscript: t.translated_transcript || [],
    translatedSummary: t.translated_summary,
    status: t.status,
    createdAt: t.created_at,
  });

  const handleTranslate = async () => {
    if (!selectedLanguage) return;
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage);
    if (!lang) return;

    // Check if already translated
    const existing = translations.find(t => t.languageCode === selectedLanguage);
    if (existing && existing.status === 'completed') {
      setActiveTranslation(existing);
      return;
    }

    setIsTranslating(true);
    setError(null);

    try {
      const transcriptText = meeting.transcript.map(t => `${t.speaker}: ${t.text}`).join('\n');
      const result = await apiService.translateMeeting(
        meeting.id,
        selectedLanguage,
        lang.name,
        transcriptText,
        meeting.summary || ''
      );

      const newTranslation: MeetingTranslation = {
        id: result.translation?.id || Date.now().toString(),
        meetingId: meeting.id,
        languageCode: selectedLanguage,
        languageName: lang.name,
        translatedTranscript: result.translatedTranscript || [],
        translatedSummary: result.translatedSummary,
        status: 'completed',
        createdAt: new Date().toISOString(),
      };

      setTranslations(prev => {
        const idx = prev.findIndex(t => t.languageCode === selectedLanguage);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = newTranslation;
          return updated;
        }
        return [...prev, newTranslation];
      });
      setActiveTranslation(newTranslation);
    } catch (err: any) {
      setError(err.message || 'Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  const filteredTranscript = activeTranslation?.translatedTranscript.filter(part => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return part.text.toLowerCase().includes(q) || part.originalText.toLowerCase().includes(q) || part.speaker.toLowerCase().includes(q);
  }) || [];

  const availableLanguages = SUPPORTED_LANGUAGES.filter(l => l.code !== 'en');

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={onBack} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <i className="fas fa-arrow-left text-sm text-gray-600"></i>
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Translation</h1>
            <p className="text-sm text-gray-500">{meeting.title}</p>
          </div>
          {detectedLanguages.length > 1 && (
            <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
              <i className="fas fa-language text-amber-600 text-sm"></i>
              <span className="text-xs font-medium text-amber-700">
                Multi-language detected: {detectedLanguages.join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Language Selector & Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Translate to:</label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select language...</option>
              {availableLanguages.map(lang => {
                const existing = translations.find(t => t.languageCode === lang.code);
                return (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name} {existing?.status === 'completed' ? '✓' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <button
            onClick={handleTranslate}
            disabled={!selectedLanguage || isTranslating}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isTranslating ? (
              <>
                <i className="fas fa-spinner fa-spin text-xs"></i>
                Translating...
              </>
            ) : (
              <>
                <i className="fas fa-language text-xs"></i>
                Translate
              </>
            )}
          </button>

          {activeTranslation && (
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('side-by-side')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === 'side-by-side' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Side by Side
              </button>
              <button
                onClick={() => setViewMode('translated-only')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === 'translated-only' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Translated Only
              </button>
            </div>
          )}
        </div>

        {/* Previously translated languages */}
        {translations.filter(t => t.status === 'completed').length > 0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs text-gray-400">Available:</span>
            {translations.filter(t => t.status === 'completed').map(t => {
              const lang = SUPPORTED_LANGUAGES.find(l => l.code === t.languageCode);
              return (
                <button
                  key={t.languageCode}
                  onClick={() => {
                    setSelectedLanguage(t.languageCode);
                    setActiveTranslation(t);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${activeTranslation?.languageCode === t.languageCode
                    ? 'bg-brand-50 border-brand-200 text-brand-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  {lang?.flag} {t.languageName}
                </button>
              );
            })}
          </div>
        )}
      </div>

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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {!activeTranslation ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 bg-brand-50 rounded-2xl flex items-center justify-center mb-4">
              <i className="fas fa-language text-3xl text-brand-500"></i>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Multi-Language Translation</h3>
            <p className="text-sm text-gray-500 max-w-md">
              Select a language above to translate this meeting's transcript and summary. 
              Translations are saved for instant access later.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Translated Summary */}
            {activeTranslation.translatedSummary && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
                <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <i className="fas fa-file-lines text-brand-500"></i>
                  Summary ({activeTranslation.languageName})
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">{activeTranslation.translatedSummary}</p>
              </div>
            )}

            {/* Search in transcript */}
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in transcript..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Transcript */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">
                  Transcript — {activeTranslation.languageName}
                </h3>
                <span className="text-xs text-gray-400">
                  {filteredTranscript.length} segments
                </span>
              </div>

              <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                {filteredTranscript.map((part, index) => (
                  <div key={part.id || index} className={`p-4 hover:bg-gray-50/50 transition-colors ${viewMode === 'side-by-side' ? 'grid grid-cols-2 gap-4' : ''}`}>
                    {viewMode === 'side-by-side' && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-gray-500">{part.speaker}</span>
                          <span className="text-[10px] text-gray-300">Original</span>
                        </div>
                        <p className="text-sm text-gray-500 italic">{part.originalText}</p>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-brand-600">{part.speaker}</span>
                        {viewMode === 'side-by-side' && (
                          <span className="text-[10px] text-brand-400">{activeTranslation.languageName}</span>
                        )}
                        <span className="text-[10px] text-gray-300 ml-auto">
                          {Math.floor(part.timestamp / 60)}:{String(Math.floor(part.timestamp % 60)).padStart(2, '0')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800">{part.text}</p>
                    </div>
                  </div>
                ))}

                {filteredTranscript.length === 0 && (
                  <div className="p-8 text-center text-sm text-gray-400">
                    {searchQuery ? 'No matching segments found' : 'No translated transcript available'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TranslationView;
