import React, { useState } from 'react';
import { MeetingAnalytics, TranscriptPart } from '../types';
import apiService from '../utils/apiService';

interface MeetingCoachProps {
    transcript: TranscriptPart[];
    duration: number;
    analytics?: MeetingAnalytics | null;
    onAnalyticsGenerated?: (analytics: MeetingAnalytics) => void;
}

const SPEAKER_COLORS = [
    { bg: 'rgba(99, 102, 241, 0.15)', bar: '#6366f1', text: '#6366f1' },
    { bg: 'rgba(16, 185, 129, 0.15)', bar: '#10b981', text: '#10b981' },
    { bg: 'rgba(245, 158, 11, 0.15)', bar: '#f59e0b', text: '#f59e0b' },
    { bg: 'rgba(239, 68, 68, 0.15)', bar: '#ef4444', text: '#ef4444' },
    { bg: 'rgba(168, 85, 247, 0.15)', bar: '#a855f7', text: '#a855f7' },
    { bg: 'rgba(6, 182, 212, 0.15)', bar: '#06b6d4', text: '#06b6d4' },
];

const getSentimentEmoji = (s: string) =>
    s === 'positive' ? '😊' : s === 'negative' ? '😟' : '😐';

const getSentimentColor = (s: string) =>
    s === 'positive' ? '#10b981' : s === 'negative' ? '#ef4444' : '#6b7280';

const getPaceIcon = (r: string) =>
    r === 'slow' ? '🐢' : r === 'fast' ? '🐇' : '👍';

const getHealthColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
};

const getHealthLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Needs Improvement';
    return 'Poor';
};

const MeetingCoach: React.FC<MeetingCoachProps> = ({
    transcript,
    duration,
    analytics: initialAnalytics,
    onAnalyticsGenerated,
}) => {
    const [analytics, setAnalytics] = useState<MeetingAnalytics | null>(initialAnalytics || null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const runAnalysis = async () => {
        if (transcript.length === 0) {
            setError('No transcript available to analyze.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const result = await apiService.analyzeMeeting(transcript, duration);
            setAnalytics(result);
            onAnalyticsGenerated?.(result);
        } catch (err: any) {
            setError(err.message || 'Analysis failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // If no analytics yet, show the analyze button
    if (!analytics) {
        return (
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '48px 24px', textAlign: 'center', minHeight: 300,
            }}>
                <div style={{
                    width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', marginBottom: 20,
                    boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)',
                }}>
                    <i className="fas fa-brain" style={{ fontSize: 32, color: '#fff' }} />
                </div>
                <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#1f2937' }}>AI Meeting Coach</h3>
                <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: 14, maxWidth: 380 }}>
                    Analyze your meeting for talk-time balance, filler words, speaking pace, sentiment, and get personalized coaching tips.
                </p>
                {error && (
                    <div style={{
                        padding: '10px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)',
                        color: '#ef4444', fontSize: 13, marginBottom: 16, maxWidth: 360,
                    }}>
                        {error}
                    </div>
                )}
                <button
                    onClick={runAnalysis}
                    disabled={loading}
                    style={{
                        padding: '12px 32px', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                        background: loading ? '#d1d5db' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: '#fff', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
                        boxShadow: loading ? 'none' : '0 4px 16px rgba(99, 102, 241, 0.35)',
                        transition: 'all 0.2s',
                    }}
                >
                    {loading ? (
                        <>
                            <i className="fas fa-spinner fa-spin" />
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <i className="fas fa-wand-magic-sparkles" />
                            Analyze Meeting
                        </>
                    )}
                </button>
            </div>
        );
    }

    const speakers = Object.keys(analytics.talkTime);
    const getSpeakerColor = (idx: number) => SPEAKER_COLORS[idx % SPEAKER_COLORS.length];

    return (
        <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── Health Score Card ──────────────────────────────────────────── */}
            <div style={{
                background: 'linear-gradient(135deg, #1e1b4b, #312e81)', borderRadius: 16,
                padding: 24, color: '#fff', position: 'relative', overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute', top: -40, right: -40, width: 160, height: 160,
                    borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
                }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                    {/* Score Circle */}
                    <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
                        <svg width="100" height="100" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
                            <circle
                                cx="50" cy="50" r="42" fill="none"
                                stroke={getHealthColor(analytics.healthScore)}
                                strokeWidth="8" strokeLinecap="round"
                                strokeDasharray={`${(analytics.healthScore / 100) * 264} 264`}
                                transform="rotate(-90 50 50)"
                                style={{ transition: 'stroke-dasharray 1s ease-out' }}
                            />
                        </svg>
                        <div style={{
                            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <span style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{analytics.healthScore}</span>
                            <span style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>/ 100</span>
                        </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 180 }}>
                        <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>Meeting Health</h3>
                        <span style={{
                            display: 'inline-block', padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                            background: `${getHealthColor(analytics.healthScore)}22`,
                            color: getHealthColor(analytics.healthScore),
                        }}>
                            {getHealthLabel(analytics.healthScore)}
                        </span>
                        <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                            {[
                                { label: 'Balance', score: analytics.healthFactors.balanceScore, icon: '⚖️' },
                                { label: 'Pace', score: analytics.healthFactors.paceScore, icon: '🎯' },
                                { label: 'Fillers', score: analytics.healthFactors.fillerWordScore, icon: '💬' },
                                { label: 'Sentiment', score: analytics.healthFactors.sentimentScore, icon: '❤️' },
                            ].map(f => (
                                <div key={f.label} style={{
                                    textAlign: 'center', minWidth: 52,
                                }}>
                                    <span style={{ fontSize: 14 }}>{f.icon}</span>
                                    <div style={{ fontSize: 14, fontWeight: 700 }}>{f.score}</div>
                                    <div style={{ fontSize: 10, opacity: 0.6 }}>{f.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Talk-Time Distribution ────────────────────────────────────── */}
            <div style={{
                background: '#fff', borderRadius: 14, padding: 20,
                border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
                <h4 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="fas fa-chart-bar" style={{ color: '#6366f1' }} /> Talk-Time Distribution
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {speakers.map((speaker, idx) => {
                        const data = analytics.talkTime[speaker];
                        const color = getSpeakerColor(idx);
                        return (
                            <div key={speaker}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: color.text }}>{speaker}</span>
                                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                                        {data.percentage}% · {Math.round(data.seconds / 60)}m {data.seconds % 60}s · {data.wordCount} words
                                    </span>
                                </div>
                                <div style={{ height: 10, borderRadius: 5, background: '#f3f4f6', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%', borderRadius: 5, background: `linear-gradient(90deg, ${color.bar}, ${color.bar}cc)`,
                                        width: `${data.percentage}%`, transition: 'width 0.8s ease-out',
                                        boxShadow: `0 0 8px ${color.bar}40`,
                                    }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Speaking Pace & Sentiment (side by side on desktop) ────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>

                {/* Speaking Pace */}
                <div style={{
                    background: '#fff', borderRadius: 14, padding: 20,
                    border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}>
                    <h4 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fas fa-gauge-high" style={{ color: '#f59e0b' }} /> Speaking Pace
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {speakers.map((speaker, idx) => {
                            const pace = analytics.speakingPace[speaker];
                            const color = getSpeakerColor(idx);
                            return (
                                <div key={speaker} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '8px 12px', borderRadius: 10, background: color.bg,
                                }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: color.text }}>{speaker}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: '#1f2937' }}>{pace.wordsPerMinute}</span>
                                        <span style={{ fontSize: 11, color: '#6b7280' }}>WPM</span>
                                        <span style={{ fontSize: 16 }}>{getPaceIcon(pace.rating)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Speaker Sentiment */}
                <div style={{
                    background: '#fff', borderRadius: 14, padding: 20,
                    border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}>
                    <h4 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fas fa-face-smile" style={{ color: '#10b981' }} /> Speaker Sentiment
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {speakers.map((speaker, idx) => {
                            const sentiment = analytics.speakerSentiment[speaker] || 'neutral';
                            const color = getSpeakerColor(idx);
                            return (
                                <div key={speaker} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '8px 12px', borderRadius: 10, background: color.bg,
                                }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: color.text }}>{speaker}</span>
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                        padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                                        background: `${getSentimentColor(sentiment)}15`,
                                        color: getSentimentColor(sentiment),
                                    }}>
                                        {getSentimentEmoji(sentiment)} {sentiment}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Filler Words ──────────────────────────────────────────────── */}
            <div style={{
                background: '#fff', borderRadius: 14, padding: 20,
                border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
                <h4 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="fas fa-comment-dots" style={{ color: '#a855f7' }} /> Filler Words
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {speakers.map((speaker, idx) => {
                        const fillers = analytics.fillerWords[speaker];
                        const color = getSpeakerColor(idx);
                        const entries = Object.entries(fillers).filter(([k]) => k !== 'total').sort((a, b) => (b[1] as number) - (a[1] as number));
                        return (
                            <div key={speaker}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: color.text }}>{speaker}</span>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                                        background: fillers.total > 10 ? 'rgba(239,68,68,0.1)' : fillers.total > 5 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                                        color: fillers.total > 10 ? '#ef4444' : fillers.total > 5 ? '#f59e0b' : '#10b981',
                                    }}>
                                        {fillers.total} total
                                    </span>
                                </div>
                                {entries.length > 0 ? (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {entries.map(([word, count]) => (
                                            <span key={word} style={{
                                                padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                                                background: '#f3f4f6', color: '#4b5563',
                                            }}>
                                                "{word}" × {count as number}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span style={{ fontSize: 12, color: '#10b981', fontStyle: 'italic' }}>✨ No filler words detected!</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Coach Tips ────────────────────────────────────────────────── */}
            {analytics.coachTips.length > 0 && (
                <div style={{
                    background: 'linear-gradient(135deg, #fefce8, #fef9c3)', borderRadius: 14, padding: 20,
                    border: '1px solid #fde68a',
                }}>
                    <h4 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fas fa-lightbulb" style={{ color: '#f59e0b' }} /> Coach Tips
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {analytics.coachTips.map((tip, idx) => (
                            <div key={idx} style={{
                                display: 'flex', gap: 10, alignItems: 'flex-start',
                                padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.6)',
                            }}>
                                <span style={{
                                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: '#f59e0b', color: '#fff', fontSize: 11, fontWeight: 700,
                                }}>
                                    {idx + 1}
                                </span>
                                <span style={{ fontSize: 13, color: '#78350f', lineHeight: 1.5 }}>{tip}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Re-analyze button ─────────────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
                <button
                    onClick={runAnalysis}
                    disabled={loading}
                    style={{
                        padding: '8px 20px', borderRadius: 10, border: '1px solid #e5e7eb',
                        background: '#fff', color: '#6b7280', fontSize: 13, fontWeight: 500,
                        cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                        transition: 'all 0.2s',
                    }}
                >
                    <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-arrows-rotate'}`} />
                    {loading ? 'Re-analyzing...' : 'Re-analyze'}
                </button>
                {analytics.analyzedAt && (
                    <span style={{ fontSize: 11, color: '#9ca3af', alignSelf: 'center', marginLeft: 12 }}>
                        Last analyzed: {new Date(analytics.analyzedAt).toLocaleTimeString()}
                    </span>
                )}
            </div>
        </div>
    );
};

export default MeetingCoach;
