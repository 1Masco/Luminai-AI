
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Meeting, TranscriptPart } from '../types';

interface RecordingSessionProps {
  onFinish: (meeting: Meeting) => void;
  onCancel: () => void;
}

const RecordingSession: React.FC<RecordingSessionProps> = ({ onFinish, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptPart[]>([]);
  const [currentText, setCurrentText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  // Fix: Use 'any' for timerRef to avoid NodeJS.Timeout namespace issues in browser-only environments
  const timerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Fix: Use refs to track current transcription state and duration inside Live API callbacks 
  // to avoid stale closures and ensure data is captured correctly.
  const currentTextRef = useRef("");
  const durationRef = useRef(0);

  // Initialize recording
  useEffect(() => {
    startSession();
    return () => stopSession();
  }, []);

  const startSession = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsRecording(true);
            const source = audioCtx.createMediaStreamSource(stream);
            const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              // Simple visualization data
              drawVisualizer(inputData);
              
              const pcmBlob = createBlob(inputData);
              // CRITICAL: Solely rely on sessionPromise resolves and then call session.sendRealtimeInput
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioCtx.destination);
            
            // Start timer
            timerRef.current = setInterval(() => {
              setDuration(prev => {
                const next = prev + 1;
                durationRef.current = next;
                return next;
              });
            }, 1000);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Fix: Handle transcriptions using refs to avoid stale state in the callback closure
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              if (text) {
                currentTextRef.current += " " + text;
                setCurrentText(currentTextRef.current);
              }
            }
            
            if (message.serverContent?.turnComplete) {
              const textToSave = currentTextRef.current.trim();
              if (textToSave.length > 0) {
                const newPart: TranscriptPart = {
                  id: Date.now().toString(),
                  speaker: "Speaker 1",
                  text: textToSave,
                  timestamp: durationRef.current
                };
                setTranscript(prev => [...prev, newPart]);
              }
              currentTextRef.current = "";
              setCurrentText("");
            }
          },
          onerror: (e) => {
            console.error("Gemini Live Error:", e);
            setError("Connectivity error with AI server. Please check your internet.");
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          systemInstruction: "You are a transcription assistant. Transcribe everything you hear as accurately as possible. Use standard punctuation."
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      console.error(err);
      setError("Could not access microphone or connect to AI service.");
    }
  };

  const stopSession = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    setIsRecording(false);
  };

  const createBlob = (data: Float32Array) => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      // The supported audio MIME type is 'audio/pcm'.
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const drawVisualizer = (data: Float32Array) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#3b82f6';
    ctx.beginPath();

    const sliceWidth = canvas.width / data.length;
    let x = 0;

    for (let i = 0; i < data.length; i++) {
      const v = data[i] * 100;
      const y = (canvas.height / 2) + v;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);

      x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  };

  const handleFinish = () => {
    stopSession();
    // Final text push - capture the latest state from refs to ensure accuracy
    const finalPart: TranscriptPart = {
      id: "final",
      speaker: "Speaker 1",
      text: currentTextRef.current.trim(),
      timestamp: durationRef.current
    };
    
    const meeting: Meeting = {
      id: Date.now().toString(),
      title: `Recording ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      date: new Date().toISOString(),
      duration: durationRef.current,
      transcript: finalPart.text ? [...transcript, finalPart] : transcript,
    };
    onFinish(meeting);
  };

  const formatTime = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <span className="font-bold text-gray-900">Live Recording</span>
          <span className="text-gray-500 font-mono">{formatTime(duration)}</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleFinish}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all shadow-md"
          >
            Done
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-hidden">
        {error ? (
          <div className="text-center p-8 bg-red-50 text-red-600 rounded-2xl max-w-md">
            <i className="fas fa-triangle-exclamation text-3xl mb-4"></i>
            <h2 className="text-xl font-bold mb-2">Recording Error</h2>
            <p className="mb-6">{error}</p>
            <button onClick={() => window.location.reload()} className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold">Retry</button>
          </div>
        ) : (
          <div className="w-full max-w-4xl h-full flex flex-col">
            <div className="flex-1 overflow-y-auto mb-8 space-y-6 scrollbar-hide pr-4">
              {transcript.map((p, idx) => (
                <div key={p.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <p className="text-xs font-bold text-blue-600 uppercase mb-1">{p.speaker} • {formatTime(p.timestamp)}</p>
                  <p className="text-gray-800 text-lg leading-relaxed">{p.text}</p>
                </div>
              ))}
              {currentText && (
                <div className="opacity-50">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">Speaker 1 • {formatTime(duration)}</p>
                  <p className="text-gray-800 text-lg leading-relaxed italic">{currentText}...</p>
                </div>
              )}
              {transcript.length === 0 && !currentText && (
                <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-50">
                  <i className="fas fa-wave-square text-6xl mb-4"></i>
                  <p className="text-xl">Waiting for audio...</p>
                </div>
              )}
            </div>

            <div className="h-24 relative bg-gray-50 rounded-2xl overflow-hidden mb-4 border border-gray-100">
              <canvas ref={canvasRef} width={800} height={100} className="w-full h-full" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Audio Input Stream</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-8 border-t border-gray-100 flex justify-center gap-12 bg-gray-50/50">
         <button className="flex flex-col items-center gap-2 group">
           <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-gray-200 shadow-sm group-hover:scale-110 transition-transform">
             <i className="fas fa-image text-gray-400 group-hover:text-blue-500"></i>
           </div>
           <span className="text-[10px] font-bold uppercase text-gray-500">Capture</span>
         </button>
         <button className="flex flex-col items-center gap-2 group">
           <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-gray-200 shadow-sm group-hover:scale-110 transition-transform">
             <i className="fas fa-highlighter text-gray-400 group-hover:text-yellow-500"></i>
           </div>
           <span className="text-[10px] font-bold uppercase text-gray-500">Highlight</span>
         </button>
         <button className="flex flex-col items-center gap-2 group">
           <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-gray-200 shadow-sm group-hover:scale-110 transition-transform">
             <i className="fas fa-comment-dots text-gray-400 group-hover:text-purple-500"></i>
           </div>
           <span className="text-[10px] font-bold uppercase text-gray-500">Comment</span>
         </button>
      </div>
    </div>
  );
};

export default RecordingSession;
