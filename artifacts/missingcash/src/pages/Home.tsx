import { useState } from "react";
import UnclaimedTicker from "@/components/UnclaimedTicker";
import EmailAlertSignup from "@/components/EmailAlertSignup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, CheckCircle2, FileText, ChevronRight, Bell, Zap, BookOpen } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePageSEO } from "@/hooks/use-page-seo";

export default function Home() {
  usePageSEO({
    title: "MissingCash | Find Your Unclaimed Money in Australia — Free Search",
    description:
      "Search billions in unclaimed money held by the ATO, ASIC, banks and state registers. MissingCash helps Australians find and claim lost super, shares, dividends and dormant accounts.",
    keywords:
      "unclaimed money Australia, missing money, lost super, ASIC unclaimed money, ATO unclaimed super, find lost money, dormant bank accounts, unclaimed dividends, MissingCash",
    canonical: "https://www.missingcash.com.au/",
  });

  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchName, setSearchName] = useState("");

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    
    if (!firstName || !lastName) return;
    
    setSearchName(`${firstName} ${lastName}`);
    setIsSearching(true);
    setShowResults(true);
    
    setTimeout(() => {
      setIsSearching(false);
    }, 2000);
  };

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center rounded-full border border-border bg-secondary/50 backdrop-blur-sm px-4 py-1.5 mb-8 shadow-sm">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground flex items-center gap-2">
                <span role="img" aria-label="au">🇦🇺</span> TRUSTED · SECURE · OFFICIAL SOURCES
              </span>
            </div>
            
            <h1 className="text-6xl md:text-8xl lg:text-9xl mb-6 flex flex-col md:block">
              <span className="text-white drop-shadow-sm">FIND YOUR </span>
              <span className="text-primary drop-shadow-[0_0_15px_rgba(245,185,66,0.3)]">MISSING CASH</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Australians have <strong className="text-white font-semibold">billions sitting unclaimed</strong> with the government. 
              Banks, the ATO & ASIC are holding your money — waiting for you to claim it.
            </p>
            
            <div className="inline-flex flex-col items-center gap-1 bg-secondary border border-border px-6 py-3 rounded-2xl mb-12 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Live — Total Unclaimed in Australia</span>
              </div>
              <UnclaimedTicker />
            </div>
            
            {/* Search Card */}
            <Card className="bg-card border-border shadow-2xl max-w-3xl mx-auto backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
              <CardHeader className="text-center pb-4 border-b border-border/50 bg-secondary/30">
                <CardTitle className="text-2xl font-heading tracking-wider flex items-center justify-center gap-2">
                  <Search className="w-5 h-5 text-primary" /> SEARCH YOUR NAME NOW
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSearch} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2 text-left">
                      <Label htmlFor="firstName" className="text-muted-foreground">First Name *</Label>
                      <Input id="firstName" name="firstName" placeholder="e.g. John" required className="bg-background h-12 text-base" data-testid="input-first-name" />
                    </div>
                    <div className="space-y-2 text-left">
                      <Label htmlFor="lastName" className="text-muted-foreground">Last Name *</Label>
                      <Input id="lastName" name="lastName" placeholder="e.g. Smith" required className="bg-background h-12 text-base" data-testid="input-last-name" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2 text-left">
                      <Label htmlFor="state" className="text-muted-foreground">State (Optional)</Label>
                      <Select name="state" defaultValue="all">
                        <SelectTrigger id="state" className="bg-background h-12 text-base">
                          <SelectValue placeholder="Select State" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All States</SelectItem>
                          <SelectItem value="nsw">NSW</SelectItem>
                          <SelectItem value="vic">VIC</SelectItem>
                          <SelectItem value="qld">QLD</SelectItem>
                          <SelectItem value="wa">WA</SelectItem>
                          <SelectItem value="sa">SA</SelectItem>
                          <SelectItem value="tas">TAS</SelectItem>
                          <SelectItem value="nt">NT</SelectItem>
                          <SelectItem value="act">ACT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 text-left">
                      <Label htmlFor="birthYear" className="text-muted-foreground">Birth Year (Optional)</Label>
                      <Input id="birthYear" name="birthYear" type="number" placeholder="YYYY" min="1900" max={new Date().getFullYear()} className="bg-background h-12 text-base" data-testid="input-birth-year" />
                    </div>
                  </div>
                  
                  <Button type="submit" size="lg" className="w-full h-14 text-lg font-bold tracking-wider rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_4px_14px_rgba(245,185,66,0.3)] transition-all hover:-translate-y-0.5 active:translate-y-0" data-testid="button-search-submit">
                    <Search className="w-5 h-5 mr-2" /> SEARCH ALL DATABASES NOW
                  </Button>
                  
                  <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1.5 mt-4">
                    <span role="img" aria-label="lock">🔒</span> Secure · ATO, ASIC, myGov, State Registers & more
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      {/* Stratton Finance Partner Banner */}
      <section className="py-6 border-b border-border/50">
        <div className="container mx-auto px-4">
          <a href="/finance" className="block max-w-3xl mx-auto">
            <div className="rounded-2xl bg-white/5 border border-white/10 hover:border-primary/40 transition-all p-5 flex flex-col sm:flex-row items-center gap-5 group cursor-pointer">
              {/* Left: logo + gift card stacked */}
              <div className="flex-shrink-0 flex flex-col items-center gap-2">
                <div className="bg-white rounded-xl px-5 py-3 shadow-sm">
                  <img src="/stratton-logo.png" alt="Stratton Finance" className="h-8 w-auto" />
                </div>
                <div className="bg-white rounded-2xl px-8 py-5 flex flex-col items-center gap-3 shadow-xl border-2 border-[#007A33] min-w-[160px]">
                  <img src="/bp-logo.svg" alt="BP" className="h-20 w-auto object-contain" />
                  <span className="font-black text-[#007A33] text-5xl leading-none">$100</span>
                  <div className="w-full h-px bg-[#007A33]/30" />
                  <span className="font-bold text-[#007A33] text-xs tracking-[0.2em] uppercase">MISSING CASH</span>
                </div>
              </div>
              {/* Middle: text */}
              <div className="text-center sm:text-left flex-1 min-w-0">
                <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-0.5">Finance Partner</p>
                <p className="text-white font-bold text-base leading-snug">Need a car, personal or business loan?</p>
                <p className="text-muted-foreground text-sm">Speak to our trusted broker — fast approvals, competitive rates.</p>
                <p className="text-xs font-semibold text-primary mt-1">⚡ Sign up before end of financial year — Receive $100 Compliments from Missing Cash.</p>
              </div>
              {/* Right: CTA */}
              <div className="flex-shrink-0">
                <span className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold px-5 py-2.5 rounded-full text-sm group-hover:bg-primary/90 transition-colors">
                  Get Finance <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </a>
        </div>
      </section>
      {/* Results Dialog */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="sm:max-w-2xl bg-card border-border p-0 overflow-hidden">
          <div className="h-1.5 w-full bg-primary" />
          
          <div className="p-6 md:p-8">
            {isSearching ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                  <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
                </div>
                <h3 className="text-2xl font-heading tracking-wider mb-2">Searching Databases...</h3>
                <p className="text-muted-foreground animate-pulse">Scanning records for {searchName}</p>
                
                <div className="w-full max-w-sm mt-8 space-y-3">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>ATO Records</span>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>ASIC Database</span>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>State Registers</span>
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500/20 text-green-500 mb-3">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <DialogTitle className="text-2xl font-heading tracking-wider text-white mb-1">RECORDS FOUND FOR {searchName.toUpperCase()}</DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    Potential matches detected across Australian government databases. Choose how to proceed:
                  </DialogDescription>
                </div>

                {/* Blurred match preview */}
                <div className="space-y-2 mb-6">
                  {[
                    { source: 'ATO — Lost Superannuation', year: '2019' },
                    { source: 'ASIC / MoneySmart Register', year: '2021' },
                    { source: 'State Revenue Office', year: '2018' },
                  ].map((match, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3 rounded-lg bg-secondary border border-border">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <p className="text-sm font-medium text-white">{match.source}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-primary blur-sm select-none text-base">$*,***</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Amount hidden</p>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-center text-muted-foreground mb-5">To reveal amounts and claim your money, choose an option below:</p>

                {/* Two options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: DIY Guide */}
                  <div className="border border-border rounded-2xl p-5 flex flex-col text-center hover:border-primary/40 transition-colors bg-secondary/30">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border border-primary/30 mx-auto mb-3">
                      <BookOpen className="w-6 h-6 text-primary" />
                    </div>
                    <h4 className="font-heading text-base text-white mb-1">DO IT YOURSELF</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-1">
                      Get the step-by-step PDF guide. Search every database yourself at your own pace.
                    </p>
                    <a href="https://buy.stripe.com/6oUbJ0eCE4FDbAFaYo4c800" target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="w-full font-bold tracking-wider border-primary/40 text-primary hover:bg-primary/10 hover:text-primary" data-testid="button-claim-money">
                        GET THE GUIDE — $4.99
                      </Button>
                    </a>
                    <p className="text-[10px] text-muted-foreground mt-2">📄 Instant PDF · Search at your own pace</p>
                  </div>

                  {/* Option 2: Mia Speed Research */}
                  <div className="relative border-2 border-[#00C1D5]/60 rounded-2xl p-5 flex flex-col text-center bg-gradient-to-b from-[#00C1D5]/10 to-transparent overflow-hidden">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00C1D5] text-white text-[10px] font-bold px-3 py-1 rounded-full tracking-wider whitespace-nowrap">⭐ MOST POPULAR</div>
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#00C1D5]/20 border border-[#00C1D5]/40 mx-auto mb-3 mt-1">
                      <Zap className="w-6 h-6 text-[#00C1D5]" />
                    </div>
                    <h4 className="font-heading text-base text-white mb-1">MIA DOES THE SEARCH</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-1">
                      Mia searches every database using your details and emails you a full personalised report in minutes.
                    </p>
                    <a href="https://buy.stripe.com/5kQdR82TWdc9eMR2rS4c80i" target="_blank" rel="noopener noreferrer">
                      <Button className="w-full font-bold tracking-wider bg-[#00C1D5] hover:bg-[#00C1D5]/90 text-white shadow-[0_4px_14px_rgba(0,193,213,0.35)]">
                        MIA DO IT — $99
                      </Button>
                    </a>
                    <p className="text-[10px] text-muted-foreground mt-2">⚡ Report emailed in minutes · No effort required</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Marketing Video */}
      <section className="py-20 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-1.5 text-sm text-primary font-medium mb-5">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Meet Mia — Australia's First AI Avatar
            </div>
            <h2 className="text-4xl md:text-5xl font-heading tracking-wider mb-4 text-white">SEE HOW IT WORKS</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Watch Mia walk you through how MissingCash helps Australians find and reclaim what's theirs.</p>
          </div>
          <div className="relative max-w-sm mx-auto group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-primary/10 to-primary/30 rounded-2xl blur-xl opacity-60 group-hover:opacity-90 transition-opacity pointer-events-none" />
            <div className="relative rounded-2xl overflow-hidden border border-primary/30 shadow-2xl aspect-[9/16]">
              <iframe
                src="https://www.youtube.com/embed/uYZQidh8Lcw"
                title="MissingCash — Meet Mia"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
            <p className="text-center text-xs text-muted-foreground mt-4 tracking-widest uppercase">
              Watch Mia explain how <span className="text-primary">MissingCash</span> works
            </p>
          </div>
        </div>
      </section>
      {/* How it works */}
      <section className="py-20 bg-secondary/30 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-heading tracking-wider mb-4 text-white">HOW IT WORKS</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Three simple steps to find and claim your missing money.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { step: '1', title: 'Search Your Name', desc: 'Enter your details into our secure search tool to scan national databases instantly.' },
              { step: '2', title: 'Review Matches', desc: 'See if there are potential matches for your name across government and financial registers.' },
              { step: '3', title: 'Claim Your Money', desc: 'Get our comprehensive guide to lodge your claim securely and get your money back.' }
            ].map((item, i) => (
              <div key={i} className="relative p-6 rounded-2xl bg-card border border-border text-center flex flex-col items-center group hover:border-primary/50 transition-colors">
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-heading text-2xl mb-6 shadow-lg group-hover:scale-110 transition-transform">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 translate-x-1/2 -translate-y-1/2 z-10 text-border">
                    <ChevronRight className="w-8 h-8" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Databases */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-heading tracking-wider mb-4 text-white">DATABASES WE SEARCH</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">We aggregate data from multiple official Australian sources.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              { title: 'ATO', desc: 'Australian Taxation Office - Unclaimed superannuation and tax returns' },
              { title: 'ASIC', desc: 'Australian Securities Commission - Lost shares, investments, and life insurance' },
              { title: 'myGov', desc: 'Medicare and other government service payments' },
              { title: 'State Registers', desc: 'NSW, VIC, QLD, WA, SA, TAS state revenue offices and unclaimed money registers' },
              { title: 'Banks', desc: 'Dormant bank accounts and term deposits' },
              { title: 'Fair Work', desc: 'Unpaid wages and entitlements from former employers' }
            ].map((db, i) => (
              <Card key={i} className="bg-card border-border hover:bg-secondary/50 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" /> {db.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{db.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      {/* Email Alert Signup */}
      <section id="alerts" className="py-16 border-t border-border">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-1.5 text-sm text-primary font-medium mb-5">
            <Bell className="w-4 h-4" /> Weekly Money Alerts
          </div>
          <h2 className="text-3xl font-heading tracking-wider text-white mb-3">GET ALERTED WHEN<br /><span className="text-primary">NEW MONEY IS FOUND</span></h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            New unclaimed money is added to government databases every week. Get a free weekly alert when names matching yours appear in your state's registers.
          </p>
          <div className="bg-card border border-border rounded-2xl p-6">
            <EmailAlertSignup />
          </div>
        </div>
      </section>
      {/* Trust factors */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center max-w-6xl mx-auto">
            {[
              { title: 'Official Sources Only', icon: '🏛️' },
              { title: '100% Australian Owned', icon: '🇦🇺' },
              { title: 'Instant Name Search', icon: '⚡' },
              { title: 'ATO · ASIC · myGov', icon: '✅' }
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="font-bold text-lg">{item.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* FAQ */}
      <section className="py-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-heading tracking-wider mb-4 text-white">FREQUENTLY ASKED QUESTIONS</h2>
          </div>
          
          <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem value="item-1" className="bg-card border border-border rounded-lg px-4">
              <AccordionTrigger className="text-left font-medium hover:no-underline hover:text-primary">How do I know if I have unclaimed money?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                Simply use our search tool at the top of the page. Enter your name, and we'll instantly check national databases including the ATO, ASIC, and State Registers to see if there are any matches.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2" className="bg-card border border-border rounded-lg px-4">
              <AccordionTrigger className="text-left font-medium hover:no-underline hover:text-primary">Is this service really free?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                Running a name search is free. If you find a match and want help with the claims process, we offer options ranging from a DIY guide ($4.99) to a fully done-for-you recovery service ($149).
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3" className="bg-card border border-border rounded-lg px-4">
              <AccordionTrigger className="text-left font-medium hover:no-underline hover:text-primary">Are you a government agency?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                No, MissingCash is a private Australian service. We aggregate data from publicly available government registers and provide tools and guides to help everyday Australians navigate the often complex process of reclaiming their funds.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4" className="bg-card border border-border rounded-lg px-4">
              <AccordionTrigger className="text-left font-medium hover:no-underline hover:text-primary">Is my personal information secure?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                Absolutely. We do not store your search queries or personal data. All searches are processed instantly and your privacy is our top priority.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>
    </div>
  );
}
