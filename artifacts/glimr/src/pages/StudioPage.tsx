import React, { useState } from 'react';
import { Link } from 'wouter';
import { useStudio } from '@/studio/StudioContext';
import StudioControlPanel from '@/components/StudioControlPanel';

const MOMENTS = [
  {
    href: '/features/magic-recap',
    label: 'Magic Recap',
    moment: 'So they feel it even with the sound off.',
    desc: 'Every Glimr auto-generates a memory card — beautiful enough to screenshot and keep forever.',
  },
  {
    href: '/features/time-lock',
    label: 'Time-Lock',
    moment: 'The first thing they see when they wake up.',
    desc: "Set your Glimr to unlock at midnight on their birthday. No peeking.",
  },
  {
    href: '/features/drop-ins',
    label: 'Drop-Ins',
    moment: 'Make the strip feel like theirs.',
    desc: 'Add a portrait into your Booth frame. Editorial, cinematic, or 3D — your choice.',
  },
  {
    href: '/features/filter-mode',
    label: 'Filter Mode',
    moment: 'Because how it looks changes how it feels.',
    desc: 'Noir. Cinema. Vivid. Colour-grade your recording before you hit stop.',
  },
  {
    href: '/features/sms-delivery',
    label: 'SMS Delivery',
    moment: 'Land in their inbox like a letter, not a link.',
    desc: 'Rich iMessage preview — thumbnail, your name, tap to open. No app needed.',
  },
  {
    href: '/features/booth-premium',
    label: 'Booth Premium',
    moment: 'The strip they actually frame.',
    desc: '4 frames. Your theme. Your QR code. Printed or downloaded — it\'s a keepsake.',
  },
];

export default function StudioPage() {
  const engine = useStudio();
  const [script, setScript] = useState('');
  const [systemLogs, setSystemLogs] = useState<string[]>([]);
  const [recordingStatus, setRecordingStatus] = useState<'IDLE' | 'RECORDING' | 'ERROR'>('IDLE');
  const [is4K, setIs4K] = useState(false);

  const addLog = (msg: string) =>
    setSystemLogs((prev) => [`${msg}`, ...prev].slice(0, 4));

  const handleRecordToggle = async () => {
    try {
      if (recordingStatus === 'IDLE') {
        await engine.initHardware(is4K ? { video: { width: 3840, height: 2160 }, audio: true } : { video: true, audio: true });
        engine.record();
        setRecordingStatus('RECORDING');
        addLog('Recording started');
      } else {
        const url = await engine.stopAndSave();
        setRecordingStatus('IDLE');
        addLog('Saved — ready to share');
        void url;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`Could not access camera: ${msg}`);
      setRecordingStatus('ERROR');
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0b09] text-white font-sans">

      {/* Hero */}
      <section className="relative px-8 pt-20 pb-16 max-w-5xl mx-auto">
        <div className="mb-3 flex items-center gap-3">
          <div className="h-px w-8 bg-orange-500" />
          <span className="text-[11px] tracking-[3px] text-orange-500 uppercase">Memory Studio</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.08] mb-6 max-w-3xl">
          The studio for moments<br />
          <span className="text-orange-400">worth keeping.</span>
        </h1>
        <p className="text-[#8a8070] text-lg max-w-xl leading-relaxed mb-10">
          Glimr is where you record the things you need to get right — the birthday message, 
          the farewell, the proposal, the apology. Then makes sure it lands exactly as you meant it.
        </p>
        <div className="flex gap-4">
          <Link href="/teleprompter">
            <button className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-xl transition-colors">
              Open Teleprompter
            </button>
          </Link>
          <Link href="/booth">
            <button className="px-6 py-3 border border-[#2a2820] text-[#8a8070] hover:text-white hover:border-[#4a4840] text-sm font-semibold rounded-xl transition-colors">
              Booth Mode
            </button>
          </Link>
        </div>
      </section>

      {/* Divider */}
      <div className="h-px bg-[#1c1a16] mx-8" />

      {/* Quick record — the core action */}
      <section className="px-8 py-14 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Script */}
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-1">Write your words first.</h2>
              <p className="text-[#6a6055] text-sm leading-relaxed">
                The best Glimrs are the ones where you knew exactly what you wanted to say. 
                Write it out. Read it back. Then record it.
              </p>
            </div>
            <textarea
              className="w-full h-44 bg-[#0a0906] border border-[#1e1c18] rounded-xl px-4 py-3.5 text-white text-sm leading-relaxed outline-none focus:border-orange-600/50 transition-colors resize-none placeholder-[#3a3830]"
              placeholder="What do you want them to remember?"
              value={script}
              onChange={(e) => setScript(e.target.value)}
            />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={is4K}
                  onChange={() => setIs4K(!is4K)}
                  className="accent-orange-500 w-4 h-4"
                />
                <span className="text-xs text-[#5a5850]">4K quality</span>
              </label>
            </div>
          </div>

          {/* Record */}
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-1">Then say it.</h2>
              <p className="text-[#6a6055] text-sm leading-relaxed">
                One take or ten — the engine holds the stream until you decide it's right. 
                Stop when you mean it.
              </p>
            </div>

            <button
              onClick={handleRecordToggle}
              className={`w-full py-5 rounded-xl font-bold text-base tracking-wide transition-all ${
                recordingStatus === 'RECORDING'
                  ? 'bg-red-700 hover:bg-red-600 text-white'
                  : recordingStatus === 'ERROR'
                  ? 'bg-[#1a1815] border border-[#2a2820] text-[#6a6055] hover:border-orange-700'
                  : 'bg-orange-600 hover:bg-orange-500 text-white'
              }`}
            >
              {recordingStatus === 'RECORDING'
                ? 'Stop — Save this take'
                : recordingStatus === 'ERROR'
                ? 'Try again'
                : 'Record a Glimr'}
            </button>

            {/* Live log */}
            {systemLogs.length > 0 && (
              <div className="space-y-1">
                {systemLogs.map((log, i) => (
                  <p
                    key={i}
                    style={{ opacity: Math.max(0.25, 1 - i * 0.28) }}
                    className="text-xs text-[#5a5850] font-mono"
                  >
                    {log}
                  </p>
                ))}
              </div>
            )}

            {recordingStatus === 'RECORDING' && (
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-red-400 font-mono tracking-widest">Recording</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="h-px bg-[#1c1a16] mx-8" />

      {/* Studio Control Panel */}
      <section className="px-8 py-10 max-w-5xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold tracking-tight mb-1">Studio controls.</h2>
          <p className="text-[#6a6055] text-sm">Camera, filters, and engine state — all in one place.</p>
        </div>
        <StudioControlPanel />
      </section>

      {/* Divider */}
      <div className="h-px bg-[#1c1a16] mx-8" />

      {/* Feature moments */}
      <section className="px-8 py-16 max-w-5xl mx-auto">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px w-8 bg-orange-500" />
            <span className="text-[11px] tracking-[3px] text-orange-500 uppercase">Every feature has a purpose</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Built around real moments.</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MOMENTS.map((m) => (
            <Link key={m.href} href={m.href}>
              <div className="group h-full bg-[#110f0c] border border-[#1e1c18] rounded-2xl p-6 flex flex-col gap-3 hover:border-orange-600/40 hover:bg-[#141210] transition-all cursor-pointer">
                <div className="text-[10px] tracking-[2px] text-[#4a4840] uppercase font-semibold">
                  {m.label}
                </div>
                <h3 className="text-white font-semibold text-base leading-snug">{m.moment}</h3>
                <p className="text-[#5a5850] text-sm leading-relaxed flex-1">{m.desc}</p>
                <span className="text-[11px] text-orange-600 group-hover:text-orange-400 transition-colors font-medium">
                  Open →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Bottom statement */}
      <section className="px-8 pb-20 max-w-5xl mx-auto">
        <div className="bg-[#110f0c] border border-[#1e1c18] rounded-2xl p-10 text-center">
          <p className="text-[#4a4840] text-[11px] tracking-[3px] uppercase mb-4">Why Glimr exists</p>
          <blockquote className="text-2xl md:text-3xl font-bold text-white leading-tight max-w-2xl mx-auto">
            "Because some things shouldn't be said over a text message."
          </blockquote>
          <p className="text-[#5a5850] mt-5 max-w-lg mx-auto text-sm leading-relaxed">
            Glimr is the gap between a voice note and a video production. 
            Human enough to feel real. Professional enough to last.
          </p>
        </div>
      </section>

    </div>
  );
}
