import { useState } from "react";
import { Link } from "wouter";
import VideoSplash from "@/components/VideoSplash";
import {
  Phone,
  Search,
  ShieldCheck,
  Banknote,
  CheckCircle2,
  Car,
  Home as HomeIcon,
  CreditCard,
  Anchor,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePageSEO } from "@/hooks/use-page-seo";
import UnclaimedTicker from "@/components/UnclaimedTicker";
import EmailAlertSignup from "@/components/EmailAlertSignup";
import { getLeadSource } from "@/lib/lead-source";

const LOAN_TYPES = [
  { key: "car", label: "Car", Icon: Car, min: 5_000, max: 100_000, default: 25_000, step: 1_000, terms: [1, 2, 3, 4, 5], defaultTerm: 3 },
  { key: "personal", label: "Personal", Icon: CreditCard, min: 2_000, max: 50_000, default: 15_000, step: 500, terms: [1, 2, 3, 4, 5], defaultTerm: 3 },
  { key: "home", label: "Home", Icon: HomeIcon, min: 100_000, max: 1_000_000, default: 500_000, step: 10_000, terms: [10, 15, 20, 25, 30], defaultTerm: 25 },
  { key: "boat", label: "Boat", Icon: Anchor, min: 10_000, max: 150_000, default: 40_000, step: 1_000, terms: [2, 3, 5, 7], defaultTerm: 3 },
] as const;

type LoanKey = (typeof LOAN_TYPES)[number]["key"];

function fmtAUD(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-AU");
}

export default function Landing() {
  usePageSEO({
    title: "Find Your Missing Money — Free Search | MissingCash Australia",
    description:
      "Billions in unclaimed money sits with the ATO, ASIC and Australian banks. Check if some is yours — free. Plus fast, competitive finance through Stratton Finance.",
    keywords:
      "unclaimed money Australia, missing money, lost super, ATO unclaimed money, ASIC unclaimed, car loans, personal loans, Stratton Finance",
    canonical: "https://missingcash.com.au/start",
  });

  const [showSplash, setShowSplash] = useState(true);

  const [loanType, setLoanType] = useState<LoanKey>("car");
  const activeLoan = LOAN_TYPES.find((l) => l.key === loanType)!;
  const [loanAmount, setLoanAmount] = useState<number>(activeLoan.default);
  const [preferredTerm, setPreferredTerm] = useState<number>(activeLoan.defaultTerm);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function selectLoan(key: LoanKey) {
    const cfg = LOAN_TYPES.find((l) => l.key === key)!;
    setLoanType(key);
    setLoanAmount(cfg.default);
    setPreferredTerm(cfg.defaultTerm);
  }

  async function handleFinanceSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!consent) return;
    setSubmitting(true);
    setSubmitError(null);
    const fd = new FormData(e.currentTarget);
    const src = getLeadSource();
    try {
      const res = await fetch("/api/finance/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loanType,
          loanAmount,
          preferredTerm,
          firstName: fd.get("firstName") as string,
          lastName: fd.get("lastName") as string,
          email: fd.get("email") as string,
          phone: fd.get("phone") as string,
          postcode: fd.get("postcode") as string,
          message: (fd.get("message") as string) || undefined,
          ...(src ? { source: src } : {}),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Server error");
      }
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please call 0432 280 181.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground selection:bg-primary/30 selection:text-white">
      {showSplash && <VideoSplash onDone={() => setShowSplash(false)} />}
      {/* Minimal header */}
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#061826]/85 backdrop-blur-md">
        <div className="container mx-auto px-5 max-w-6xl flex items-center justify-between h-16">
          <Link href="/" className="font-heading text-xl tracking-wider text-white">
            Missing<span className="text-primary">Cash</span>
          </Link>
          <a href="tel:0432280181">
            <Button variant="outline" className="h-10 gap-2 border-primary/30 text-primary hover:bg-primary/10 bg-transparent rounded-xl">
              <Phone className="w-4 h-4" /> 0432 280 181
            </Button>
          </a>
        </div>
      </header>

      {/* HERO — lead with unclaimed money */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(245,185,66,0.10)_0%,transparent_60%)]" />
        <div className="container mx-auto px-5 max-w-4xl relative z-10 pt-16 pb-14 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-4 py-1.5 mb-7">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold tracking-widest text-primary/80 uppercase">Official ATO · ASIC · Bank Sources</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-heading tracking-wide leading-[0.98] text-white mb-5">
            IS THE GOVERNMENT
            <br />
            HOLDING <span className="text-primary gold-glow">MONEY THAT'S YOURS?</span>
          </h1>
          <p className="text-lg text-white/60 max-w-xl mx-auto mb-8 leading-relaxed">
            Australians have <strong className="text-white">billions</strong> sitting unclaimed with the ATO, ASIC and banks. It's free to check if some of it belongs to you.
          </p>
          <div className="max-w-md mx-auto mb-8">
            <UnclaimedTicker />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#check" className="w-full sm:w-auto">
              <Button className="h-13 px-7 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-wide text-base shadow-[0_0_28px_rgba(245,185,66,0.35)] w-full">
                <Search className="w-4 h-4 mr-2" /> CHECK FOR MY MONEY
              </Button>
            </a>
            <a href="#finance" className="w-full sm:w-auto">
              <Button variant="outline" className="h-13 px-6 rounded-xl border-white/15 text-white/80 hover:text-white hover:border-primary/40 bg-transparent font-semibold w-full">
                <Banknote className="w-4 h-4 mr-2 text-primary" /> Get a loan quote
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* UNCLAIMED MONEY capture */}
      <section id="check" className="py-16 border-t border-white/6">
        <div className="container mx-auto px-5 max-w-3xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-heading tracking-wide text-white mb-3">FIND MONEY OWED TO YOU</h2>
            <p className="text-white/55 max-w-xl mx-auto">
              Old bank accounts, unclaimed super, shares, refunds and deceased estates — money gets lost every day. Enter your details and we'll alert you the moment new unclaimed money is matched to names like yours.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 mb-8">
            {[
              { t: "ATO & Lost Super", d: "Billions in lost & unclaimed superannuation" },
              { t: "ASIC & Banks", d: "Dormant accounts, shares & dividends" },
              { t: "State Registers", d: "Unclaimed money held by every state" },
            ].map((c) => (
              <div key={c.t} className="bg-white/4 border border-white/8 rounded-2xl p-4 text-center">
                <CheckCircle2 className="w-5 h-5 text-primary mx-auto mb-2" />
                <p className="text-white font-bold text-sm mb-1">{c.t}</p>
                <p className="text-white/45 text-xs leading-relaxed">{c.d}</p>
              </div>
            ))}
          </div>
          <div className="bg-white/4 border border-white/10 rounded-3xl p-6 md:p-8 max-w-xl mx-auto">
            <div className="flex items-center gap-2 mb-4 justify-center">
              <Search className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold text-white">Get your free unclaimed-money check</h3>
            </div>
            <EmailAlertSignup />
          </div>
        </div>
      </section>

      {/* FINANCE — mention the other */}
      <section id="finance" className="py-16 border-t border-white/6 bg-gradient-to-b from-transparent to-[#04101b]">
        <div className="container mx-auto px-5 max-w-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/6 px-4 py-1 mb-4">
              <span className="text-xs font-semibold tracking-widest text-primary/70 uppercase">In partnership with Stratton Finance</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-heading tracking-wide text-white mb-3">NEED FINANCE TOO?</h2>
            <p className="text-white/55 max-w-lg mx-auto">
              Car, personal, home or commercial — competitive finance through Stratton Finance with access to 40+ lenders. Your consultant Erin Crofton will be in touch within one business day.
            </p>
          </div>

          {submitted ? (
            <div className="bg-primary/8 border border-primary/20 rounded-3xl p-10 text-center">
              <CheckCircle2 className="w-14 h-14 text-primary mx-auto mb-5" />
              <h3 className="text-2xl font-heading text-white mb-3">Enquiry Sent!</h3>
              <p className="text-white/60 mb-6">Erin will be in touch within one business day. Prefer to talk now?</p>
              <a href="tel:0432280181">
                <Button className="gap-2 bg-primary text-primary-foreground font-bold hover:bg-primary/90">
                  <Phone className="w-4 h-4" /> 0432 280 181
                </Button>
              </a>
            </div>
          ) : (
            <form onSubmit={handleFinanceSubmit} className="bg-white/4 border border-white/10 rounded-3xl p-6 md:p-8 space-y-5">
              <div>
                <Label className="text-white/60 text-sm mb-2 block">What type of finance? *</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {LOAN_TYPES.map(({ key, label, Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => selectLoan(key)}
                      className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                        loanType === key
                          ? "bg-primary/10 border-primary/40 text-primary"
                          : "bg-white/5 border-white/10 text-white/60 hover:text-white/80 hover:border-white/20"
                      }`}
                    >
                      <Icon className="w-4 h-4" /> {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <Label className="text-white/60 text-sm mb-2 block">
                    Loan amount: <strong className="text-primary">{fmtAUD(loanAmount)}</strong>
                  </Label>
                  <input
                    type="range"
                    min={activeLoan.min}
                    max={activeLoan.max}
                    step={activeLoan.step}
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(Number(e.target.value))}
                    className="w-full accent-[#F5B942]"
                  />
                  <div className="flex justify-between text-xs text-white/30 mt-1">
                    <span>{fmtAUD(activeLoan.min)}</span>
                    <span>{fmtAUD(activeLoan.max)}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-white/60 text-sm mb-2 block">
                    Term: <strong className="text-primary">{preferredTerm} {preferredTerm === 1 ? "year" : "years"}</strong>
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {activeLoan.terms.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setPreferredTerm(t)}
                        className={`px-3.5 py-2 rounded-xl text-sm font-medium border transition-all ${
                          preferredTerm === t
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-white/5 border-white/10 text-white/60 hover:border-white/20"
                        }`}
                      >
                        {t}yr
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-white/60 text-sm mb-1.5 block">First Name *</Label>
                  <Input id="firstName" name="firstName" required placeholder="Jane" className="bg-white/6 border-white/15 text-white placeholder:text-white/25 h-11" />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-white/60 text-sm mb-1.5 block">Last Name *</Label>
                  <Input id="lastName" name="lastName" required placeholder="Smith" className="bg-white/6 border-white/15 text-white placeholder:text-white/25 h-11" />
                </div>
              </div>
              <div>
                <Label htmlFor="email" className="text-white/60 text-sm mb-1.5 block">Email *</Label>
                <Input id="email" name="email" type="email" required placeholder="jane@example.com" className="bg-white/6 border-white/15 text-white placeholder:text-white/25 h-11" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone" className="text-white/60 text-sm mb-1.5 block">Phone *</Label>
                  <Input id="phone" name="phone" type="tel" required placeholder="0400 000 000" className="bg-white/6 border-white/15 text-white placeholder:text-white/25 h-11" />
                </div>
                <div>
                  <Label htmlFor="postcode" className="text-white/60 text-sm mb-1.5 block">Postcode *</Label>
                  <Input id="postcode" name="postcode" required inputMode="numeric" maxLength={4} placeholder="6065" className="bg-white/6 border-white/15 text-white placeholder:text-white/25 h-11" />
                </div>
              </div>
              <div>
                <Label htmlFor="message" className="text-white/60 text-sm mb-1.5 block">Message (optional)</Label>
                <Textarea id="message" name="message" rows={3} placeholder="Anything else Erin should know?" className="bg-white/6 border-white/15 text-white placeholder:text-white/25 resize-none" />
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
                className="w-full h-13 rounded-xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 disabled:opacity-40 shadow-[0_0_20px_rgba(245,185,66,0.25)]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…
                  </>
                ) : (
                  <>
                    Send Enquiry to Erin <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </section>

      {/* Footer — compliance */}
      <footer className="border-t border-white/8 bg-[#04101b] py-10">
        <div className="container mx-auto px-5 max-w-5xl">
          <p className="text-xs font-semibold text-white/40 mb-3 uppercase tracking-widest">Important Information</p>
          <p className="text-xs text-white/30 leading-relaxed mb-2 max-w-4xl">
            All applications for credit are subject to lender credit assessment and eligibility criteria. Terms, conditions, fees and charges apply. Stratton Finance Pty Ltd Australian Credit Licence 364340.
          </p>
          <p className="text-xs text-white/30 leading-relaxed max-w-4xl mb-6">
            MissingCash (ABN 52 347 989 391) may receive a financial benefit for any referrals to Stratton Finance if your loan settles with one of their panel lenders.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-4 pt-5 border-t border-white/6">
            <p className="text-xs text-white/30">© {new Date().getFullYear()} MissingCash · ABN 52 347 989 391</p>
            <div className="flex gap-5 text-xs">
              <Link href="/privacy" className="text-white/40 hover:text-primary">Privacy Policy</Link>
              <Link href="/" className="text-white/40 hover:text-primary">Full site</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
