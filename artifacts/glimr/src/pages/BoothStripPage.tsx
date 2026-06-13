import React, { useState, useRef, useEffect } from 'react';
import { useStudio } from '@/studio/StudioContext';

export default function BoothStripPage() {
  const engine = useStudio();
  const [isRecording, setIsRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      if (engine.stream) {
        engine.stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [engine]);

  const handleStartRecording = async () => {
    try {
      setError(null);
      const stream = await engine.initHardware();
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      engine.record();
      setIsRecording(true);
      setStreamActive(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Engine failed to start: ${msg}`);
    }
  };

  const handleStopRecording = async () => {
    const url = await engine.stopAndSave();
    setIsRecording(false);
    setVideoUrl(url);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 font-sans">
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-blue-500 rounded-full" />
          <h1 className="text-3xl font-extrabold tracking-tight">LensFlow Booth</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1 ml-5">Capture your moment in strip format</p>
      </header>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Preview Area */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden aspect-video flex items-center justify-center">
          {streamActive ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              className="w-full h-full object-cover"
            />
          ) : videoUrl ? (
            <video src={videoUrl} controls className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-3 text-gray-600">
              <div className="w-16 h-16 rounded-full border-2 border-gray-700 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-gray-700" />
              </div>
              <span className="text-sm">Camera preview will appear here</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 space-y-4">
          <div className="flex gap-4">
            {!isRecording ? (
              <button
                onClick={handleStartRecording}
                className="flex-1 bg-green-700 hover:bg-green-600 text-white font-bold py-4 rounded-lg transition-all transform hover:scale-105 active:scale-95"
              >
                Start Capture
              </button>
            ) : (
              <button
                onClick={handleStopRecording}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-lg transition-all animate-pulse"
              >
                Stop and Save
              </button>
            )}
          </div>

          {isRecording && (
            <div className="flex items-center gap-2 text-red-400 text-sm font-mono">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              Recording in progress...
            </div>
          )}

          {videoUrl && !isRecording && (
            <a
              href={videoUrl}
              download="glimr-booth.webm"
              className="block w-full text-center bg-blue-700 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-all"
            >
              Download Strip
            </a>
          )}

          {error && (
            <div className="bg-red-950 border border-red-800 text-red-300 text-sm p-3 rounded-lg font-mono">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
