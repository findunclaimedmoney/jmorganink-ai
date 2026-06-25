import { useEffect, useState } from "react";
import { usePageSEO } from "@/hooks/use-page-seo";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Mail, Loader2, Zap } from "lucide-react";
import { motion } from "framer-motion";

interface SearchRow {
  status: string;
  totalAmountCents: number;
  matchCount: number;
  email: string;
  firstName: string;
}

function fmt(cents: number) {
  return (cents / 100).toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

export default function MiaSearchPaid() {
  usePageSEO({
    title: "Payment Confirmed — Your Report Is On Its Way | MissingCash",
    description: "Mia is generating your personalised unclaimed money claim report. It will be emailed to you shortly.",
  });

  const params = new URLSearchParams(window.location.search);
  const searchId = params.get("id");

  const [data, setData] = useState<SearchRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!searchId) { setLoading(false); return; }
    fetch(`/api/mia/search/${searchId}`)
      .then((r) => r.json() as Promise<SearchRow>)
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [searchId]);

  return (
    <div className="w-full min-h-[80vh] flex items-center justify-center py-16">
      <div className="container mx-auto px-4 max-w-xl text-center">

        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-[#00C1D5]/10 border-2 border-[#00C1D5]/60 mx-auto mb-8"
        >
          <CheckCircle2 className="w-14 h-14 text-[#00C1D5]" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <h1 className="text-4xl font-heading tracking-wider text-white mb-3">
            PAYMENT <span className="text-[#00C1D5]">CONFIRMED</span>
          </h1>

          {loading ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground mt-4 mb-6">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading your details…</span>
            </div>
          ) : (
            <p className="text-muted-foreground leading-relaxed mb-6">
              {data?.firstName ? `Thanks, ${data.firstName}! ` : ""}
              Mia is generating your full personalised claim report
              {data?.totalAmountCents ? ` for ${fmt(data.totalAmountCents)} found in your name` : ""}.
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="bg-card border border-[#00C1D5]/30 rounded-2xl p-6 mb-6 text-left"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-[#00C1D5]/10 border border-[#00C1D5]/30 flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-[#00C1D5]" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Your report is being emailed now</p>
              {data?.email && (
                <p className="text-xs text-muted-foreground">Sending to {data.email}</p>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
            Mia is preparing your personalised claim report. It will arrive within a few minutes.
            Check your spam folder if you don't see it.
          </p>

          <p className="text-xs font-bold text-white mb-3">Your full report includes:</p>
          <div className="space-y-2.5">
            {[
              "Exact institution names & account references for every match",
              "Direct claim form links — no searching required",
              "Step-by-step instructions personalised to your details",
              "ATO myGov — Lost super & tax refunds",
              "All 8 state & territory revenue registers",
              "Computershare & Link share registries",
              "Fair Work unpaid wages",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00C1D5] mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-8"
        >
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-primary" />
            <p className="text-sm font-bold text-white">Have questions while you claim?</p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Mia is available 24/7 on this site. Hit the "Ask Mia" button any time for help with any step of your claim.
          </p>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="/">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold tracking-wider px-8">
              Back to MissingCash
            </Button>
          </a>
          <a href="/mia-search">
            <Button variant="outline" className="border-border text-muted-foreground hover:text-white px-8">
              Search Another Name
            </Button>
          </a>
        </div>

        <p className="text-[10px] text-muted-foreground mt-6">
          Receipt sent to your email · Questions? support@missingcash.com.au
        </p>
      </div>
    </div>
  );
}
