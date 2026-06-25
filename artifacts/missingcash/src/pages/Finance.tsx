import { CheckCircle2, ExternalLink, Phone, Shield, Star, Sparkles, ArrowRight, Car, Anchor, Home, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useRef } from "react";
import { usePageSEO } from "@/hooks/use-page-seo";

const BASE = import.meta.env.BASE_URL;
const STRATTON_LOGO = `${BASE}stratton-logo.png`;
const MIA_AVATAR    = `${BASE}mia-avatar.png`;

const STRATTON_QUOTE_URL =
  "https://app.strattonfinance.com.au/?rcid=9b783c62-5435-4f78-bfbc-8dc1681dfd41&utm_channel=Referrers&utm_source=MissingCash&utm_medium=Website_Integration&utm_campaign=Erin_Crofton";

function openMia(message?: string) {
  window.dispatchEvent(new CustomEvent("mia:open", { detail: { message } }));
}

const LOAN_CONFIG = {
  car: {
    label: "Car Loan",
    Icon: Car,
    rate: 7.99,
    min: 5_000,
    max: 100_000,
    defaultAmt: 25_000,
    step: 1_000,
    terms: [1, 2, 3, 4, 5],
    defaultTerm: 3,
  },
  boat: {
    label: "Boat Loan",
    Icon: Anchor,
    rate: 8.99,
    min: 10_000,
    max: 150_000,
    defaultAmt: 40_000,
    step: 1_000,
    terms: [2, 3, 5, 7],
    defaultTerm: 3,
  },
  home: {
    label: "Home Loan",
    Icon: Home,
    rate: 6.49,
    min: 100_000,
    max: 1_000_000,
    defaultAmt: 500_000,
    step: 10_000,
    terms: [10, 15, 20, 25, 30],
    defaultTerm: 25,
  },
  personal: {
    label: "Personal Loan",
    Icon: CreditCard,
    rate: 10.99,
    min: 2_000,
    max: 50_000,
    defaultAmt: 15_000,
    step: 500,
    terms: [1, 2, 3, 4, 5],
    defaultTerm: 3,
  },
} as const;

type LoanType = keyof typeof LOAN_CONFIG;

function calcMonthly(principal: number, annualRatePct: number, years: number): number {
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function fmtAUD(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-AU");
}

function readPrefill() {
  if (typeof window === "undefined") return { firstName: "", lastName: "", email: "", amount: "", source: "" };
  const p = new URLSearchParams(window.location.search);
  return {
    firstName: p.get("fn") ?? "",
    lastName:  p.get("ln") ?? "",
    email:     p.get("email") ?? "",
    amount:    p.get("amount") ?? "",
    source:    p.get("source") ?? "",
  };
}

export default function Finance() {
  const [prefill]                         = useState(readPrefill);
  const isProspect                        = prefill.source === "prospect-finance";
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [consent, setConsent]             = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [submitError, setSubmitError]     = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [loanType, setLoanType]           = useState<LoanType>("car");
  const [loanAmount, setLoanAmount]       = useState<number>(LOAN_CONFIG.car.defaultAmt);
  const [preferredTerm, setPreferredTerm] = useState<number>(LOAN_CONFIG.car.defaultTerm);
  const [showEstimate, setShowEstimate]   = useState(false);

  usePageSEO({
    title: "Stratton Finance Wanneroo, Perth | Car Loans & Personal Finance — MissingCash",
    description:
      "Get competitive car loans, personal loans and commercial finance through Stratton Finance Wanneroo. Speak with Erin Crofton 0432 280 181. ACL 364340 · 40+ lenders · award-winning broker.",
    keywords:
      "Stratton Finance, Stratton Finance Wanneroo, Stratton Finance Perth, Erin Crofton, car loans Perth, car finance Perth, personal loans WA, commercial finance Perth, asset finance, finance broker Perth, MissingCash finance",
    canonical: "https://www.missingcash.com.au/finance",
  });

  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id   = "finance-jsonld";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FinancialService",
      name: "Stratton Finance Wanneroo (via MissingCash)",
      description: "Car loans, personal loans, commercial and asset finance from Stratton Finance.",
      url: "https://www.missingcash.com.au/finance",
      telephone: "+61432280181",
      areaServed: "AU",
      address: { "@type": "PostalAddress", addressLocality: "Wanneroo", addressRegion: "WA", addressCountry: "AU" },
      employee: { "@type": "Person", name: "Erin Crofton", jobTitle: "Finance Consultant" },
      makesOffer: [
        { "@type": "Offer", name: "Car Finance" },
        { "@type": "Offer", name: "Personal Loans" },
        { "@type": "Offer", name: "Commercial Finance" },
        { "@type": "Offer", name: "Asset Finance" },
      ],
    });
    document.head.appendChild(script);
    return () => { document.getElementById("finance-jsonld")?.remove(); };
  }, []);

  useEffect(() => {
    const cfg = LOAN_CONFIG[loanType];
    setLoanAmount(cfg.defaultAmt);
    setPreferredTerm(cfg.defaultTerm);
    setShowEstimate(false);
  }, [loanType]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!consent) return;
    setSubmitting(true);
    setSubmitError(null);

    const fd = new FormData(e.currentTarget);
    const monthly = showEstimate ? calcMonthly(loanAmount, LOAN_CONFIG[loanType].rate, preferredTerm) : undefined;

    try {
      const res = await fetch("/api/finance/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loanType,
          loanAmount,
          preferredTerm,
          ...(monthly !== undefined ? { estimatedMonthly: monthly } : {}),
          firstName: fd.get("firstName") as string,
          lastName:  fd.get("lastName")  as string,
          email:     fd.get("email")     as string,
          phone:     fd.get("phone")     as string,
          postcode:  fd.get("postcode")  as string,
          message:   (fd.get("message") as string) || undefined,
        }),
      });

      if (res.ok) {
        setFormSubmitted(true);
      } else {
        const body = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message ?? "Server error");
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please call 0432 280 181.");
    } finally {
      setSubmitting(false);
    }
  };

  const cfg = LOAN_CONFIG[loanType];

  return (
    <div className="w-full">
      {/* HERO — Mia + Stratton partnership */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-[#060E1C]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_50%,rgba(0,193,213,0.07)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_10%_50%,rgba(245,185,66,0.06)_0%,transparent_55%)]" />
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#F5B942]/60 to-transparent" />

        <div className="container mx-auto px-6 max-w-7xl relative z-10 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#F5B942]/25 bg-[#F5B942]/8 px-4 py-1.5 mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F5B942] animate-pulse" />
                <span className="text-xs font-semibold tracking-widest text-[#F5B942]/80 uppercase">Official Finance Partner · Wanneroo WA</span>
              </div>

              <h1 className="text-5xl md:text-6xl xl:text-7xl font-heading tracking-wider leading-[0.95] mb-6 text-white">
                FINANCE WITH
                <span className="block bg-gradient-to-r from-[#F5B942] via-[#FFD466] to-[#F5B942] bg-clip-text text-transparent">
                  STRATTON
                </span>
              </h1>

              <p className="text-lg text-white/60 mb-6 leading-relaxed max-w-lg">
                MissingCash has partnered with <strong className="text-white">Stratton Finance</strong> — one of Australia's most awarded brokers. Access{" "}
                <strong className="text-white">40+ lenders</strong>, expert personal service, and fast approvals.
              </p>

              <p className="text-base text-white/70 mb-8 leading-relaxed max-w-lg">
                Your local consultant: <strong className="text-white">Erin Crofton</strong> — Stratton Finance, Wanneroo WA. Erin personally guides you through your finance options from start to finish.
              </p>

              <div className="flex flex-wrap gap-3 mb-10">
                {["Car Finance", "Personal Loans", "Commercial Finance", "Asset Finance", "Novated Lease"].map((tag) => (
                  <span key={tag} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white/60 font-medium">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <a href="#enquire">
                  <Button className="h-13 px-7 rounded-xl bg-[#F5B942] text-[#060E1C] hover:bg-[#FFD466] font-bold tracking-wider text-base shadow-[0_0_28px_rgba(245,185,66,0.35)] transition-all hover:-translate-y-0.5">
                    GET FINANCE READY TODAY
                  </Button>
                </a>
                <button
                  onClick={() => openMia("I'd like to enquire about finance options with Stratton Finance")}
                  className="h-13 px-6 rounded-xl bg-white/5 border border-white/15 text-white font-semibold text-sm flex items-center gap-2 hover:bg-white/10 hover:border-[#F5B942]/40 transition-all"
                >
                  <img src={MIA_AVATAR} alt="Mia" className="w-6 h-6 rounded-full object-cover" />
                  Ask Mia first
                </button>
                <a href="tel:0432280181">
                  <Button variant="outline" className="h-13 px-5 rounded-xl gap-2 border-white/15 text-white/70 hover:text-white hover:border-white/30 bg-transparent text-sm">
                    <Phone className="w-4 h-4 text-[#F5B942]" /> 0432 280 181
                  </Button>
                </a>
              </div>
            </div>

            <div className="flex flex-col items-center gap-6">
              <div className="relative w-full rounded-2xl overflow-hidden shadow-[0_8px_60px_rgba(0,0,0,0.6)] border border-[#F5B942]/20 ring-1 ring-white/5">
                <video
                  src={`${BASE}stratton-intro.mp4`}
                  controls
                  playsInline
                  poster={STRATTON_LOGO}
                  className="w-full h-auto block"
                  style={{ background: "#060E1C" }}
                >
                  Your browser does not support video.
                </video>
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/10">
                  <img src={STRATTON_LOGO} alt="Stratton Finance" className="h-5 w-auto object-contain" />
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                <span className="text-xs text-white/40 flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1">
                  <Shield className="w-3 h-3 text-[#F5B942]" /> ACL 364340
                </span>
                <span className="text-xs text-white/40 flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1">
                  <Star className="w-3 h-3 text-[#F5B942]" /> 4.8/5 · 2,500+ reviews
                </span>
                <span className="text-xs text-white/40 flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1">
                  <CheckCircle2 className="w-3 h-3 text-[#F5B942]" /> 150,000+ customers
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MIA — AI Finance Guide feature block */}
      <section className="relative py-20 overflow-hidden border-y border-white/6">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A1628] via-[#0D1E35] to-[#0A1628]" />
        <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(ellipse_80%_100%_at_100%_50%,rgba(245,185,66,0.06)_0%,transparent_60%)]" />
        <div className="container mx-auto px-6 max-w-7xl relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
            <div className="lg:col-span-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#F5B942]/20 bg-[#F5B942]/6 px-4 py-1 mb-6">
                <Sparkles className="w-3.5 h-3.5 text-[#F5B942]" />
                <span className="text-xs font-semibold tracking-widest text-[#F5B942]/70 uppercase">AI-Powered Finance Guidance</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-heading tracking-wider mb-5 text-white leading-tight">
                MEET MIA — YOUR<br />
                <span className="text-[#F5B942]">FINANCE GUIDE</span>
              </h2>
              <p className="text-white/60 text-lg leading-relaxed mb-8 max-w-xl">
                Mia is MissingCash's AI assistant — available 24/7 to explain loan types, compare your options,
                answer finance questions in plain English, and warm-introduce you to Erin at Stratton Finance.
                No jargon. No pressure. Just clear guidance.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-white/4 border border-white/8 rounded-xl p-4">
                  <p className="text-[#F5B942] font-bold text-sm mb-1">Explains loan types</p>
                  <p className="text-white/50 text-xs leading-relaxed">Car loans, personal, commercial — Mia breaks it down simply</p>
                </div>
                <div className="bg-white/4 border border-white/8 rounded-xl p-4">
                  <p className="text-[#F5B942] font-bold text-sm mb-1">Answers questions</p>
                  <p className="text-white/50 text-xs leading-relaxed">Rates, terms, eligibility, repayments — ask anything</p>
                </div>
                <div className="bg-white/4 border border-white/8 rounded-xl p-4">
                  <p className="text-[#F5B942] font-bold text-sm mb-1">Connects you to Stratton</p>
                  <p className="text-white/50 text-xs leading-relaxed">Ready? Mia hands you straight to Erin Crofton</p>
                </div>
              </div>
              <button
                onClick={() => openMia("Can you tell me about Stratton Finance and what loans are available?")}
                className="inline-flex items-center gap-3 h-12 px-6 rounded-xl bg-[#F5B942] text-[#060E1C] font-bold hover:bg-[#FFD466] transition-all shadow-[0_0_20px_rgba(245,185,66,0.3)] hover:-translate-y-0.5"
              >
                <img src={MIA_AVATAR} alt="Mia" className="w-6 h-6 rounded-full object-cover" />
                Chat with Mia Now
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="lg:col-span-2 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl bg-[#F5B942]/10 blur-2xl" />
                <div className="relative bg-white/4 border border-white/10 rounded-3xl p-8 space-y-5 max-w-xs">
                  {[
                    { q: "What's the best car loan rate right now?", a: "Great question! Stratton Finance has access to 40+ lenders, with car loan rates starting from 7.99% p.a. comparison rate. Your rate depends on credit history, loan amount and term. Want me to connect you with Erin for a personalised quote?" },
                    { q: "How quickly can I get approved?", a: "Many of Stratton's approvals come through same-day or next business day. Erin will let you know your timeline once she reviews your application. Shall I warm-introduce you?" },
                  ].map((item, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-end">
                        <div className="bg-[#F5B942]/15 border border-[#F5B942]/20 rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[90%]">
                          <p className="text-[#F5B942] text-sm font-medium">{item.q}</p>
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <div className="bg-white/6 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[90%]">
                          <p className="text-white/70 text-xs leading-relaxed">{item.a}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => openMia("I have a question about finance options with Stratton")}
                    className="w-full mt-2 flex items-center gap-2 justify-center h-10 rounded-xl bg-[#F5B942]/10 border border-[#F5B942]/20 text-[#F5B942] text-sm font-semibold hover:bg-[#F5B942]/20 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Ask Mia a question
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Loan Calculator */}
      <section className="py-20 container mx-auto px-6 max-w-4xl">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-heading tracking-wider text-white mb-3">ESTIMATE YOUR REPAYMENTS</h2>
          <p className="text-white/50 text-base">Indicative only — Erin will confirm your personalised rate.</p>
        </div>

        {/* Loan type selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {(Object.entries(LOAN_CONFIG) as [LoanType, typeof LOAN_CONFIG[LoanType]][]).map(([key, config]) => {
            const IconComp = config.Icon;
            return (
              <button
                key={key}
                onClick={() => setLoanType(key)}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                  loanType === key
                    ? "bg-[#F5B942]/10 border-[#F5B942]/40 text-[#F5B942]"
                    : "bg-white/3 border-white/10 text-white/50 hover:text-white/70 hover:border-white/20"
                }`}
              >
                <IconComp className="w-6 h-6" />
                <span className="text-xs font-semibold">{config.label}</span>
              </button>
            );
          })}
        </div>

        <div className="bg-white/4 border border-white/10 rounded-3xl p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            <div>
              <Label className="text-white/60 text-sm mb-3 block">Loan Amount: <strong className="text-[#F5B942]">{fmtAUD(loanAmount)}</strong></Label>
              <input
                type="range"
                min={cfg.min}
                max={cfg.max}
                step={cfg.step}
                value={loanAmount}
                onChange={(e) => { setLoanAmount(Number(e.target.value)); setShowEstimate(false); }}
                className="w-full accent-[#F5B942]"
              />
              <div className="flex justify-between text-xs text-white/30 mt-1">
                <span>{fmtAUD(cfg.min)}</span>
                <span>{fmtAUD(cfg.max)}</span>
              </div>
            </div>
            <div>
              <Label className="text-white/60 text-sm mb-3 block">Loan Term: <strong className="text-[#F5B942]">{preferredTerm} {preferredTerm === 1 ? "year" : "years"}</strong></Label>
              <div className="flex gap-2 flex-wrap">
                {cfg.terms.map((t) => (
                  <button
                    key={t}
                    onClick={() => { setPreferredTerm(t); setShowEstimate(false); }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                      preferredTerm === t
                        ? "bg-[#F5B942] text-[#060E1C] border-[#F5B942]"
                        : "bg-white/5 border-white/10 text-white/60 hover:border-white/20"
                    }`}
                  >
                    {t}yr
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={() => setShowEstimate(true)}
              className="h-12 px-8 rounded-xl bg-[#F5B942] text-[#060E1C] font-bold hover:bg-[#FFD466] transition-all shadow-[0_0_20px_rgba(245,185,66,0.25)] mb-4"
            >
              Calculate Repayments
            </button>

            {showEstimate && (
              <div className="mt-4 p-6 bg-[#F5B942]/8 border border-[#F5B942]/20 rounded-2xl">
                <p className="text-white/50 text-xs mb-1">Estimated monthly repayment</p>
                <p className="text-4xl font-heading font-bold text-[#F5B942]">
                  {fmtAUD(calcMonthly(loanAmount, cfg.rate, preferredTerm))}
                  <span className="text-lg text-white/40">/mo</span>
                </p>
                <p className="text-white/30 text-xs mt-2">
                  Based on {cfg.rate}% p.a. comparison rate · {loanType} loan · {fmtAUD(loanAmount)} over {preferredTerm} {preferredTerm === 1 ? "year" : "years"}. Indicative only.
                </p>
                <a href="#enquire">
                  <Button className="mt-4 bg-[#F5B942] text-[#060E1C] font-bold hover:bg-[#FFD466]">
                    Get My Personalised Rate
                  </Button>
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Enquiry Form */}
      <section id="enquire" className="py-20 container mx-auto px-6 max-w-2xl">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-heading tracking-wider text-white mb-3">GET IN TOUCH WITH ERIN</h2>
          <p className="text-white/50">Erin Crofton · Stratton Finance Wanneroo · 0432 280 181</p>
        </div>

        {formSubmitted ? (
          <div className="bg-[#F5B942]/8 border border-[#F5B942]/20 rounded-3xl p-10 text-center">
            <CheckCircle2 className="w-14 h-14 text-[#F5B942] mx-auto mb-5" />
            <h3 className="text-2xl font-heading text-white mb-3">Enquiry Sent!</h3>
            <p className="text-white/60 mb-6">Erin will be in touch within one business day. You can also call or email directly.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="tel:0432280181">
                <Button className="gap-2 bg-[#F5B942] text-[#060E1C] font-bold hover:bg-[#FFD466]">
                  <Phone className="w-4 h-4" /> 0432 280 181
                </Button>
              </a>
              <a href={STRATTON_QUOTE_URL} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2 border-white/20 text-white/70 hover:text-white bg-transparent">
                  <ExternalLink className="w-4 h-4" /> Apply Online
                </Button>
              </a>
            </div>
          </div>
        ) : (
          <form ref={formRef} onSubmit={handleSubmit} className="bg-white/4 border border-white/10 rounded-3xl p-8 space-y-5">
            {isProspect && prefill.amount && (
              <div className="bg-[#F5B942]/10 border border-[#F5B942]/30 rounded-xl p-4 flex gap-3 items-start">
                <span className="text-2xl">🎉</span>
                <div>
                  <p className="text-[#F5B942] font-bold text-sm">MissingCash found {prefill.amount} in your name!</p>
                  <p className="text-white/60 text-xs mt-1">Erin can arrange finance to cover the claim fee — your unclaimed money is the collateral. Fill in your details below and Erin will be in touch.</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="text-white/60 text-sm mb-1.5 block">First Name *</Label>
                <Input id="firstName" name="firstName" required placeholder="Jane" defaultValue={prefill.firstName} className="bg-white/6 border-white/15 text-white placeholder:text-white/25 h-11" />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-white/60 text-sm mb-1.5 block">Last Name *</Label>
                <Input id="lastName" name="lastName" required placeholder="Smith" defaultValue={prefill.lastName} className="bg-white/6 border-white/15 text-white placeholder:text-white/25 h-11" />
              </div>
            </div>
            <div>
              <Label htmlFor="email" className="text-white/60 text-sm mb-1.5 block">Email *</Label>
              <Input id="email" name="email" type="email" required placeholder="jane@example.com" defaultValue={prefill.email} className="bg-white/6 border-white/15 text-white placeholder:text-white/25 h-11" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone" className="text-white/60 text-sm mb-1.5 block">Phone *</Label>
                <Input id="phone" name="phone" type="tel" required placeholder="0400 000 000" className="bg-white/6 border-white/15 text-white placeholder:text-white/25 h-11" />
              </div>
              <div>
                <Label htmlFor="postcode" className="text-white/60 text-sm mb-1.5 block">Postcode *</Label>
                <Input id="postcode" name="postcode" required placeholder="6065" className="bg-white/6 border-white/15 text-white placeholder:text-white/25 h-11" />
              </div>
            </div>
            <div>
              <Label className="text-white/60 text-sm mb-1.5 block">What type of finance? *</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.entries(LOAN_CONFIG) as [LoanType, typeof LOAN_CONFIG[LoanType]][]).map(([key, config]) => {
                  const IconComp = config.Icon;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setLoanType(key)}
                      className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                        loanType === key
                          ? "bg-[#F5B942]/10 border-[#F5B942]/40 text-[#F5B942]"
                          : "bg-white/5 border-white/10 text-white/60 hover:text-white/80 hover:border-white/20"
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                      {config.label}
                    </button>
                  );
                })}
              </div>
              {showEstimate && (
                <p className="mt-2 text-xs text-white/40">
                  Estimate: <strong className="text-[#F5B942]">{fmtAUD(loanAmount)}</strong> over{" "}
                  <strong className="text-[#F5B942]">{preferredTerm} years</strong> · approx.{" "}
                  <strong className="text-[#F5B942]">{fmtAUD(calcMonthly(loanAmount, cfg.rate, preferredTerm))}/mo</strong>
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="message" className="text-white/60 text-sm mb-1.5 block">Message (optional)</Label>
              <Textarea id="message" name="message" rows={3} placeholder="Anything else Erin should know? (optional)" defaultValue={isProspect && prefill.amount ? `MissingCash found ${prefill.amount} in my name. I'd like finance to cover the claim fee, using the unclaimed money as collateral once claimed.` : ""} className="bg-white/6 border-white/15 text-white placeholder:text-white/25 resize-none" />
            </div>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 accent-[#F5B942] w-4 h-4 shrink-0"
              />
              <span className="text-xs text-white/40 leading-relaxed group-hover:text-white/60 transition-colors">
                I consent to Stratton Finance's brokers contacting me regarding my enquiry. My information will be handled in accordance with Stratton Finance's Privacy Policy.
              </span>
            </label>

            {submitError && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{submitError}</p>
            )}

            <Button
              type="submit"
              disabled={!consent || submitting}
              className="w-full h-13 rounded-xl bg-[#F5B942] text-[#060E1C] font-bold text-base hover:bg-[#FFD466] disabled:opacity-40 shadow-[0_0_20px_rgba(245,185,66,0.25)]"
            >
              {submitting ? "Sending…" : "Send Enquiry to Erin"}
            </Button>

            <p className="text-center text-xs text-white/25">
              Or apply directly:{" "}
              <a href={STRATTON_QUOTE_URL} target="_blank" rel="noopener noreferrer" className="text-[#F5B942]/60 hover:text-[#F5B942] underline inline-flex items-center gap-1">
                Stratton Finance online <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </form>
        )}
      </section>

      {/* IMPORTANT INFORMATION */}
            <section className="py-10 border-t border-white/6 bg-[#060E1C]">
              <div className="container mx-auto px-6 max-w-7xl">
                <p className="text-xs font-semibold text-white/40 mb-3 uppercase tracking-widest">Important Information</p>
                <p className="text-xs text-white/30 leading-relaxed mb-2 max-w-4xl">
                  All applications for credit are subject to lender credit assessment and eligibility criteria. Terms, conditions, fees and charges apply. Stratton Finance Pty Ltd Australian Credit Licence 364340.
                </p>
                <p className="text-xs text-white/30 leading-relaxed max-w-4xl">
                  MissingCash (ABN 52 347 989 391) may receive a financial benefit for any referrals to Stratton Finance if your loan settles with one of their panel lenders.
                </p>
                <div className="flex flex-wrap items-center gap-5 mt-5">
                  <span className="text-xs text-white/25 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-[#F5B942]/50" /> ACL 364340</span>
                  <span className="text-xs text-white/25 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-[#F5B942]/50" /> FBAA Member 103514</span>
                  <span className="text-xs text-white/25 flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-[#F5B942]/50" /> Best Car Loans 2021–2026 · ProductReview</span>
                  <span className="text-xs text-white/25 flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-[#F5B942]/50" /> Best Large-Size Brokerage 2023–2024 · WeMoney</span>
                </div>
              </div>
            </section>
          </div>
        );
      }