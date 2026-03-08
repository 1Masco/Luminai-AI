import React, { useState } from 'react';
import { FollowUpData, TranscriptPart } from '../types';
import apiService from '../utils/apiService';

interface FollowUpPanelProps {
    transcript: TranscriptPart[];
    meetingTitle: string;
    followUp?: FollowUpData | null;
    onFollowUpGenerated?: (data: FollowUpData) => void;
}

const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    high: { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', label: 'High' },
    medium: { bg: 'rgba(245,158,11,0.1)', text: '#f59e0b', label: 'Medium' },
    low: { bg: 'rgba(16,185,129,0.1)', text: '#10b981', label: 'Low' },
};

const ASSIGNEE_COLORS = [
    '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#ec4899',
];

const getAssigneeColor = (name: string) =>
    ASSIGNEE_COLORS[name.charCodeAt(0) % ASSIGNEE_COLORS.length];

const FollowUpPanel: React.FC<FollowUpPanelProps> = ({
    transcript,
    meetingTitle,
    followUp: initial,
    onFollowUpGenerated,
}) => {
    const [followUp, setFollowUp] = useState<FollowUpData | null>(initial || null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [emailCopied, setEmailCopied] = useState(false);
    const [editedEmail, setEditedEmail] = useState('');

    const generate = async () => {
        if (transcript.length === 0) {
            setError('No transcript available.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const result = await apiService.generateFollowUp(transcript, meetingTitle);
            setFollowUp(result);
            setEditedEmail(result.followUpEmail?.body || '');
            onFollowUpGenerated?.(result);
        } catch (err: any) {
            setError(err.message || 'Failed to generate follow-up.');
        } finally {
            setLoading(false);
        }
    };

    const copyEmail = () => {
        if (!followUp) return;
        const text = `Subject: ${followUp.followUpEmail.subject}\n\n${editedEmail || followUp.followUpEmail.body}`;
        navigator.clipboard.writeText(text).then(() => {
            setEmailCopied(true);
            setTimeout(() => setEmailCopied(false), 2000);
        });
    };

    // Initial state — show generate button
    if (!followUp) {
        return (
            <div style={{
                background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb',
                padding: 28, marginTop: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                    }}>
                        <i className="fas fa-paper-plane" style={{ color: '#fff', fontSize: 16 }} />
                    </div>
                    <div>
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1f2937' }}>Smart Follow-Up</h4>
                        <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>Auto-assigned actions, deadlines, and email draft</p>
                    </div>
                </div>
                {error && (
                    <div style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: 12, marginBottom: 12 }}>
                        {error}
                    </div>
                )}
                <button
                    onClick={generate}
                    disabled={loading}
                    style={{
                        width: '100%', padding: '11px 0', borderRadius: 12, border: 'none',
                        background: loading ? '#d1d5db' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: loading ? 'none' : '0 4px 16px rgba(99,102,241,0.3)',
                        transition: 'all 0.2s',
                    }}
                >
                    {loading ? (
                        <><i className="fas fa-spinner fa-spin" /> Generating...</>
                    ) : (
                        <><i className="fas fa-wand-magic-sparkles" /> Generate Follow-Up</>
                    )}
                </button>
            </div>
        );
    }

    // Results view
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>

            {/* ── Assigned Actions ──────────────────────────────────────── */}
            <div style={{
                background: '#fff', borderRadius: 16, padding: 20,
                border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
                <h4 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="fas fa-list-check" style={{ color: '#6366f1' }} />
                    Assigned Actions
                    <span style={{ fontSize: 11, fontWeight: 600, background: '#eef2ff', color: '#6366f1', padding: '2px 8px', borderRadius: 6 }}>
                        {followUp.assignedActions.length}
                    </span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {followUp.assignedActions.length === 0 ? (
                        <p style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>No action items detected in this meeting.</p>
                    ) : (
                        followUp.assignedActions.map((action, idx) => {
                            const priority = PRIORITY_STYLES[action.priority] || PRIORITY_STYLES.medium;
                            const color = getAssigneeColor(action.assignee);
                            return (
                                <div key={idx} style={{
                                    display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 12,
                                    background: '#fafafa', border: '1px solid #f3f4f6',
                                    alignItems: 'flex-start', transition: 'box-shadow 0.2s',
                                }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                                        background: `${color}18`, color,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 13, fontWeight: 700,
                                    }}>
                                        {action.assignee.charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937', marginBottom: 4, lineHeight: 1.4 }}>
                                            {action.task}
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                                            <span style={{
                                                fontSize: 11, fontWeight: 600, color,
                                                background: `${color}12`, padding: '2px 8px', borderRadius: 6,
                                            }}>
                                                <i className="fas fa-user" style={{ fontSize: 9, marginRight: 4 }} />
                                                {action.assignee}
                                            </span>
                                            {action.deadline && action.deadline !== 'none' && (
                                                <span style={{
                                                    fontSize: 11, fontWeight: 600, color: '#f59e0b',
                                                    background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: 6,
                                                }}>
                                                    <i className="fas fa-clock" style={{ fontSize: 9, marginRight: 4 }} />
                                                    {action.deadline}
                                                </span>
                                            )}
                                            <span style={{
                                                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                                                color: priority.text, background: priority.bg,
                                                padding: '2px 7px', borderRadius: 5, letterSpacing: '0.05em',
                                            }}>
                                                {priority.label}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ── Key Decisions ──────────────────────────────────────────── */}
            {followUp.keyDecisions.length > 0 && (
                <div style={{
                    background: '#fff', borderRadius: 16, padding: 20,
                    border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}>
                    <h4 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fas fa-gavel" style={{ color: '#10b981' }} /> Key Decisions
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {followUp.keyDecisions.map((decision, idx) => (
                            <div key={idx} style={{
                                display: 'flex', gap: 10, alignItems: 'flex-start',
                                padding: '10px 12px', borderRadius: 10, background: 'rgba(16,185,129,0.04)',
                            }}>
                                <div style={{
                                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: '#10b981', color: '#fff', fontSize: 10, fontWeight: 700,
                                }}>
                                    ✓
                                </div>
                                <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{decision}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Deadlines Detected ─────────────────────────────────────── */}
            {followUp.deadlinesDetected.length > 0 && (
                <div style={{
                    background: '#fff', borderRadius: 16, padding: 20,
                    border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}>
                    <h4 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fas fa-calendar-check" style={{ color: '#f59e0b' }} /> Deadlines Detected
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {followUp.deadlinesDetected.map((dl, idx) => (
                            <div key={idx} style={{
                                display: 'flex', gap: 10, alignItems: 'center',
                                padding: '8px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.05)',
                                borderLeft: '3px solid #f59e0b',
                            }}>
                                <div style={{ flex: 1 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>{dl.text}</span>
                                    <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 8 }}>— {dl.speaker}</span>
                                    {dl.context && (
                                        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#6b7280', fontStyle: 'italic', lineHeight: 1.4 }}>
                                            "...{dl.context}..."
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Follow-Up Email ────────────────────────────────────────── */}
            <div style={{
                background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', borderRadius: 16, padding: 20,
                border: '1px solid #bae6fd',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0c4a6e', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="fas fa-envelope" style={{ color: '#0284c7' }} /> Follow-Up Email
                    </h4>
                    <button
                        onClick={copyEmail}
                        style={{
                            padding: '5px 12px', borderRadius: 8, border: 'none',
                            background: emailCopied ? '#10b981' : '#0284c7', color: '#fff',
                            fontSize: 11, fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 5,
                            transition: 'background 0.2s',
                        }}
                    >
                        <i className={`fas ${emailCopied ? 'fa-check' : 'fa-copy'}`} />
                        {emailCopied ? 'Copied!' : 'Copy'}
                    </button>
                </div>
                <div style={{
                    padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.7)',
                    marginBottom: 10,
                }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Subject</span>
                    <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600, color: '#0c4a6e' }}>
                        {followUp.followUpEmail.subject}
                    </p>
                </div>
                <textarea
                    value={editedEmail || followUp.followUpEmail.body}
                    onChange={(e) => setEditedEmail(e.target.value)}
                    style={{
                        width: '100%', minHeight: 160, borderRadius: 10, border: '1px solid #bae6fd',
                        padding: '12px 14px', fontSize: 13, lineHeight: 1.6, color: '#1e293b',
                        background: 'rgba(255,255,255,0.8)', resize: 'vertical',
                        fontFamily: 'inherit',
                    }}
                />
            </div>

            {/* ── Re-generate button ─────────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, paddingTop: 4 }}>
                <button
                    onClick={generate}
                    disabled={loading}
                    style={{
                        padding: '8px 20px', borderRadius: 10, border: '1px solid #e5e7eb',
                        background: '#fff', color: '#6b7280', fontSize: 13, fontWeight: 500,
                        cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                        transition: 'all 0.2s',
                    }}
                >
                    <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-arrows-rotate'}`} />
                    {loading ? 'Regenerating...' : 'Regenerate'}
                </button>
                {followUp.generatedAt && (
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>
                        Generated: {new Date(followUp.generatedAt).toLocaleTimeString()}
                    </span>
                )}
            </div>
        </div>
    );
};

export default FollowUpPanel;
