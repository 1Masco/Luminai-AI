/**
 * Meeting insights and statistics calculator
 * Generates analytics, trends, and insights from meetings
 */

export interface MeetingInsights {
  totalMeetings: number;
  totalDurationMinutes: number;
  averageDurationMinutes: number;
  totalTranscriptionHours: number;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  sentimentTrend: Array<{
    date: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    count: number;
  }>;
  topActionItems: Array<{
    item: string;
    frequency: number;
    meetings: string[]; // Meeting IDs
  }>;
  topTopics: Array<{
    topic: string;
    frequency: number;
    meetings: string[];
  }>;
  topSpeakers: Array<{
    speaker: string;
    meetingCount: number;
    totalMinutes: number;
  }>;
  mostProductiveDay: string; // Day of week with most meetings
  averageParticipants: number;
  longestMeeting: {
    id: string;
    title: string;
    durationMinutes: number;
  } | null;
  averageMeetingsPerWeek: number;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  duration: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  actionItems?: string[];
  transcript: Array<{
    speaker: string;
    text: string;
    timestamp: number;
  }>;
  summary?: string;
}

/**
 * Calculate comprehensive meeting insights
 */
export function calculateMeetingInsights(meetings: Meeting[]): MeetingInsights {
  if (meetings.length === 0) {
    return {
      totalMeetings: 0,
      totalDurationMinutes: 0,
      averageDurationMinutes: 0,
      totalTranscriptionHours: 0,
      sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
      sentimentTrend: [],
      topActionItems: [],
      topTopics: [],
      topSpeakers: [],
      mostProductiveDay: 'N/A',
      averageParticipants: 0,
      longestMeeting: null,
      averageMeetingsPerWeek: 0,
    };
  }

  const totalDurationMinutes = meetings.reduce((sum, m) => sum + (m.duration || 0), 0);
  const totalDurationHours = totalDurationMinutes / 60;

  // Sentiment breakdown
  const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
  meetings.forEach(m => {
    const sentiment = m.sentiment || 'neutral';
    sentimentCounts[sentiment]++;
  });

  // Sentiment trend over time
  const sentimentTrend = createSentimentTrend(meetings);

  // Top action items
  const actionItemMap = new Map<string, { count: number; meetings: Set<string> }>();
  meetings.forEach(m => {
    m.actionItems?.forEach(item => {
      const current = actionItemMap.get(item) || { count: 0, meetings: new Set() };
      current.count++;
      current.meetings.add(m.id);
      actionItemMap.set(item, current);
    });
  });

  const topActionItems = Array.from(actionItemMap.entries())
    .map(([item, { count, meetings }]) => ({
      item,
      frequency: count,
      meetings: Array.from(meetings),
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);

  // Top topics (extracted from summaries)
  const topTopics = extractTopicsFromMeetings(meetings);

  // Top speakers
  const topSpeakers = extractTopSpeakers(meetings);

  // Most productive day
  const dayMap = new Map<string, number>();
  meetings.forEach(m => {
    const day = new Date(m.date).toLocaleDateString('en-US', { weekday: 'long' });
    dayMap.set(day, (dayMap.get(day) || 0) + 1);
  });

  let mostProductiveDay = 'N/A';
  let maxCount = 0;
  dayMap.forEach((count, day) => {
    if (count > maxCount) {
      maxCount = count;
      mostProductiveDay = day;
    }
  });

  // Average participants
  const averageParticipants = Math.round(
    meetings.reduce((sum, m) => {
      const speakers = new Set(m.transcript?.map(t => t.speaker) || []);
      return sum + speakers.size;
    }, 0) / meetings.length
  );

  // Longest meeting
  let longestMeeting = null;
  let maxDuration = 0;
  meetings.forEach(m => {
    if (m.duration > maxDuration) {
      maxDuration = m.duration;
      longestMeeting = {
        id: m.id,
        title: m.title,
        durationMinutes: m.duration,
      };
    }
  });

  // Average meetings per week
  const dateRange = getDateRange(meetings);
  const weeksDiff = Math.max(1, Math.ceil((dateRange.end - dateRange.start) / (7 * 24 * 60 * 60 * 1000)));
  const averageMeetingsPerWeek = Math.round((meetings.length / weeksDiff) * 10) / 10;

  return {
    totalMeetings: meetings.length,
    totalDurationMinutes,
    averageDurationMinutes: Math.round((totalDurationMinutes / meetings.length) * 10) / 10,
    totalTranscriptionHours: Math.round(totalDurationHours * 10) / 10,
    sentimentBreakdown: sentimentCounts,
    sentimentTrend,
    topActionItems,
    topTopics,
    topSpeakers,
    mostProductiveDay,
    averageParticipants,
    longestMeeting,
    averageMeetingsPerWeek,
  };
}

/**
 * Create sentiment trend over time
 */
function createSentimentTrend(
  meetings: Meeting[]
): Array<{ date: string; sentiment: 'positive' | 'neutral' | 'negative'; count: number }> {
  const trendMap = new Map<string, Map<string, number>>();

  meetings.forEach(m => {
    const date = new Date(m.date).toISOString().split('T')[0];
    const sentiment = m.sentiment || 'neutral';

    if (!trendMap.has(date)) {
      trendMap.set(date, new Map());
    }

    const sentiments = trendMap.get(date)!;
    sentiments.set(sentiment, (sentiments.get(sentiment) || 0) + 1);
  });

  const trend: Array<{ date: string; sentiment: 'positive' | 'neutral' | 'negative'; count: number }> = [];

  Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([date, sentiments]) => {
      sentiments.forEach((count, sentiment) => {
        trend.push({
          date,
          sentiment: sentiment as 'positive' | 'neutral' | 'negative',
          count,
        });
      });
    });

  return trend;
}

/**
 * Extract top topics from meeting summaries using simple keyword extraction
 */
function extractTopicsFromMeetings(
  meetings: Meeting[]
): Array<{ topic: string; frequency: number; meetings: string[] }> {
  const topicMap = new Map<string, { count: number; meetings: Set<string> }>();
  const stopwords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'is',
    'was',
    'are',
    'were',
    'be',
    'been',
    'being',
  ]);

  meetings.forEach(m => {
    const text = (m.summary || m.title).toLowerCase();
    const words = text
      .split(/\W+/)
      .filter(w => w.length > 4 && !stopwords.has(w))
      .slice(0, 5); // Top 5 keywords per meeting

    words.forEach(word => {
      const current = topicMap.get(word) || { count: 0, meetings: new Set() };
      current.count++;
      current.meetings.add(m.id);
      topicMap.set(word, current);
    });
  });

  return Array.from(topicMap.entries())
    .map(([topic, { count, meetings }]) => ({
      topic,
      frequency: count,
      meetings: Array.from(meetings),
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);
}

/**
 * Extract top speakers
 */
function extractTopSpeakers(meetings: Meeting[]): Array<{ speaker: string; meetingCount: number; totalMinutes: number }> {
  const speakerMap = new Map<string, { meetings: Set<string>; totalDuration: number }>();

  meetings.forEach(m => {
    const speakers = new Set(m.transcript?.map(t => t.speaker) || []);
    speakers.forEach(speaker => {
      const current = speakerMap.get(speaker) || { meetings: new Set(), totalDuration: 0 };
      current.meetings.add(m.id);
      current.totalDuration += m.duration || 0;
      speakerMap.set(speaker, current);
    });
  });

  return Array.from(speakerMap.entries())
    .map(([speaker, { meetings, totalDuration }]) => ({
      speaker,
      meetingCount: meetings.size,
      totalMinutes: Math.round(totalDuration * 10) / 10,
    }))
    .sort((a, b) => b.meetingCount - a.meetingCount)
    .slice(0, 10);
}

/**
 * Get date range from meetings
 */
function getDateRange(meetings: Meeting[]): { start: number; end: number } {
  const dates = meetings.map(m => new Date(m.date).getTime());
  return {
    start: Math.min(...dates),
    end: Math.max(...dates),
  };
}

export default { calculateMeetingInsights };
