/**
 * Search and filter utilities for meetings and notes
 * Provides frontend helper functions for constructing search queries
 */

export interface SearchFilters {
  query?: string; // Full-text search
  sentiment?: 'positive' | 'neutral' | 'negative';
  startDate?: string; // ISO date
  endDate?: string; // ISO date
  speaker?: string; // Filter by speaker name
  hasActionItems?: boolean; // Only meetings with action items
  tags?: string[]; // Tag-based filtering
  sortBy?: 'date' | 'relevance' | 'duration';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Build search query string for API (URL params)
 */
export function buildSearchQuery(filters: SearchFilters): string {
  const params = new URLSearchParams();

  if (filters.query) params.append('q', filters.query);
  if (filters.sentiment) params.append('sentiment', filters.sentiment);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.speaker) params.append('speaker', filters.speaker);
  if (filters.hasActionItems !== undefined) params.append('actionItems', String(filters.hasActionItems));
  if (filters.tags?.length) params.append('tags', filters.tags.join(','));
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.sortOrder) params.append('order', filters.sortOrder);
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.offset) params.append('offset', String(filters.offset));

  return params.toString();
}

/**
 * Highlight search terms in text (client-side)
 */
export function highlightSearchTerms(text: string, searchQuery: string): string {
  if (!searchQuery.trim()) return text;

  const terms = searchQuery
    .split(/\s+/)
    .filter(t => t.length > 0)
    .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); // Escape regex chars

  const regex = new RegExp(`(${terms.join('|')})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

/**
 * Debounced search function
 */
export function debounceSearch<T extends (...args: any[]) => any>(
  func: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function debounced(...args: Parameters<T>) {
    if (timeoutId) clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Parse search query for smart search (e.g., "sentiment:positive date:>2024-01-01")
 */
export function parseSmartSearch(query: string): SearchFilters {
  const filters: SearchFilters = { query };

  // Parse sentiment filter: "sentiment:positive"
  const sentimentMatch = query.match(/sentiment:(positive|neutral|negative)/i);
  if (sentimentMatch) {
    filters.sentiment = sentimentMatch[1].toLowerCase() as any;
    filters.query = query.replace(sentimentMatch[0], '').trim();
  }

  // Parse date filters: "date:>2024-01-01" or "date:2024-01-01..2024-12-31"
  const dateMatch = query.match(/date:([0-9-]+)(\.\.([0-9-]+))?/);
  if (dateMatch) {
    filters.startDate = dateMatch[1];
    if (dateMatch[3]) filters.endDate = dateMatch[3];
    filters.query = query.replace(dateMatch[0], '').trim();
  }

  // Parse speaker filter: "speaker:john"
  const speakerMatch = query.match(/speaker:([a-zA-Z0-9_-]+)/i);
  if (speakerMatch) {
    filters.speaker = speakerMatch[1];
    filters.query = query.replace(speakerMatch[0], '').trim();
  }

  // Parse action items filter: "hasActions" or "actionItems"
  if (/hasactions|actionitems/i.test(query)) {
    filters.hasActionItems = true;
    filters.query = query.replace(/\bhasactions\b|\bactionitems\b/gi, '').trim();
  }

  return filters;
}

/**
 * Get search suggestions based on partial query
 */
export function getSearchSuggestions(query: string, recentSearches: string[] = []): string[] {
  const suggestions: string[] = [];

  // Add recent searches
  const matchingRecent = recentSearches.filter(s => s.toLowerCase().includes(query.toLowerCase())).slice(0, 3);
  suggestions.push(...matchingRecent);

  // Add syntax suggestions
  if (query.includes('sentiment:')) {
    suggestions.push('sentiment:positive', 'sentiment:neutral', 'sentiment:negative');
  }

  if (query.includes('date:')) {
    const today = new Date().toISOString().split('T')[0];
    suggestions.push(`date:${today}`, `date:${today}..${today}`);
  }

  if (query.includes('speaker:')) {
    suggestions.push('speaker:john', 'speaker:jane');
  }

  // Add common filters
  if (!query.includes('sentiment:')) {
    suggestions.push('sentiment:positive', 'sentiment:negative');
  }

  return [...new Set(suggestions)]; // Remove duplicates
}

export default {
  buildSearchQuery,
  highlightSearchTerms,
  debounceSearch,
  parseSmartSearch,
  getSearchSuggestions,
};
