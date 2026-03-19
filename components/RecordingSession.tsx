import React, { useEffect, useRef, useState } from 'react';
import { Meeting, TranscriptPart } from '../types';
import config from '../utils/config';
import { useSettings } from '../contexts/SettingsContext';

interface RecordingSessionProps {
  onFinish: (meeting: Meeting) => void;
  onCancel: () => void;
  meetingTitle?: string;
}

const API_URL = config.apiUrl;

const RecordingSession: React.FC<RecordingSessionProps> = ({ onFinish, onCancel, meetingTitle }) => {
  const { settings, getAudioBitrate } = useSettings();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState('Preparing microphone...');
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingMimeTypeRef = useRef('audio/webm');
  const mountedRef = useRef(true);
  const shouldProcessOnStopRef = useRef(false);

  useEffect(() => {
    startRecordingSession();
    return () => {
      mountedRef.current = false;
      shouldProcessOnStopRef.current = false;
      stopMediaResources();
    };
  }, []);

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        resolve((result.split(',')[1] || '').trim());
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const stopMediaResources = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => { });
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    mediaRecorderRef.current = null;
    analyserRef.current = null;
  };

  const drawVisualizer = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;

    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const buffer = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(buffer);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#6366f1';
    ctx.beginPath();

    const sliceWidth = canvas.width / buffer.length;
    let x = 0;

    for (let i = 0; i < buffer.length; i += 1) {
      const v = buffer[i] / 128.0;
      const y = (v * canvas.height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    animationRef.current = requestAnimationFrame(drawVisualizer);
  };

  const startRecordingSession = async () => {
    try {
      setStatus('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: settings.noiseSuppression,
          echoCancellation: true,
          autoGainControl: true,
        }
      });
      streamRef.current = stream;

      const bitrate = getAudioBitrate();
      const recorderOptions: MediaRecorderOptions = {};
      if (bitrate) recorderOptions.audioBitsPerSecond = bitrate;
      const recorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recordingMimeTypeRef.current = recorder.mimeType || 'audio/webm';

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const shouldProcess = shouldProcessOnStopRef.current;
        stopMediaResources();
        setIsRecording(false);
        if (shouldProcess && mountedRef.current) {
          void processRecording();
        }
      };

      recorder.start(1000);
      setIsRecording(true);
      setStatus('Recording in progress...');

      timerRef.current = window.setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      drawVisualizer();
    } catch (err) {
      console.error(err);
      setError('Could not access microphone. Please allow microphone permissions and try again.');
      setStatus('Microphone unavailable');
    }
  };

  const processRecording = async () => {
    try {
      setStatus('Uploading recording for transcription...');

      const mimeType = recordingMimeTypeRef.current || 'audio/webm';
      const audioBlob = new Blob(chunksRef.current, { type: mimeType });
      if (!audioBlob.size) {
        throw new Error('No audio was captured.');
      }

      const audioData = await blobToBase64(audioBlob);
      const fileName = `recording-${Date.now()}.webm`;

      const response = await fetch(`${API_URL}/api/ai/transcribe-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioData,
          mimeType,
          fileName,
          enableDiarization: settings.speakerDiarization,
          detectLanguage: settings.autoDetectLanguage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Transcription failed');
      }

      const result = await response.json();
      const transcript: TranscriptPart[] = Array.isArray(result.transcript)
        ? result.transcript.map((part: any, idx: number) => ({
          id: `t-${idx}`,
          speaker: part?.speaker || 'Speaker 1',
          text: part?.text || '',
          timestamp: Number.isFinite(part?.timestamp) ? part.timestamp : idx * 5,
        }))
        : [];

      const meeting: Meeting = {
        id: Date.now().toString(),
        title:
          meetingTitle ||
          result.title ||
          `Recording ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}`,
        date: new Date().toISOString(),
        duration: result.durationSeconds || duration,
        transcript,
        summary: result.summary || 'No summary available.',
        actionItems: Array.isArray(result.actionItems) ? result.actionItems : [],
        sentiment: result.sentiment || 'neutral',
      };

      onFinish(meeting);
    } catch (err: any) {
      console.error('Recording processing error:', err);
      setError(err.message || 'Failed to process recording.');
      setIsProcessing(false);
      setStatus('Processing failed');
    }
  };

  const handleFinish = () => {
    if (isProcessing) return;
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'recording') {
      setError('No active recording found.');
      return;
    }

    setIsProcessing(true);
    setStatus('Finalizing recording...');
    shouldProcessOnStopRef.current = true;
    recorder.stop();
  };

  const handleCancel = () => {
    shouldProcessOnStopRef.current = false;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    } else {
      stopMediaResources();
    }
    onCancel();
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? `${hrs}:` : ''}${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const isFinishDisabled = !isRecording || isProcessing;

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--card-bg)' }}>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={`h-3.5 w-3.5 rounded-full ${isProcessing ? 'bg-amber-500' : 'bg-red-500'}`} />
            {!isProcessing && <div className="absolute inset-0 h-3.5 w-3.5 rounded-full bg-red-500 animate-pulse-ring" />}
          </div>
          <div>
            <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{isProcessing ? 'Processing Recording' : 'Live Recording'}</span>
            <span className="font-mono ml-3 text-sm tabular-nums" style={{ color: 'var(--text-secondary)' }}>{formatTime(duration)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            disabled={isProcessing}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--hover-bg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            Cancel
          </button>
          <button
            onClick={handleFinish}
            disabled={isFinishDisabled}
            className={`rounded-xl px-7 py-2.5 font-bold transition-all ${isFinishDisabled
              ? ''
              : 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-500/25 hover:from-brand-700 hover:to-brand-600 hover:shadow-brand-500/40 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            style={isFinishDisabled
              ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)', border: '1px solid var(--border-secondary)' }
              : {}}
          >
            {isProcessing ? 'Processing...' : 'Finish & Transcribe'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center overflow-hidden p-8">
        {error ? (
          <div className="max-w-md rounded-3xl p-10 text-center text-red-600 animate-scale-in" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid rgba(248,113,113,0.4)' }}>
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <i className="fas fa-triangle-exclamation text-2xl" />
            </div>
            <h2 className="mb-2 text-xl font-bold">Recording Error</h2>
            <p className="mb-6 text-sm text-red-400">{error}</p>
            <button onClick={() => window.location.reload()} className="rounded-xl bg-red-600 px-6 py-2.5 font-bold text-white hover:bg-red-700 transition-colors">
              Retry
            </button>
          </div>
        ) : (
          <div className="flex h-full w-full max-w-4xl flex-col">
            <div className="mb-8 flex-1 overflow-y-auto pr-4">
              <div className="h-full flex flex-col items-center justify-center">
                <div className="relative">
                  <i className={`fas ${isProcessing ? 'fa-spinner fa-spin' : 'fa-wave-square'} mb-5 text-7xl text-brand-400`} />
                  {!isProcessing && <div className="absolute inset-0 flex items-center justify-center"><div className="w-20 h-20 border-2 border-brand-400/30 rounded-full animate-pulse-ring"></div></div>}
                </div>
                <p className="text-xl font-medium" style={{ color: 'var(--text-primary)' }}>{status}</p>
                {meetingTitle && <p className="text-sm text-brand-300 mt-2 font-semibold">{meetingTitle}</p>}
              </div>
            </div>

            <div className="relative mb-4 h-28 overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--card-bg)' }}>
              <canvas ref={canvasRef} width={800} height={100} className="h-full w-full" />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <p className="text-[9px] font-bold uppercase tracking-[0.25em]" style={{ color: 'var(--text-tertiary)' }}>Audio Input Stream</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordingSession;
