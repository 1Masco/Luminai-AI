import config from './config';

const API_URL = config.apiUrl;

/**
 * API service for making requests to the backend proxy
 * This keeps the OpenAI API key secure on the server side
 */
class APIService {
    private baseURL: string;

    constructor() {
        this.baseURL = API_URL;
    }

    private async getErrorMessage(response: Response, fallback: string): Promise<string> {
        const statusHint = ` (HTTP ${response.status})`;

        let rawBody = '';
        try {
            rawBody = await response.text();
        } catch (error) {
            return `${fallback}${statusHint}`;
        }

        if (!rawBody) {
            return `${fallback}${statusHint}`;
        }

        try {
            const parsed = JSON.parse(rawBody);
            if (typeof parsed?.error === 'string' && parsed.error.trim()) return parsed.error;
            if (typeof parsed?.message === 'string' && parsed.message.trim()) return parsed.message;
        } catch (error) {
            // Fall through to text handling.
        }

        const compactBody = rawBody.replace(/\s+/g, ' ').trim();
        if (/<!doctype html>|<html/i.test(compactBody)) {
            return `${fallback}${statusHint}. Check backend URL/server (VITE_API_URL=${this.baseURL}).`;
        }

        return compactBody || `${fallback}${statusHint}`;
    }

    /**
     * Transcribe an audio file using the backend proxy
     */
    async transcribeAudio(audioData: string, mimeType: string, fileName: string) {
        const response = await fetch(`${this.baseURL}/api/ai/transcribe-audio`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                audioData,
                mimeType,
                fileName
            })
        });

        if (!response.ok) {
            throw new Error(await this.getErrorMessage(response, 'Transcription failed'));
        }

        return response.json();
    }

    /**
     * Generate summary from transcript using the backend proxy
     */
    async generateSummary(transcript: string) {
        const response = await fetch(`${this.baseURL}/api/ai/generate-summary`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ transcript })
        });

        if (!response.ok) {
            throw new Error(await this.getErrorMessage(response, 'Summary generation failed'));
        }

        return response.json();
    }

    /**
     * Chat with AI about meeting content using the backend proxy
     */
    async chatWithAI(transcript: string, question: string) {
        const response = await fetch(`${this.baseURL}/api/ai/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ transcript, question })
        });

        if (!response.ok) {
            throw new Error(await this.getErrorMessage(response, 'Chat request failed'));
        }

        return response.json();
    }

    /**
     * Get live transcription session
     * Note: For real-time audio, you'll need to implement WebSocket or Server-Sent Events
     * This is a placeholder for future implementation
     */
    async createLiveSession() {
        // For now, use backend transcription after recording completes
        // In production, you should implement WebSocket streaming through the backend
        console.warn('Live streaming is not implemented yet - use post-recording transcription');
        return null;
    }

    /**
     * Check if the backend server is running
     */
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseURL}/health`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * Initiate Google Calendar OAuth flow
     */
    async connectGoogleCalendar(token: string) {
        const response = await fetch(`${this.baseURL}/api/calendar/connect/google`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(await this.getErrorMessage(response, 'Failed to connect Google Calendar'));
        }

        return response.json();
    }

    /**
     * Initiate Outlook Calendar OAuth flow
     */
    async connectOutlookCalendar(token: string) {
        const response = await fetch(`${this.baseURL}/api/calendar/connect/outlook`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(await this.getErrorMessage(response, 'Failed to connect Outlook Calendar'));
        }

        return response.json();
    }

    /**
     * Fetch calendar events from connected calendars
     */
    async getCalendarEvents(token: string) {
        const response = await fetch(`${this.baseURL}/api/calendar/events`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(await this.getErrorMessage(response, 'Failed to fetch calendar events'));
        }

        return response.json();
    }

    /**
     * Disconnect a calendar provider
     */
    async disconnectCalendar(token: string, provider: 'google' | 'outlook') {
        const response = await fetch(`${this.baseURL}/api/calendar/disconnect/${provider}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(await this.getErrorMessage(response, 'Failed to disconnect calendar'));
        }

        return response.json();
    }

    // =============================================
    // SHARING METHODS
    // =============================================

    /**
     * Get meetings shared with the current user
     */
    async getSharedWithMe(token: string) {
        const response = await fetch(`${this.baseURL}/api/sharing/shared-with-me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(await this.getErrorMessage(response, 'Failed to fetch shared meetings'));
        }

        return response.json();
    }

    /**
     * Share a meeting with another user by email
     */
    async shareMeeting(token: string, meetingId: string, email: string, permission: string = 'view') {
        const response = await fetch(`${this.baseURL}/api/sharing/share`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ meetingId, email, permission })
        });

        if (!response.ok) {
            throw new Error(await this.getErrorMessage(response, 'Failed to share meeting'));
        }

        return response.json();
    }

    /**
     * Remove a share
     */
    async unshareMeeting(token: string, shareId: string) {
        const response = await fetch(`${this.baseURL}/api/sharing/unshare/${shareId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(await this.getErrorMessage(response, 'Failed to remove share'));
        }

        return response.json();
    }

    /**
     * Mark a shared meeting as viewed
     */
    async markSharedViewed(token: string, shareId: string) {
        const response = await fetch(`${this.baseURL}/api/sharing/mark-viewed/${shareId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(await this.getErrorMessage(response, 'Failed to mark as viewed'));
        }

        return response.json();
    }

    // =============================================
    // MEETING COACH / ANALYTICS
    // =============================================

    /**
     * Analyze a meeting transcript with AI Meeting Coach
     * Returns talk-time, filler words, pace, sentiment, health score, and tips
     */
    async analyzeMeeting(transcript: Array<{ speaker: string; text: string; timestamp: number; id?: string }>, duration?: number) {
        const response = await fetch(`${this.baseURL}/api/ai/analyze-meeting`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ transcript, duration: duration || 0 })
        });

        if (!response.ok) {
            throw new Error(await this.getErrorMessage(response, 'Meeting analysis failed'));
        }

        return response.json();
    }

    /**
     * Generate smart follow-up: assigned actions, deadlines, key decisions, and email draft
     */
    async generateFollowUp(transcript: Array<{ speaker: string; text: string; timestamp: number; id?: string }>, title?: string) {
        const response = await fetch(`${this.baseURL}/api/ai/generate-follow-up`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ transcript, title: title || 'Meeting' })
        });

        if (!response.ok) {
            throw new Error(await this.getErrorMessage(response, 'Follow-up generation failed'));
        }

        return response.json();
    }

    // =============================================
    // MULTI-LANGUAGE TRANSLATION
    // =============================================

    /**
     * Translate a meeting transcript to a target language
     */
    async translateMeeting(meetingId: string, languageCode: string, languageName: string, transcript: string, summary: string) {
        const response = await fetch(`${this.baseURL}/api/ai/translate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ meetingId, languageCode, languageName, transcript, summary })
        });

        if (!response.ok) {
            throw new Error(await this.getErrorMessage(response, 'Translation failed'));
        }

        return response.json();
    }

    /**
     * Get existing translations for a meeting
     */
    async getTranslations(meetingId: string) {
        const response = await fetch(`${this.baseURL}/api/ai/translations/${meetingId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(await this.getErrorMessage(response, 'Failed to fetch translations'));
        }

        return response.json();
    }

    // =============================================
    // AI CHAT WITH MEETINGS
    // =============================================

    /**
     * Cross-meeting AI chat — semantic search across all meetings
     */
    async crossMeetingChat(
        question: string,
        meetings: Array<{ id: string; title: string; date: string; summary: string; transcript: string; actionItems: string[] }>,
        conversationId?: string,
        history?: Array<{ role: string; content: string }>
    ) {
        const response = await fetch(`${this.baseURL}/api/ai/cross-meeting-chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, meetings, conversationId, history })
        });

        if (!response.ok) {
            throw new Error(await this.getErrorMessage(response, 'AI chat failed'));
        }

        return response.json();
    }

    /**
     * Get chat conversations list
     */
    async getChatConversations() {
        const response = await fetch(`${this.baseURL}/api/ai/chat-conversations`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(await this.getErrorMessage(response, 'Failed to fetch conversations'));
        }

        return response.json();
    }

    /**
     * Get messages for a conversation
     */
    async getChatMessages(conversationId: string) {
        const response = await fetch(`${this.baseURL}/api/ai/chat-conversations/${conversationId}/messages`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(await this.getErrorMessage(response, 'Failed to fetch messages'));
        }

        return response.json();
    }

    // =============================================
    // VOICE MEMOS
    // =============================================

    /**
     * Get all voice memos
     */
    async getVoiceMemos() {
        const response = await fetch(`${this.baseURL}/api/ai/voice-memos`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(await this.getErrorMessage(response, 'Failed to fetch voice memos'));
        }

        return response.json();
    }

    /**
     * Save a new voice memo
     */
    async saveVoiceMemo(memo: any) {
        const response = await fetch(`${this.baseURL}/api/ai/voice-memos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(memo)
        });

        if (!response.ok) {
            throw new Error(await this.getErrorMessage(response, 'Failed to save voice memo'));
        }

        return response.json();
    }

    /**
     * Update a voice memo
     */
    async updateVoiceMemo(id: string, memo: any) {
        const response = await fetch(`${this.baseURL}/api/ai/voice-memos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(memo)
        });

        if (!response.ok) {
            throw new Error(await this.getErrorMessage(response, 'Failed to update voice memo'));
        }

        return response.json();
    }

    /**
     * Delete a voice memo
     */
    async deleteVoiceMemo(id: string) {
        const response = await fetch(`${this.baseURL}/api/ai/voice-memos/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(await this.getErrorMessage(response, 'Failed to delete voice memo'));
        }

        return response.json();
    }

    /**
     * AI categorize a voice memo transcription
     */
    async categorizeMemo(transcription: string, meetings: Array<{ id: string; title: string }>) {
        const response = await fetch(`${this.baseURL}/api/ai/categorize-memo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcription, meetings })
        });

        if (!response.ok) {
            throw new Error(await this.getErrorMessage(response, 'Failed to categorize memo'));
        }

        return response.json();
    }

    // =============================================
    // SMART MEETING PREP
    // =============================================

    /**
     * Generate a meeting prep brief
     */
    async generateMeetingPrep(
        meetingTitle: string,
        relatedMeetings: Array<{ id: string; title: string; date: string; summary: string; actionItems: string[]; transcript: string }>
    ) {
        const response = await fetch(`${this.baseURL}/api/ai/meeting-prep`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ meetingTitle, relatedMeetings })
        });

        if (!response.ok) {
            throw new Error(await this.getErrorMessage(response, 'Failed to generate meeting prep'));
        }

        return response.json();
    }

    /**
     * Get saved meeting prep briefs
     */
    async getMeetingPrepBriefs() {
        const response = await fetch(`${this.baseURL}/api/ai/meeting-prep`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(await this.getErrorMessage(response, 'Failed to fetch prep briefs'));
        }

        return response.json();
    }

    /**
     * Delete a meeting prep brief
     */
    async deleteMeetingPrepBrief(id: string) {
        const response = await fetch(`${this.baseURL}/api/ai/meeting-prep/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(await this.getErrorMessage(response, 'Failed to delete prep brief'));
        }

        return response.json();
    }

    // =============================================
    // CUSTOM AI TEMPLATES
    // =============================================

    /**
     * Get all AI templates (user's own + shared + system)
     */
    async getAITemplates() {
        const response = await fetch(`${this.baseURL}/api/ai/templates`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(await this.getErrorMessage(response, 'Failed to fetch templates'));
        }

        return response.json();
    }

    /**
     * Create a new AI template
     */
    async createAITemplate(template: any) {
        const response = await fetch(`${this.baseURL}/api/ai/templates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(template)
        });

        if (!response.ok) {
            throw new Error(await this.getErrorMessage(response, 'Failed to create template'));
        }

        return response.json();
    }

    /**
     * Update an AI template
     */
    async updateAITemplate(id: string, template: any) {
        const response = await fetch(`${this.baseURL}/api/ai/templates/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(template)
        });

        if (!response.ok) {
            throw new Error(await this.getErrorMessage(response, 'Failed to update template'));
        }

        return response.json();
    }

    /**
     * Delete an AI template
     */
    async deleteAITemplate(id: string) {
        const response = await fetch(`${this.baseURL}/api/ai/templates/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(await this.getErrorMessage(response, 'Failed to delete template'));
        }

        return response.json();
    }

    /**
     * Generate summary with a custom template
     */
    async generateWithTemplate(transcript: string, templatePrompt: string, outputFormat: string) {
        const response = await fetch(`${this.baseURL}/api/ai/generate-with-template`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript, templatePrompt, outputFormat })
        });

        if (!response.ok) {
            throw new Error(await this.getErrorMessage(response, 'Template generation failed'));
        }

        return response.json();
    }
}

export const apiService = new APIService();
export default apiService;
