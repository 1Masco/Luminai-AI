import React, { useEffect, useRef, useState } from 'react';
import { Meeting, TranscriptPart } from '../types';

interface RecordingSessionProps {
  onFinish: (meeting: Meeting) => void;
  onCancel: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const RecordingSession: React.FC<RecordingSessionProps> = ({ onFinish, onCancel }) => {
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
      audioContextRef.current.close().catch(() => {});
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
    ctx.strokeStyle = '#2563eb';
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
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

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 p-6">
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${isProcessing ? 'bg-amber-500' : 'bg-red-500'} animate-pulse`} />
          <span className="font-bold text-gray-900">{isProcessing ? 'Processing Recording' : 'Live Recording'}</span>
          <span className="font-mono text-gray-500">{formatTime(duration)}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            disabled={isProcessing}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleFinish}
            disabled={!isRecording || isProcessing}
            className="rounded-lg bg-blue-600 px-6 py-2 font-bold text-white shadow-md transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Done'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center overflow-hidden p-8">
        {error ? (
          <div className="max-w-md rounded-2xl bg-red-50 p-8 text-center text-red-600">
            <i className="fas fa-triangle-exclamation mb-4 text-3xl" />
            <h2 className="mb-2 text-xl font-bold">Recording Error</h2>
            <p className="mb-6">{error}</p>
            <button onClick={() => window.location.reload()} className="rounded-lg bg-red-600 px-6 py-2 font-bold text-white">
              Retry
            </button>
          </div>
        ) : (
          <div className="flex h-full w-full max-w-4xl flex-col">
            <div className="mb-8 flex-1 overflow-y-auto pr-4">
              <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-70">
                <i className={`fas ${isProcessing ? 'fa-spinner fa-spin' : 'fa-wave-square'} mb-4 text-6xl`} />
                <p className="text-xl text-gray-500">{status}</p>
              </div>
            </div>

            <div className="relative mb-4 h-24 overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
              <canvas ref={canvasRef} width={800} height={100} className="h-full w-full" />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Audio Input Stream</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordingSession;
