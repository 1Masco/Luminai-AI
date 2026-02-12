const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * API service for making requests to the backend proxy
 * This keeps the Gemini API key secure on the server side
 */
class APIService {
    private baseURL: string;

    constructor() {
        this.baseURL = API_URL;
    }

    /**
     * Transcribe an audio file using the backend proxy
     */
    async transcribeAudio(audioData: string, mimeType: string, fileName: string) {
        const response = await fetch(`${this.baseURL}/api/gemini/transcribe-audio`, {
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
            const error = await response.json();
            throw new Error(error.error || 'Transcription failed');
        }

        return response.json();
    }

    /**
     * Generate summary from transcript using the backend proxy
     */
    async generateSummary(transcript: string) {
        const response = await fetch(`${this.baseURL}/api/gemini/generate-summary`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ transcript })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Summary generation failed');
        }

        return response.json();
    }

    /**
     * Chat with AI about meeting content using the backend proxy
     */
    async chatWithAI(transcript: string, question: string) {
        const response = await fetch(`${this.baseURL}/api/gemini/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ transcript, question })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Chat request failed');
        }

        return response.json();
    }

    /**
     * Get live transcription session
     * Note: For real-time audio, you'll need to implement WebSocket or Server-Sent Events
     * This is a placeholder for future implementation
     */
    async createLiveSession() {
        // For now, use the direct Gemini API for live sessions
        // In production, you should implement WebSocket streaming through the backend
        console.warn('Live sessions still use direct API - implement WebSocket proxy for production');

        // This will remain using the direct API until WebSocket proxy is implemented
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
            const error = await response.json();
            throw new Error(error.error || 'Failed to connect Google Calendar');
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
            const error = await response.json();
            throw new Error(error.error || 'Failed to connect Outlook Calendar');
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
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch calendar events');
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
            const error = await response.json();
            throw new Error(error.error || 'Failed to disconnect calendar');
        }

        return response.json();
    }
}

export const apiService = new APIService();
export default apiService;
