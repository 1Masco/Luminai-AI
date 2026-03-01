
import React, { useState, useEffect } from 'react';
import { Meeting } from '../types';
import config from '../utils/config';

interface AudioProcessorProps {
  fileOrUrl: File | { name: string, url: string };
  onFinish: (meeting: Meeting) => void;
  onCancel: () => void;
}

const AudioProcessor: React.FC<AudioProcessorProps> = ({ fileOrUrl, onFinish, onCancel }) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Preparing file...");
  const [error, setError] = useState<string | null>(null);
  const API_URL = config.apiUrl;

  useEffect(() => {
    processAudio();
  }, [fileOrUrl]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const getErrorMessage = async (response: Response, fallback: string): Promise<string> => {
    const statusHint = ` (HTTP ${response.status})`;

    let rawBody = '';
    try {
      rawBody = await response.text();
    } catch (_error) {
      return `${fallback}${statusHint}`;
    }

    if (!rawBody) {
      return `${fallback}${statusHint}`;
    }

    try {
      const parsed = JSON.parse(rawBody);
      if (typeof parsed?.error === 'string' && parsed.error.trim()) return parsed.error;
      if (typeof parsed?.message === 'string' && parsed.message.trim()) return parsed.message;
    } catch (_error) {
      // Fall through to text handling.
    }

    const compactBody = rawBody.replace(/\s+/g, ' ').trim();
    if (/<!doctype html>|<html/i.test(compactBody)) {
      return `${fallback}${statusHint}. Check backend URL/server (VITE_API_URL=${API_URL}).`;
    }

    return compactBody || `${fallback}${statusHint}`;
  };

  const processAudio = async () => {
    try {
      setProgress(10);
      let base64Data = "";
      let mimeType = "audio/mpeg";
      let fileName = "Cloud Recording";

      if (fileOrUrl instanceof File) {
        setStatus("Reading local data...");
        base64Data = await fileToBase64(fileOrUrl);
        mimeType = fileOrUrl.type || "audio/mpeg";
        fileName = fileOrUrl.name;
      } else {
        const source = (fileOrUrl as any).source || (fileOrUrl.url.includes('drive') ? 'google_drive' : 'dropbox');
        setStatus(`Fetching from ${source === 'google_drive' ? 'Google Drive' : 'Dropbox'}...`);
        fileName = fileOrUrl.name;

        const cloudResponse = await fetch(`${API_URL}/api/cloud/download`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: fileOrUrl.url,
            source,
            fileName: fileOrUrl.name
          })
        });

        if (!cloudResponse.ok) {
          throw new Error(await getErrorMessage(cloudResponse, 'Failed to download cloud file'));
        }

        const cloudData = await cloudResponse.json();
        base64Data = cloudData.base64Data;
        mimeType = cloudData.mimeType || 'audio/mpeg';
      }

      const isPDF = mimeType === 'application/pdf';

      setProgress(40);
      setStatus(isPDF ? "Extracting text from PDF..." : "Analyzing with AI...");

      // Use backend API proxy for AI processing
      let response;
      if (isPDF) {
        response = await fetch(`${API_URL}/api/ai/process-pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileData: base64Data,
            fileName: fileName
          })
        });
      } else {
        response = await fetch(`${API_URL}/api/ai/transcribe-audio`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audioData: base64Data,
            mimeType: mimeType,
            fileName: fileName
          })
        });
      }

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'AI processing failed'));
      }

      const result = await response.json();

      setProgress(90);
      setStatus("Finalizing meeting report...");

      const newMeeting: Meeting = {
        id: Date.now().toString(),
        title: result.title || fileName.replace(/\.[^/.]+$/, ""),
        date: new Date().toISOString(),
        duration: result.durationSeconds || 60,
        transcript: (result.transcript || []).map((p: any, idx: number) => ({
          id: `t-${idx}`,
          speaker: p.speaker || "Speaker",
          text: p.text || "",
          timestamp: p.timestamp || 0
        })),
        summary: result.summary || "No summary available.",
        actionItems: result.actionItems || [],
        sentiment: result.sentiment || 'neutral'
      };

      setProgress(100);
      setTimeout(() => onFinish(newMeeting), 500);

    } catch (err: any) {
      console.error("Processing Error:", err);
      setError(err.message || "An unexpected error occurred during transcription.");
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-white">
      <div className="max-w-md w-full text-center">
        {!error ? (
          <>
            <div className="mb-8 relative">
              <div className="w-24 h-24 bg-purple-100 text-purple-600 rounded-3xl flex items-center justify-center mx-auto text-4xl animate-pulse shadow-inner">
                <i className="fas fa-file-waveform"></i>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">Lumina is Processing</h2>
            <p className="text-gray-500 mb-8 truncate px-4">{fileOrUrl instanceof File ? fileOrUrl.name : fileOrUrl.name}</p>

            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-4 max-w-sm mx-auto">
              <div className="bg-purple-600 h-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
            </div>

            <p className="text-sm font-medium text-purple-600 animate-pulse">{status}</p>
          </>
        ) : (
          <div className="bg-red-50 p-8 rounded-3xl border border-red-100">
            <i className="fas fa-circle-exclamation text-red-600 text-3xl mb-4"></i>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Processing Failed</h3>
            <p className="text-red-600 mb-6 text-sm">{error}</p>
            <div className="flex gap-3">
              <button onClick={onCancel} className="flex-1 px-6 py-2 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50">Go Back</button>
              <button onClick={() => { setError(null); processAudio(); }} className="flex-1 px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700">Try Again</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioProcessor;
