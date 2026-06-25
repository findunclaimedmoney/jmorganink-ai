import { useState, useEffect, useRef } from "react";
import { usePageSEO } from "@/hooks/use-page-seo";
import { Button } from "@/components/ui/button";
import { Zap, Loader2, CheckCircle2, XCircle, Lock, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SearchResult {
  status: string;
  totalAmountCents: number;
  feeCents: number;
  feePercent: number;
  matchCount: number;
  teaserMatches: { name: string; holder: string; state: string; amount: string; source?: string }[];
  email: string;
  firstName: string;
}

const SEARCHING_STEPS = [
  "Connecting to MoneySmart database…",
  "Searching ASIC unclaimed money register…",
  "Checking ATO lost super records…",
  "Scanning state revenue office registers…",
  "Checking Computershare & Link share registries…",
  "Searching Fair Work unpaid wages…",
  "Cross-referencing all state databases…",
  "Compiling your results…",
];

function fmt(cents: number) {
  return (cents / 100).toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

export default function MiaSearchResults() {
  usePageSEO({
    title: "Mia Is Searching… | MissingCash",
    description: "Mia is searching Australian unclaimed money databases for your name.",
  });

  const params = new URLSearchParams(window.location.search);
  const searchId = params.get("id");

  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!searchId) {
      setError("Invalid search link. Please start a new search.");
      return;
    }

    stepRef.current = setInterval(() => {
      setStepIndex((i) => (i + 1) % SEARCHING_STEPS.length);
    }, 2800);

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/mia/search/${searchId}`);
        const data = await res.json() as SearchResult & { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Failed to fetch results");

        if (data.status === "found" || data.status === "not_found" || data.status === "error") {
          setResult(data);
          if (pollRef.current) clearInterval(pollRef.current);
          if (stepRef.current) clearInterval(stepRef.current);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch results");
        if (pollRef.current) clearInterval(pollRef.current);
        if (stepRef.current) clearInterval(stepRef.current);
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (stepRef.current) clearInterval(stepRef.current);
    };
  }, [searchId]);

  async function handleCheckout() {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/mia/search/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchId: parseInt(searchId ?? "0", 10) }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Failed to create payment session");
      window.location.href = data.url;
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setCheckoutLoading(false);
    }
  }

  if (error) {
    return (
      <div className="w-full min-h-[70vh] flex items-center justify-center py-16">
        <div className="container mx-auto px-4 max-w-xl text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
          <h1 className="text-2xl font-heading tracking-wider text-white mb-3">Something Went Wrong</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <a href="/mia-search">
            <Button className="bg-[#00C1D5] hover:bg-[#00C1D5]/90 text-white">Try Again</Button>
          </a>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="w-full min-h-[70vh] flex items-center justify-center py-16">
        <div className="container mx-auto px-4 max-w-xl text-center">
          <div className="relative inline-flex items-center justify-center w-28 h-28 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border-4 border-[#00C1D5]/20 animate-ping" />
            <div className="absolute inset-2 rounded-full border-4 border-[#00C1D5]/40 animate-pulse" />
            <div className="relative rounded-full bg-[#00C1D5]/10 border-2 border-[#00C1D5] w-20 h-20 flex items-center justify-center">
              <Zap className="w-10 h-10 text-[#00C1D5]" />
            </div>
          </div>
          <h1 className="text-3xl font-heading tracking-wider text-white mb-3">MIA IS SEARCHING</h1>
          <AnimatePresence mode="wait">
            <motion.p
              key={stepIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.4 }}
              className="text-[#00C1D5] text-sm font-medium mb-8"
            >
              {SEARCHING_STEPS[stepIndex]}
            </motion.p>
          </AnimatePresence>
          <div className="bg-card border border-border rounded-2xl p-5 text-left space-y-2.5 max-w-sm mx-auto">
            <p className="text-xs font-bold text-white mb-3">Mia is checking:</p>
            {[
              "MoneySmart (ASIC) unclaimed money",
              "ATO lost super & tax refunds",
              "All 8 state revenue registers",
              "Computershare & Link share registries",
              "Fair Work unpaid wages",
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-[#00C1D5] animate-spin flex-shrink-0" />
                <p className="text-xs text-muted-foreground">{s}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-6">This usually takes 30–60 seconds…</p>
        </div>
      </div>
    );
  }

  if (result.status === "not_found" || result.status === "error") {
    return (
      <div className="w-full min-h-[70vh] flex items-center justify-center py-16">
        <div className="container mx-auto px-4 max-w-xl text-center">
          <XCircle className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
          <h1 className="text-3xl font-heading tracking-wider text-white mb-3">No Matches Found</h1>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Mia didn't find any unclaimed money in the public MoneySmart register for <strong className="text-white">{result.firstName}</strong>. No charge — as promised.
          </p>
          <div className="bg-card border border-border rounded-2xl p-5 mb-6 text-left">
            <p className="text-sm font-bold text-white mb-2">Want to check all 10+ databases yourself?</p>
            <p className="text-xs text-muted-foreground mb-4">Our $4.99 DIY guide walks you through every Australian register step-by-step — ATO, ASIC, all state offices, share registries, Fair Work, and more.</p>
            <a href="https://buy.stripe.com/6oUbJ0eCE4FDbAFaYo4c800" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="w-full border-primary/40 text-primary hover:bg-primary/10">
                Get the $4.99 DIY Guide
              </Button>
            </a>
          </div>
          <a href="/mia-search" className="text-sm text-muted-foreground underline hover:text-white">Try a different name or address</a>
        </div>
      </div>
    );
  }

  const totalDollars = result.totalAmountCents > 0 ? fmt(result.totalAmountCents) : null;
  const feeDollars = fmt(result.feeCents);

  return (
    <div className="w-full py-16">
      <div className="container mx-auto px-4 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#00C1D5]/10 border-2 border-[#00C1D5]/60 mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-[#00C1D5]" />
          </div>
          <h1 className="text-4xl font-heading tracking-wider text-white mb-3">
            MIA FOUND <span className="text-[#00C1D5]">MONEY</span> IN YOUR NAME
          </h1>
          {totalDollars && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="inline-block bg-gradient-to-r from-[#00C1D5]/20 to-[#00C1D5]/10 border-2 border-[#00C1D5]/40 rounded-2xl px-8 py-4 mt-4 mb-6"
            >
              <p className="text-xs text-[#00C1D5] font-bold tracking-widest mb-1">TOTAL FOUND</p>
              <p className="text-5xl font-heading text-white font-black">{totalDollars}</p>
              <p className="text-xs text-muted-foreground mt-1">across {result.matchCount} {result.matchCount === 1 ? "match" : "matches"} in Australian government databases</p>
            </motion.div>
          )}
          {!totalDollars && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="inline-block bg-gradient-to-r from-[#00C1D5]/20 to-[#00C1D5]/10 border-2 border-[#00C1D5]/40 rounded-2xl px-8 py-4 mt-4 mb-6"
            >
              <p className="text-xs text-[#00C1D5] font-bold tracking-widest mb-1">POTENTIAL MATCHES</p>
              <p className="text-4xl font-heading text-white font-black">{result.matchCount} Found</p>
              <p className="text-xs text-muted-foreground mt-1">in Australian government databases</p>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="bg-card border border-[#00C1D5]/30 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-[#00C1D5]" />
            <p className="text-sm font-bold text-white">Claim Details — Locked</p>
          </div>
          <div className="space-y-3">
            {result.teaserMatches.slice(0, 3).map((m, i) => (
              <div key={i} className="flex items-center justify-between bg-background/50 border border-border/50 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-white">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.source ? `${m.source}` : "Institution on file"}{m.state ? ` · ${m.state}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  {m.amount ? (
                    <p className="text-sm font-bold text-[#00C1D5]">{m.amount}</p>
                  ) : (
                    <p className="text-sm font-bold text-muted-foreground">Amount on file</p>
                  )}
                  <div className="flex items-center gap-1 justify-end mt-0.5">
                    <Lock className="w-3 h-3 text-muted-foreground" />
                    <p className="text-[10px] text-muted-foreground">Claim steps locked</p>
                  </div>
                </div>
              </div>
            ))}
            {result.matchCount > 3 && (
              <p className="text-xs text-center text-muted-foreground py-2">
                + {result.matchCount - 3} more match{result.matchCount - 3 !== 1 ? "es" : ""} in your full report
              </p>
            )}
          </div>
          <div className="mt-4 p-3 bg-[#00C1D5]/5 border border-[#00C1D5]/20 rounded-xl">
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              Your full report includes the exact institution, account reference, claim form links, and step-by-step instructions to recover every dollar.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="bg-card border-2 border-[#00C1D5]/50 rounded-2xl p-6 text-center"
        >
          <p className="text-xs text-[#00C1D5] font-bold tracking-widest mb-1">UNLOCK YOUR FULL REPORT</p>
          <h2 className="text-2xl font-heading text-white mb-1">
            Pay {feeDollars} <span className="text-base font-normal text-muted-foreground">({result.feePercent}% success fee)</span>
          </h2>
          {totalDollars && (
            <p className="text-xs text-muted-foreground mb-5">
              {result.feePercent}% of {totalDollars} found = {feeDollars} to unlock your full claim instructions
            </p>
          )}
          {!totalDollars && (
            <p className="text-xs text-muted-foreground mb-5">
              One-time fee to unlock your full claim instructions for all {result.matchCount} matches
            </p>
          )}
          <div className="space-y-2 mb-5">
            {[
              "Exact institution name & account reference",
              "Direct claim form links for every match",
              "Step-by-step instructions — no guesswork",
              "Report emailed to " + result.email,
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00C1D5] flex-shrink-0" />
                <p className="text-sm text-muted-foreground text-left">{s}</p>
              </div>
            ))}
          </div>

          {checkoutError && (
            <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 mb-4">{checkoutError}</p>
          )}

          <Button
            onClick={handleCheckout}
            disabled={checkoutLoading}
            className="w-full h-14 text-lg font-bold tracking-wider rounded-xl bg-[#00C1D5] hover:bg-[#00C1D5]/90 text-white shadow-[0_4px_20px_rgba(0,193,213,0.35)]"
          >
            {checkoutLoading ? (
              <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Preparing payment…</>
            ) : (
              <><Lock className="w-5 h-5 mr-2" /> Unlock My Full Report — {feeDollars}</>
            )}
          </Button>

          <p className="text-[10px] text-muted-foreground mt-3">
            Secure payment via Stripe · Report emailed instantly after payment
          </p>
        </motion.div>
      </div>
    </div>
  );
}
