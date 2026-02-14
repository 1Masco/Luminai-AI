/**
 * Smart highlights and bookmarks for transcripts
 * Users can mark important moments and jump between them
 */

export interface Highlight {
  id: string;
  meetingId: string;
  transcriptIndex: number; // Index in transcript array
  timestamp: number; // In seconds
  speaker: string;
  text: string;
  highlighted: boolean;
  color?: 'yellow' | 'red' | 'blue' | 'green' | 'purple';
  note?: string;
  tags?: string[];
  createdAt: string;
  category?: 'important' | 'question' | 'actionItem' | 'decision' | 'quote';
}

class HighlightManager {
  private highlights: Map<string, Highlight[]> = new Map();

  /**
   * Add a highlight
   */
  addHighlight(
    meetingId: string,
    transcriptIndex: number,
    timestamp: number,
    speaker: string,
    text: string,
    options?: {
      color?: 'yellow' | 'red' | 'blue' | 'green' | 'purple';
      note?: string;
      tags?: string[];
      category?: string;
    }
  ): Highlight {
    const highlight: Highlight = {
      id: `${meetingId}-hl-${Date.now()}`,
      meetingId,
      transcriptIndex,
      timestamp,
      speaker,
      text,
      highlighted: true,
      color: options?.color || 'yellow',
      note: options?.note,
      tags: options?.tags || [],
      category: options?.category as any,
      createdAt: new Date().toISOString(),
    };

    if (!this.highlights.has(meetingId)) {
      this.highlights.set(meetingId, []);
    }

    this.highlights.get(meetingId)!.push(highlight);
    return highlight;
  }

  /**
   * Remove a highlight
   */
  removeHighlight(meetingId: string, highlightId: string): boolean {
    const meetingHighlights = this.highlights.get(meetingId);
    if (!meetingHighlights) return false;

    const index = meetingHighlights.findIndex(h => h.id === highlightId);
    if (index === -1) return false;

    meetingHighlights.splice(index, 1);
    return true;
  }

  /**
   * Update a highlight
   */
  updateHighlight(meetingId: string, highlightId: string, updates: Partial<Highlight>): Highlight | null {
    const meetingHighlights = this.highlights.get(meetingId);
    if (!meetingHighlights) return null;

    const highlight = meetingHighlights.find(h => h.id === highlightId);
    if (!highlight) return null;

    Object.assign(highlight, updates);
    return highlight;
  }

  /**
   * Get all highlights for a meeting
   */
  getHighlights(meetingId: string): Highlight[] {
    return this.highlights.get(meetingId) || [];
  }

  /**
   * Get highlights by category
   */
  getHighlightsByCategory(meetingId: string, category: string): Highlight[] {
    return this.getHighlights(meetingId).filter(h => h.category === category);
  }

  /**
   * Get highlights by color
   */
  getHighlightsByColor(meetingId: string, color: string): Highlight[] {
    return this.getHighlights(meetingId).filter(h => h.color === color);
  }

  /**
   * Get highlights by tag
   */
  getHighlightsByTag(meetingId: string, tag: string): Highlight[] {
    return this.getHighlights(meetingId).filter(h => h.tags?.includes(tag));
  }

  /**
   * Search highlights
   */
  searchHighlights(meetingId: string, query: string): Highlight[] {
    const lowerQuery = query.toLowerCase();
    return this.getHighlights(meetingId).filter(
      h => h.text.toLowerCase().includes(lowerQuery) || h.note?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get highlights sorted by timestamp
   */
  getHighlightsByTimestamp(meetingId: string): Highlight[] {
    return [...this.getHighlights(meetingId)].sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Create highlight summary (for export)
   */
  createHighlightSummary(meetingId: string): string {
    const highlights = this.getHighlightsByTimestamp(meetingId);

    if (highlights.length === 0) return 'No highlights';

    let summary = '# Highlights\n\n';

    highlights.forEach((h, index) => {
      summary += `${index + 1}. **${h.speaker}** (${formatTime(h.timestamp)})`;

      if (h.category) {
        summary += ` [${h.category.toUpperCase()}]`;
      }

      summary += `\n   > ${h.text}\n`;

      if (h.note) {
        summary += `   📝 ${h.note}\n`;
      }

      if (h.tags?.length) {
        summary += `   ${h.tags.map(t => `#${t}`).join(' ')}\n`;
      }

      summary += '\n';
    });

    return summary;
  }

  /**
   * Get all tags used in highlights
   */
  getAllTags(meetingId: string): string[] {
    const tags = new Set<string>();
    this.getHighlights(meetingId).forEach(h => {
      h.tags?.forEach(t => tags.add(t));
    });
    return Array.from(tags).sort();
  }

  /**
   * Clear all highlights for a meeting
   */
  clearHighlights(meetingId: string): void {
    this.highlights.delete(meetingId);
  }
}

/**
 * Format timestamp as MM:SS
 */
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/**
 * Highlight categories with suggested colors
 */
export const HIGHLIGHT_CATEGORIES = {
  important: {
    name: 'Important',
    emoji: '⭐',
    color: 'red' as const,
    description: 'Critical points that matter',
  },
  question: {
    name: 'Question',
    emoji: '❓',
    color: 'blue' as const,
    description: 'Unanswered questions',
  },
  actionItem: {
    name: 'Action Item',
    emoji: '✅',
    color: 'green' as const,
    description: 'Things to do',
  },
  decision: {
    name: 'Decision',
    emoji: '🎯',
    color: 'purple' as const,
    description: 'Decisions made',
  },
  quote: {
    name: 'Quote',
    emoji: '💬',
    color: 'yellow' as const,
    description: 'Memorable quotes',
  },
};

/**
 * Suggested tags for highlights
 */
export const SUGGESTED_TAGS = [
  'urgent',
  'follow-up',
  'cost',
  'timeline',
  'risk',
  'opportunity',
  'stakeholder',
  'blocker',
  'win',
  'concern',
  'budget',
  'scope',
  'quality',
  'user-feedback',
  'competitor',
];

// Export singleton instance
export const highlightManager = new HighlightManager();

export default {
  highlightManager,
  HIGHLIGHT_CATEGORIES,
  SUGGESTED_TAGS,
};
