import React, { useMemo } from 'react';
import { Meeting } from '../types';
import { calculateMeetingInsights, MeetingInsights } from '../utils/meetingInsights';

interface AnalyticsDashboardProps {
    meetings: Meeting[];
}

const DONUT_COLORS = { positive: '#10b981', neutral: '#6b7280', negative: '#ef4444' };
const SPEAKER_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#ec4899', '#14b8a6'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ meetings }) => {
    const insights: MeetingInsights = useMemo(() => {
        return calculateMeetingInsights(meetings as any);
    }, [meetings]);

    // Meetings per day-of-week for heatmap
    const dayDistribution = useMemo(() => {
        const counts: Record<string, number> = {};
        DAY_LABELS.forEach(d => (counts[d] = 0));
        meetings.forEach(m => {
            const d = new Date(m.date);
            const day = d.toLocaleDateString('en-US', { weekday: 'short' });
            const mapped = DAY_LABELS.find(l => day.startsWith(l)) || day.slice(0, 3);
            if (counts[mapped] !== undefined) counts[mapped]++;
        });
        return counts;
    }, [meetings]);

    const maxDayCount = Math.max(...Object.values(dayDistribution), 1);

    // Meetings per month (last 6 months)
    const monthlyData = useMemo(() => {
        const now = new Date();
        const months: { label: string; count: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const label = d.toLocaleDateString('en-US', { month: 'short' });
            const count = meetings.filter(m => {
                const md = new Date(m.date);
                return md.getMonth() === d.getMonth() && md.getFullYear() === d.getFullYear();
            }).length;
            months.push({ label, count });
        }
        return months;
    }, [meetings]);

    const maxMonthCount = Math.max(...monthlyData.map(m => m.count), 1);

    // Sentiment donut
    const total = insights.sentimentBreakdown.positive + insights.sentimentBreakdown.neutral + insights.sentimentBreakdown.negative;
    const sentimentSegments = useMemo(() => {
        if (total === 0) return [];
        const items = [
            { key: 'positive', count: insights.sentimentBreakdown.positive, color: DONUT_COLORS.positive },
            { key: 'neutral', count: insights.sentimentBreakdown.neutral, color: DONUT_COLORS.neutral },
            { key: 'negative', count: insights.sentimentBreakdown.negative, color: DONUT_COLORS.negative },
        ].filter(s => s.count > 0);
        let offset = 0;
        return items.map(s => {
            const pct = (s.count / total) * 100;
            const segment = { ...s, pct, offset };
            offset += pct;
            return segment;
        });
    }, [insights.sentimentBreakdown, total]);

    if (meetings.length === 0) {
        return (
            <div className="p-4 md:p-8 max-w-6xl mx-auto animate-fade-in">
                <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Analytics</h1>
                <p className="text-sm text-gray-400 mb-12">Your meeting insights and trends</p>
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div style={{
                        width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)', marginBottom: 20,
                    }}>
                        <i className="fas fa-chart-line" style={{ fontSize: 28, color: '#6366f1' }} />
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', marginBottom: 6 }}>No meetings yet</h3>
                    <p style={{ fontSize: 14, color: '#9ca3af', maxWidth: 320 }}>
                        Record or upload your first meeting to see analytics and insights here.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto animate-fade-in">
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight mb-1">Analytics</h1>
            <p className="text-sm text-gray-400 mb-8">Your meeting insights and trends</p>

            {/* ── Stats Row ──────────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 28 }}>
                {[
                    { label: 'Total Meetings', value: insights.totalMeetings, icon: 'fa-video', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)', shadow: 'rgba(99,102,241,0.3)' },
                    { label: 'Total Hours', value: `${insights.totalTranscriptionHours.toFixed(1)}h`, icon: 'fa-clock', gradient: 'linear-gradient(135deg, #10b981, #059669)', shadow: 'rgba(16,185,129,0.3)' },
                    { label: 'Avg Duration', value: `${Math.round(insights.averageDurationMinutes)}m`, icon: 'fa-gauge', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', shadow: 'rgba(245,158,11,0.3)' },
                    { label: 'Per Week', value: insights.averageMeetingsPerWeek.toFixed(1), icon: 'fa-calendar-week', gradient: 'linear-gradient(135deg, #ec4899, #db2777)', shadow: 'rgba(236,72,153,0.3)' },
                ].map(stat => (
                    <div key={stat.label} style={{
                        background: '#fff', borderRadius: 16, padding: '20px 16px',
                        border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        display: 'flex', alignItems: 'center', gap: 14,
                    }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: stat.gradient, boxShadow: `0 4px 12px ${stat.shadow}`, flexShrink: 0,
                        }}>
                            <i className={`fas ${stat.icon}`} style={{ color: '#fff', fontSize: 16 }} />
                        </div>
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: '#1f2937', lineHeight: 1 }}>{stat.value}</div>
                            <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginTop: 2 }}>{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Charts Row ────────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 24 }}>

                {/* Meetings Over Time */}
                <div style={{
                    background: '#fff', borderRadius: 16, padding: 20,
                    border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fas fa-chart-bar" style={{ color: '#6366f1' }} /> Meetings Over Time
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140 }}>
                        {monthlyData.map((m, idx) => (
                            <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1' }}>{m.count}</span>
                                <div style={{
                                    width: '100%', maxWidth: 40, borderRadius: 8,
                                    background: `linear-gradient(180deg, #6366f1, #818cf8)`,
                                    height: `${Math.max(8, (m.count / maxMonthCount) * 100)}px`,
                                    transition: 'height 0.6s ease-out',
                                    boxShadow: '0 2px 8px rgba(99,102,241,0.2)',
                                    animationDelay: `${idx * 100}ms`,
                                }} />
                                <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>{m.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sentiment Breakdown */}
                <div style={{
                    background: '#fff', borderRadius: 16, padding: 20,
                    border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fas fa-face-smile" style={{ color: '#10b981' }} /> Sentiment Breakdown
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                        {/* Donut */}
                        <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
                            <svg width="120" height="120" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="50" fill="none" stroke="#f3f4f6" strokeWidth="12" />
                                {sentimentSegments.map(seg => (
                                    <circle
                                        key={seg.key}
                                        cx="60" cy="60" r="50" fill="none"
                                        stroke={seg.color} strokeWidth="12" strokeLinecap="round"
                                        strokeDasharray={`${(seg.pct / 100) * 314} 314`}
                                        strokeDashoffset={`${-(seg.offset / 100) * 314}`}
                                        transform="rotate(-90 60 60)"
                                        style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
                                    />
                                ))}
                            </svg>
                            <div style={{
                                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <span style={{ fontSize: 22, fontWeight: 800, color: '#1f2937' }}>{total}</span>
                                <span style={{ fontSize: 10, color: '#9ca3af' }}>total</span>
                            </div>
                        </div>
                        {/* Legend */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[
                                { label: 'Positive', count: insights.sentimentBreakdown.positive, color: DONUT_COLORS.positive, emoji: '😊' },
                                { label: 'Neutral', count: insights.sentimentBreakdown.neutral, color: DONUT_COLORS.neutral, emoji: '😐' },
                                { label: 'Negative', count: insights.sentimentBreakdown.negative, color: DONUT_COLORS.negative, emoji: '😟' },
                            ].map(s => (
                                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                                    <span style={{ fontSize: 12, color: '#6b7280' }}>{s.emoji} {s.label}</span>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1f2937', marginLeft: 'auto' }}>{s.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Second Row ────────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>

                {/* Top Speakers */}
                <div style={{
                    background: '#fff', borderRadius: 16, padding: 20,
                    border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}>
                    <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fas fa-users" style={{ color: '#a855f7' }} /> Top Speakers
                    </h3>
                    {insights.topSpeakers.length === 0 ? (
                        <p style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>No speaker data yet.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {insights.topSpeakers.slice(0, 6).map((speaker, idx) => {
                                const maxMeetings = insights.topSpeakers[0]?.meetingCount || 1;
                                const color = SPEAKER_COLORS[idx % SPEAKER_COLORS.length];
                                return (
                                    <div key={speaker.speaker}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{
                                                    width: 26, height: 26, borderRadius: 8, background: `${color}18`, color,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 11, fontWeight: 700,
                                                }}>
                                                    {speaker.speaker.charAt(0).toUpperCase()}
                                                </div>
                                                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{speaker.speaker}</span>
                                            </div>
                                            <span style={{ fontSize: 11, color: '#9ca3af' }}>{speaker.meetingCount} meetings</span>
                                        </div>
                                        <div style={{ height: 6, borderRadius: 3, background: '#f3f4f6', overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%', borderRadius: 3,
                                                background: `linear-gradient(90deg, ${color}, ${color}aa)`,
                                                width: `${(speaker.meetingCount / maxMeetings) * 100}%`,
                                                transition: 'width 0.6s ease-out',
                                            }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Weekly Heatmap */}
                <div style={{
                    background: '#fff', borderRadius: 16, padding: 20,
                    border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}>
                    <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fas fa-calendar-week" style={{ color: '#f59e0b' }} /> Busiest Days
                    </h3>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                        {DAY_LABELS.map(day => {
                            const count = dayDistribution[day] || 0;
                            const intensity = count / maxDayCount;
                            const isBusiest = insights.mostProductiveDay.startsWith(day);
                            return (
                                <div key={day} style={{
                                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                                }}>
                                    <div style={{
                                        width: '100%', maxWidth: 48, aspectRatio: '1', borderRadius: 12,
                                        background: count === 0 ? '#f9fafb' : `rgba(99, 102, 241, ${0.1 + intensity * 0.7})`,
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        border: isBusiest ? '2px solid #6366f1' : '1px solid #e5e7eb',
                                        transition: 'all 0.3s',
                                    }}>
                                        <span style={{
                                            fontSize: 16, fontWeight: 800,
                                            color: count === 0 ? '#d1d5db' : intensity > 0.5 ? '#fff' : '#6366f1',
                                        }}>
                                            {count}
                                        </span>
                                    </div>
                                    <span style={{
                                        fontSize: 10, fontWeight: isBusiest ? 800 : 600,
                                        color: isBusiest ? '#6366f1' : '#9ca3af', textTransform: 'uppercase',
                                    }}>
                                        {day}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    {insights.mostProductiveDay !== 'N/A' && (
                        <div style={{
                            marginTop: 14, padding: '8px 14px', borderRadius: 10,
                            background: 'rgba(99,102,241,0.06)', fontSize: 12, color: '#4f46e5',
                            fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                            <i className="fas fa-star" style={{ fontSize: 10 }} />
                            {insights.mostProductiveDay} is your busiest day
                        </div>
                    )}
                </div>
            </div>

            {/* ── Bottom Row ────────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>

                {/* Top Topics */}
                <div style={{
                    background: '#fff', borderRadius: 16, padding: 20,
                    border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}>
                    <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fas fa-hashtag" style={{ color: '#06b6d4' }} /> Top Topics
                    </h3>
                    {insights.topTopics.length === 0 ? (
                        <p style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>No topics detected yet.</p>
                    ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {insights.topTopics.slice(0, 12).map((topic, idx) => {
                                const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#ec4899'];
                                const color = colors[idx % colors.length];
                                return (
                                    <span key={topic.topic} style={{
                                        padding: '6px 12px', borderRadius: 20,
                                        background: `${color}10`, color,
                                        fontSize: 12, fontWeight: 600,
                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                        border: `1px solid ${color}20`,
                                    }}>
                                        {topic.topic}
                                        <span style={{
                                            background: `${color}20`, borderRadius: 8,
                                            padding: '1px 5px', fontSize: 10, fontWeight: 700,
                                        }}>
                                            {topic.frequency}
                                        </span>
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Longest Meeting + Avg Participants */}
                <div style={{
                    background: '#fff', borderRadius: 16, padding: 20,
                    border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}>
                    <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fas fa-trophy" style={{ color: '#f59e0b' }} /> Highlights
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {insights.longestMeeting && (
                            <div style={{
                                padding: '14px 16px', borderRadius: 12,
                                background: 'linear-gradient(135deg, #fef9c3, #fef3c7)',
                                border: '1px solid #fde68a',
                            }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                                    🏆 Longest Meeting
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#78350f' }}>{insights.longestMeeting.title}</div>
                                <div style={{ fontSize: 12, color: '#a16207', marginTop: 2 }}>{insights.longestMeeting.durationMinutes} minutes</div>
                            </div>
                        )}
                        <div style={{
                            padding: '14px 16px', borderRadius: 12, background: '#f9fafb',
                            border: '1px solid #f3f4f6',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                                        Avg Participants
                                    </div>
                                    <div style={{ fontSize: 20, fontWeight: 800, color: '#1f2937' }}>
                                        {insights.averageParticipants.toFixed(1)}
                                    </div>
                                </div>
                                <div style={{
                                    width: 44, height: 44, borderRadius: 12,
                                    background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 12px rgba(168,85,247,0.3)',
                                }}>
                                    <i className="fas fa-user-group" style={{ color: '#fff', fontSize: 16 }} />
                                </div>
                            </div>
                        </div>
                        {insights.topActionItems.length > 0 && (
                            <div style={{
                                padding: '14px 16px', borderRadius: 12, background: '#f9fafb',
                                border: '1px solid #f3f4f6',
                            }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                                    Top Action Items
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {insights.topActionItems.slice(0, 4).map((ai, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                                            <div style={{
                                                width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                                                background: '#10b981', color: '#fff',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 9, fontWeight: 700,
                                            }}>
                                                {ai.frequency}
                                            </div>
                                            <span style={{ color: '#374151', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {ai.item}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
