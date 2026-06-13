import React, { useState } from 'react';
import { useStudio } from '@/studio/StudioContext';

export default function StudioPage() {
  const engine = useStudio();

  const [script, setScript] = useState('');
  const [is4KEnabled, setIs4KEnabled] = useState(false);
  const [systemLogs, setSystemLogs] = useState<string[]>(['System Initialized']);
  const [recordingStatus, setRecordingStatus] = useState<'IDLE' | 'RECORDING' | 'ERROR'>('IDLE');

  const addLog = (msg: string) =>
    setSystemLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 5));

  const handleRewrite = () => {
    addLog('Initiating AI Ghostwriter...');
    setTimeout(() => addLog('Ghostwriter process complete.'), 800);
  };

  const handleRecordToggle = async () => {
    try {
      if (recordingStatus === 'IDLE') {
        addLog('Hardware warming up...');
        await engine.initHardware(
          is4KEnabled
            ? { video: { width: 3840, height: 2160 }, audio: true }
            : { video: true, audio: true }
        );
        engine.record();
        setRecordingStatus('RECORDING');
        addLog('Engine: RECORDING started.');
      } else {
        const videoUrl = await engine.stopAndSave();
        setRecordingStatus('IDLE');
        addLog(`Engine: RECORDING saved. Asset: ${videoUrl.substring(0, 28)}...`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`CRITICAL: ${msg}`);
      setRecordingStatus('ERROR');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 font-sans">
      <header className="mb-10">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-orange-500 rounded-full" />
          <h1 className="text-4xl font-extrabold tracking-tight">Glimr Infrastructure</h1>
        </div>
        <div className="text-sm text-gray-500 mt-2 ml-5">v2.0.4 | Engine: Active | Studio Mode</div>
      </header>

      {/* ScriptLens AI Ghostwriter */}
      <section className="bg-gray-900 p-6 rounded-xl border border-gray-800 mb-8 shadow-2xl">
        <h2 className="text-xl font-semibold mb-4 text-orange-400">ScriptLens™ AI Ghostwriter</h2>
        <textarea
          className="w-full h-40 bg-black border border-gray-700 rounded-lg p-4 mb-4 text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all resize-none"
          placeholder="Pour your heart out..."
          value={script}
          onChange={(e) => setScript(e.target.value)}
        />
        <button
          onClick={handleRewrite}
          className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 active:scale-95"
        >
          Magic Rewrite
        </button>
      </section>

      {/* Active Infrastructure */}
      <section className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-2xl">
        <h2 className="text-xl font-semibold mb-6 text-blue-400">Active Infrastructure</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Time-Lock Control */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-400">Time-Lock™ Configuration</label>
            <input
              type="text"
              className="bg-black border border-gray-700 p-3 rounded-lg w-full text-white focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="dd/mm/yyyy --:--"
            />
            <button className="bg-blue-700 hover:bg-blue-600 w-full py-3 rounded-lg font-bold transition-all">
              Secure Lock
            </button>
          </div>

          {/* Booth Premium Controls */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-400">Booth System Override</label>
            <div className="flex items-center space-x-3 bg-black p-4 rounded-lg border border-gray-800">
              <input
                type="checkbox"
                checked={is4KEnabled}
                onChange={() => setIs4KEnabled(!is4KEnabled)}
                className="w-5 h-5 accent-blue-500"
              />
              <span>Enable 4K Ultra Strips</span>
            </div>
            <button
              onClick={handleRecordToggle}
              className={`w-full py-3 rounded-lg font-bold transition-all transform hover:scale-105 active:scale-95 ${
                recordingStatus === 'RECORDING'
                  ? 'bg-red-600 hover:bg-red-500 animate-pulse'
                  : recordingStatus === 'ERROR'
                  ? 'bg-yellow-700 hover:bg-yellow-600'
                  : 'bg-green-700 hover:bg-green-600'
              }`}
            >
              {recordingStatus === 'RECORDING'
                ? 'Stop Engine'
                : recordingStatus === 'ERROR'
                ? 'Retry Capture'
                : 'Initiate Capture'}
            </button>
          </div>
        </div>

        {/* System Logs */}
        <div className="mt-8 bg-black p-4 rounded border border-gray-800 font-mono text-xs text-green-500">
          <h4 className="mb-2 border-b border-gray-800 pb-2 text-green-400 font-bold">
            System Diagnostics
          </h4>
          {systemLogs.map((log, i) => (
            <div key={i} style={{ opacity: 1 - i * 0.15 }} className="leading-6">
              {log}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
