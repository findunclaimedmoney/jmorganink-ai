import React, { useState } from 'react';

interface Feature {
  icon: string;
  release: string;
  category: string;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: '✦',
    release: 'CHRISTMAS 2026',
    category: 'AI SUBTITLES + MEMORY CARDS',
    title: 'Magic Recap',
    description:
      'Every Glimr you send auto-generates a beautiful text recap and shareable memory card — so the feeling lands even with the sound off.',
  },
  {
    icon: '🔒',
    release: 'CHRISTMAS 2026',
    category: 'OPEN AT THE RIGHT MOMENT',
    title: 'Birthday Time-Lock™',
    description:
      "Set your Glimr to unlock at midnight on their birthday. No peeking. The moment they wake up, your face is the first thing they see.",
  },
  {
    icon: '☆',
    release: 'Q1 2027',
    category: 'LICENSED ICONS IN YOUR BOOTH',
    title: 'Celebrity Drop-Ins',
    description:
      'Drop a licensed cartoon icon, sports hero or music star into your Booth strip. Real partnerships — no shady deepfakes.',
  },
  {
    icon: '🎁',
    release: 'Q1 2027',
    category: 'REAL-TIME FACE MAPPING',
    title: 'Live Cartoon Mode',
    description:
      'Become a fox, panda or astronaut while you record. Your face, their world. Real-time AI character mapping in your browser.',
  },
  {
    icon: '🔔',
    release: 'CHRISTMAS 2026',
    category: 'LAND IN THEIR INBOX, BEAUTIFULLY',
    title: 'SMS + iMessage Delivery',
    description:
      "Send the Glimr link as a rich SMS preview — with thumbnail, sender card, and 'tap to open' built right in.",
  },
  {
    icon: '☆',
    release: 'CHRISTMAS 2026',
    category: '4K STRIPS · BRANDED · DOWNLOADABLE',
    title: 'Booth Premium',
    description:
      'Get 4K composite strips, no Glimr footer, custom theme uploads, and a personal QR card for every participant. From $4 per Booth.',
  },
];

function FeatureCard({ feature }: { feature: Feature }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [waitlist] = useState(0);

  const handleNotify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  };

  return (
    <div className="bg-[#1c1a17] border border-[#2e2b25] rounded-2xl p-6 flex flex-col gap-4 hover:border-[#3e3a30] transition-colors">
      {/* Top row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-orange-400 text-base">{feature.icon}</span>
          <span className="text-orange-400 text-xs font-bold tracking-widest uppercase">
            {feature.release}
          </span>
        </div>
        <span className="text-[#5a5548] text-xs font-mono">{waitlist} on waitlist</span>
      </div>

      {/* Category */}
      <p className="text-[#6b6456] text-[10px] uppercase tracking-widest font-semibold">
        {feature.category}
      </p>

      {/* Title */}
      <h2 className="text-white text-2xl font-bold leading-tight">{feature.title}</h2>

      {/* Description */}
      <p className="text-[#9a9080] text-sm leading-relaxed flex-1">{feature.description}</p>

      {/* Email signup */}
      {submitted ? (
        <div className="text-orange-400 text-sm font-semibold py-3 text-center border border-orange-900 rounded-xl bg-orange-950/30">
          You're on the list ✓
        </div>
      ) : (
        <form onSubmit={handleNotify} className="flex gap-2 mt-1">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="flex-1 min-w-0 bg-[#13120f] border border-[#2e2b25] rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#4a4540] outline-none focus:border-orange-600 transition-colors"
          />
          <button
            type="submit"
            className="bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all whitespace-nowrap"
          >
            Notify me
          </button>
        </form>
      )}
    </div>
  );
}

export default function SoonPage() {
  return (
    <div className="min-h-screen bg-[#111009] text-white">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <header className="mb-12 text-center">
          <p className="text-orange-400 text-xs font-bold tracking-widest uppercase mb-3">
            Coming Soon
          </p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            What's next for Glimr
          </h1>
          <p className="text-[#7a7060] text-base max-w-lg mx-auto">
            Join the waitlist for the features you want most. We'll notify you the moment they drop.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>

        <footer className="mt-16 text-center text-[#3a3530] text-xs">
          Made with Glimr · glimr.com.au
        </footer>
      </div>
    </div>
  );
}
