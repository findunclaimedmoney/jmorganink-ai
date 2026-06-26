import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { usePageSEO } from "@/hooks/use-page-seo";

const BASE = import.meta.env.BASE_URL;

interface Teaser {
  name: string;
  amount: string;
  holder: string | null;
  state: string | null;
  feePct: number;
  feeStr: string;
}

interface Report {
  steps: string[];
  officialUrl: string;
  dataSource: string;
  preparedAt: string;
  supportEmail: string;
}

interface ClaimData {
  paid: boolean;
  teaser: Teaser;
  report?: Report;
}

function renderStep(step: string, idx: number) {
  const parts = step.split(/\*\*(.+?)\*\*/g);
  return (
    <li key={idx} className="flex gap-4 items-start">
      <span className="shrink-0 w-7 h-7 rounded-full bg-[#f5b942] text-black font-bold text-sm flex items-center justify-center mt-0.5">
        {idx + 1}
      </span>
      <span className="text-white/80 leading-relaxed">
        {parts.map((p, i) =>
          i % 2 === 1 ? <strong key={i} className="text-white font-semibold">{p}</strong> : p
        )}
      </span>
    </li>
  );
}

export default function ClaimReport() {
  usePageSEO({
    title: "Your Claim Report — MissingCash",
    description: "Your personalised unclaimed money claim report with step-by-step instructions.",
  });

  const search = useSearch();
  const params = new URLSearchParams(search);
  const pid = params.get("pid");
  const sessionId = params.get("session_id");

  const [data, setData] = useState<ClaimData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!pid) { setError("Invalid link — no record ID found."); setLoading(false); return; }
    const url = `${BASE}api/claim-report?pid=${pid}${sessionId ? `&session_id=${encodeURIComponent(sessionId)}` : ""}`;
    fetch(url)
      .then(async (r) => {
        if (!r.ok) { setError("Record not found. This link may be invalid or expired."); setLoading(false); return; }
        const d = await r.json() as ClaimData;
        setData(d); setLoading(false);
      })
      .catch(() => { setError("Could not load your report. Please email support@missingcash.com.au."); setLoading(false); });
  }, [pid, sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#061826] flex items-center justify-center">
        <div className="text-white/40 animate-pulse text-lg">Loading your report…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#061826] flex items-center justify-center px-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-md text-center">
          <p className="text-red-400 text-sm">{error || "Something went wrong."}</p>
          <a href="/" className="mt-4 inline-block text-[#f5b942] text-sm underline">← Back to MissingCash</a>
        </div>
      </div>
    );
  }

  const { teaser, paid, report } = data;

  return (
    <div className="min-h-screen bg-[#061826] py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center">
          <a href="/" className="text-[#f5b942] font-bold text-xl tracking-tight">MissingCash</a>
          <p className="text-white/40 text-xs mt-1">ABN 52 347 989 391</p>
        </div>

        {/* Money found card */}
        <div className="bg-[#0f2233] border border-[#f5b942]/30 rounded-2xl p-6 text-center">
          <p className="text-white/50 text-sm mb-1">Found in your name on the national register</p>
          <p className="text-[#f5b942] font-bold text-5xl mb-2">{teaser.amount}</p>
          {teaser.holder && (
            <p className="text-white/60 text-sm">Held by <span className="text-white font-medium">{teaser.holder}</span>{teaser.state ? ` · ${teaser.state}` : ""}</p>
          )}
          <p className="text-white/30 text-xs mt-3">Source: ASIC MoneySmart public unclaimed money register</p>
        </div>

        {/* Paid — full report */}
        {paid && report ? (
          <div className="space-y-5">
            <div className="bg-[#0a1f30] border border-green-500/30 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="text-white font-semibold">Payment confirmed — your claim report is ready</p>
                  <p className="text-white/40 text-xs">A copy has also been emailed to you</p>
                </div>
              </div>
              <h2 className="text-[#f5b942] font-bold text-lg mb-4">Step-by-step claim instructions</h2>
              <ol className="space-y-4">
                {report.steps.map((step, i) => renderStep(step, i))}
              </ol>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-sm text-white/50 space-y-1">
              <p>📋 <span className="text-white/70">Data source:</span> <a href={report.officialUrl} target="_blank" rel="noopener noreferrer" className="text-[#f5b942] underline">{report.officialUrl}</a></p>
              <p>📅 <span className="text-white/70">Report prepared:</span> {new Date(report.preparedAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</p>
              <p>📧 <span className="text-white/70">Questions?</span> Email <a href={`mailto:${report.supportEmail}`} className="text-[#f5b942]">{report.supportEmail}</a></p>
            </div>

            <div className="bg-[#f5b942]/10 border border-[#f5b942]/20 rounded-xl p-4 text-sm">
              <p className="text-[#f5b942] font-semibold mb-1">💡 Tip</p>
              <p className="text-white/60">Save or screenshot this page. You can also ask <strong className="text-white">Mia</strong> on the main site if you need help with any of these steps — she knows the full claim process.</p>
            </div>
          </div>
        ) : (
          /* Not paid — teaser with lock */
          <div className="space-y-4">
            <div className="bg-[#0a1f30] border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">🔒</span>
                <h2 className="text-white font-semibold">Your personalised claim report</h2>
              </div>
              <p className="text-white/50 text-sm mb-5">Unlock your step-by-step instructions to claim this money. Includes the exact form, the direct link, what ID you need, and how long it takes.</p>

              {/* Blurred preview of what's inside */}
              <div className="relative rounded-xl overflow-hidden mb-5">
                <div className="blur-sm pointer-events-none select-none space-y-3 p-4 bg-white/5 border border-white/5 rounded-xl">
                  {["Go to the official ASIC register and search your name", "Locate your record and click the Claim button", "Submit your identity documents — driver's licence, passport, or Medicare card", "ASIC contacts the holder on your behalf", "Funds are released to your nominated bank account", "Typical processing time: 4 to 8 weeks"].map((s, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-[#f5b942]/40 text-black/40 font-bold text-xs flex items-center justify-center">{i + 1}</span>
                      <span className="text-white/40 text-sm">{s}</span>
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-transparent via-[#0a1f30]/60 to-[#0a1f30]">
                  <div className="text-center">
                    <div className="text-3xl mb-2">🔒</div>
                    <p className="text-white font-semibold text-sm">Unlock to see all {6} steps</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#061826] rounded-xl p-4 mb-5 border border-white/5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/50">Claim report fee</span>
                  <span className="text-white font-bold">{teaser.feeStr} <span className="text-white/30 font-normal">({teaser.feePct}% of {teaser.amount})</span></span>
                </div>
                <p className="text-white/30 text-xs mt-2">One-time fee. Includes everything you need to claim your {teaser.amount}.</p>
              </div>

              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("mia:open", { detail: { message: `I'd like to unlock my claim report for ${teaser.amount} held by ${teaser.holder ?? "an Australian register"}`, autoSend: true } }));
                }}
                className="w-full bg-[#f5b942] text-black font-bold py-4 rounded-xl hover:bg-[#f5b942]/90 transition-colors text-base"
              >
                ⚡ Unlock My Claim Report — {teaser.feeStr}
              </button>
              <p className="text-center text-white/30 text-xs mt-3">Opens Mia to complete your payment securely via Stripe</p>
            </div>

            <div className="text-center text-white/30 text-xs">
              <p>Money found on: ASIC MoneySmart public register · <a href="https://moneysmart.gov.au/find-unclaimed-money" target="_blank" rel="noopener noreferrer" className="underline">Verify listing</a></p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
