import { useState } from "react";
import { usePageSEO } from "@/hooks/use-page-seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Loader2, Search, Shield, Clock, DollarSign } from "lucide-react";

const FEE_TIERS = [
  { range: "$250 – $1,000", percent: "5%", color: "text-green-400" },
  { range: "$1,001 – $5,000", percent: "10%", color: "text-yellow-400" },
  { range: "$5,001 – $30,000", percent: "15%", color: "text-orange-400" },
  { range: "$30,001 – $100,000", percent: "20%", color: "text-red-400" },
  { range: "$100,001+", percent: "33%", color: "text-primary" },
];

const DATABASES = [
  { icon: "🏛️", name: "ASIC MoneySmart", desc: "Unclaimed bank accounts, investments & life insurance" },
  { icon: "📋", name: "ATO Lost Super", desc: "Lost superannuation & unclaimed tax refunds" },
  { icon: "🏠", name: "State Revenue Offices", desc: "All 8 states & territories — unclaimed trust money" },
  { icon: "🔑", name: "Rental Bond Authorities", desc: "Unreturned rental bonds (NSW, VIC, QLD, WA & more)" },
  { icon: "🎰", name: "Lotteries (Oz, Tatts, Lotterywest)", desc: "Unclaimed prize money across all Australian lotteries" },
  { icon: "📈", name: "Share Registries", desc: "Unclaimed dividends & shares (Computershare, Link)" },
  { icon: "🛡️", name: "AFCA Life Insurance Register", desc: "Unclaimed life insurance policies" },
  { icon: "💼", name: "Fair Work", desc: "Unpaid wages & entitlements" },
];

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  dob: string;
  addressLine: string;
  suburb: string;
  state: string;
  postcode: string;
};

const empty: FormData = {
  firstName: "", lastName: "", email: "", dob: "",
  addressLine: "", suburb: "", state: "", postcode: "",
};

export default function FindMyMoney() {
  usePageSEO({
    title: "Find My Unclaimed Money — MissingCash",
    description: "Submit your details and Mia will search every Australian unclaimed money database for you. No find, no fee — we only charge a success fee if we find your money.",
  });

  const [form, setForm] = useState<FormData>(empty);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const isValid =
    form.firstName && form.lastName && form.email && form.dob &&
    form.addressLine && form.suburb && form.state && form.postcode.length === 4;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
      setSubmitted(true);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("mia:open", {
          detail: {
            message: `Hi! I've just submitted my details for the Mia money search — my name is ${form.firstName} ${form.lastName} and I'm in ${form.state}. What happens next and which databases will you search for me?`,
            autoSend: true,
          },
        }));
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="w-full min-h-[80vh] flex items-center justify-center py-16">
        <div className="container mx-auto px-4 max-w-xl text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#00C1D5]/10 border-2 border-[#00C1D5]/40 mb-8">
            <CheckCircle2 className="w-12 h-12 text-[#00C1D5]" />
          </div>
          <h1 className="text-3xl font-heading tracking-wider text-white mb-3">Mia Is Searching!</h1>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Your details have been received. Mia is now searching all 8 Australian unclaimed money databases for <strong className="text-white">{form.firstName} {form.lastName}</strong>.
          </p>
          <div className="bg-card border border-border rounded-2xl p-6 mb-6 text-left space-y-3">
            <h3 className="font-bold text-white mb-2">What happens next:</h3>
            {[
              "Mia searches ATO, ASIC, MoneySmart, all state registers, rental bonds, lotteries, share registries & more",
              "If we find money in your name, we'll email you at " + form.email + " with a full breakdown",
              "You only pay if we find your money — our fee is a percentage of what we recover for you",
              "No find, no fee. Simple as that.",
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#00C1D5]/20 border border-[#00C1D5]/30 flex items-center justify-center text-[#00C1D5] font-bold text-xs shrink-0 mt-0.5">{i + 1}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{s}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Mia is opening below to answer any questions you have right now ↓
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-16">
      <div className="container mx-auto px-4">

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 bg-[#00C1D5]/10 border border-[#00C1D5]/30 rounded-full px-4 py-1.5 text-sm text-[#00C1D5] font-medium mb-6">
            <Search className="w-4 h-4" /> No Find, No Fee
          </div>
          <h1 className="text-4xl md:text-5xl font-heading tracking-wider text-white mb-4">
            LET MIA FIND<br /><span className="text-primary">YOUR MONEY</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed mb-4">
            Searching 8 Australian databases yourself takes months. Mia does it for you — and you only pay if she finds something.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-[#00C1D5]" /> Secure & private</span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-[#00C1D5]" /> Results within 24–48 hours</span>
            <span className="flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-[#00C1D5]" /> No find, no fee</span>
          </div>
        </div>

        {/* Mia video */}
        <div className="max-w-sm mx-auto mb-12">
          <div className="rounded-2xl overflow-hidden border border-border shadow-[0_4px_30px_rgba(0,193,213,0.15)]">
            <video
              src="/mia-does-it.mp4"
              controls
              playsInline
              className="w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 max-w-5xl mx-auto">

          {/* Form */}
          <div className="lg:col-span-3">
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold text-white mb-6">Enter Your Details</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-sm text-muted-foreground">First Name *</Label>
                    <Input id="firstName" value={form.firstName} onChange={set("firstName")} placeholder="Jane" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-sm text-muted-foreground">Last Name *</Label>
                    <Input id="lastName" value={form.lastName} onChange={set("lastName")} placeholder="Smith" required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm text-muted-foreground">Email Address *</Label>
                  <Input id="email" type="email" value={form.email} onChange={set("email")} placeholder="jane@example.com" required />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dob" className="text-sm text-muted-foreground">Date of Birth *</Label>
                  <Input id="dob" type="date" value={form.dob} onChange={set("dob")} required />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="addressLine" className="text-sm text-muted-foreground">Street Address *</Label>
                  <Input id="addressLine" value={form.addressLine} onChange={set("addressLine")} placeholder="123 Example St" required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="suburb" className="text-sm text-muted-foreground">Suburb *</Label>
                    <Input id="suburb" value={form.suburb} onChange={set("suburb")} placeholder="Wanneroo" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="postcode" className="text-sm text-muted-foreground">Postcode *</Label>
                    <Input id="postcode" value={form.postcode} onChange={set("postcode")} placeholder="6065" maxLength={4} required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">State *</Label>
                  <Select value={form.state} onValueChange={(v) => setForm((f) => ({ ...f, state: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {error && (
                  <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={!isValid || loading}
                  className="w-full h-14 text-lg font-bold tracking-wider rounded-xl bg-[#00C1D5] hover:bg-[#00C1D5]/90 text-white shadow-[0_4px_20px_rgba(0,193,213,0.35)] mt-2"
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Submitting…</>
                  ) : (
                    <><Search className="w-5 h-5 mr-2" /> Start Mia's Search — Free</>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground pt-1">
                  🔒 Your details are stored securely and used only to search for your unclaimed money. We never sell your data. See our <a href="/privacy" className="underline hover:text-white">Privacy Policy</a>.
                </p>
              </form>
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 space-y-5">

            {/* Databases */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Search className="w-4 h-4 text-[#00C1D5]" /> Databases Mia Searches
              </h3>
              <div className="space-y-3">
                {DATABASES.map((db) => (
                  <div key={db.name} className="flex items-start gap-3">
                    <span className="text-xl shrink-0">{db.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{db.name}</p>
                      <p className="text-xs text-muted-foreground">{db.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fee structure */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" /> Our Success Fee
              </h3>
              <p className="text-xs text-muted-foreground mb-4">Only charged if we find your money. No find, no fee.</p>
              <div className="space-y-2">
                {FEE_TIERS.map((t) => (
                  <div key={t.range} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                    <span className="text-muted-foreground">{t.range}</span>
                    <span className={`font-bold ${t.color}`}>{t.percent}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Fee is calculated on the total amount recovered. You'll receive a full breakdown before any payment is processed.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
