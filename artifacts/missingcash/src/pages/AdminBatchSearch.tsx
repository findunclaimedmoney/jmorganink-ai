import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, XCircle, Search, DollarSign } from "lucide-react";

interface MatchResult {
  firstName: string;
  lastName: string;
  status: "found" | "not_found" | "error";
  matchCount: number;
  totalAmountCents: number;
  matches: { name: string; holder: string; state: string; amount: string; source?: string }[];
}

function fmt(cents: number) {
  return (cents / 100).toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

export default function AdminBatchSearch() {
  const [namesInput, setNamesInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentName, setCurrentName] = useState<string | null>(null);

  const parsedNames = namesInput
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/[\s,]+/);
      return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
    })
    .filter((n) => n.firstName && n.lastName)
    .slice(0, 10);

  async function handleSearch() {
    if (parsedNames.length === 0) return;
    setLoading(true);
    setError(null);
    setResults(null);
    setCurrentName(`${parsedNames[0]!.firstName} ${parsedNames[0]!.lastName}`);

    try {
      const res = await fetch("/api/admin/batch-search/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": "missingcash-admin",
        },
        body: JSON.stringify({ names: parsedNames }),
      });
      const data = await res.json() as { results?: MatchResult[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
      setCurrentName(null);
    }
  }

  const found = results?.filter((r) => r.status === "found") ?? [];
  const totalFound = found.reduce((s, r) => s + r.totalAmountCents, 0);

  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-heading tracking-wider text-white mb-1">
          Missing<span className="text-primary">Cash</span> — Batch Search
        </h1>
        <p className="text-muted-foreground text-sm">Enter up to 10 names (one per line). Searches all 8 databases per name.</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          Names to search <span className="text-xs">(First Last — one per line, max 10)</span>
        </label>
        <Textarea
          value={namesInput}
          onChange={(e) => setNamesInput(e.target.value)}
          placeholder={"John Smith\nSarah Johnson\nMichael Williams"}
          rows={10}
          className="font-mono text-sm bg-background resize-none mb-4"
          disabled={loading}
        />

        {parsedNames.length > 0 && (
          <p className="text-xs text-muted-foreground mb-4">
            Ready to search: <strong className="text-white">{parsedNames.length}</strong> name{parsedNames.length !== 1 ? "s" : ""} · ~{parsedNames.length * 55}s estimated
          </p>
        )}

        <Button
          onClick={handleSearch}
          disabled={loading || parsedNames.length === 0}
          className="w-full h-12 font-bold tracking-wider bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Searching{currentName ? ` ${currentName}…` : "…"}</>
          ) : (
            <><Search className="w-4 h-4 mr-2" /> Search {parsedNames.length > 0 ? parsedNames.length : ""} Names</>
          )}
        </Button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400 text-sm">{error}</div>
      )}

      {results && (
        <div>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{results.length}</p>
              <p className="text-xs text-muted-foreground">Searched</p>
            </div>
            <div className="bg-card border border-[#00C1D5]/40 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-[#00C1D5]">{found.length}</p>
              <p className="text-xs text-muted-foreground">Money Found</p>
            </div>
            <div className="bg-card border border-primary/40 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-primary">{totalFound > 0 ? fmt(totalFound) : "$0"}</p>
              <p className="text-xs text-muted-foreground">Total Identified</p>
            </div>
          </div>

          {/* Results list */}
          <div className="space-y-3">
            {results.map((r, i) => (
              <div
                key={i}
                className={`bg-card border rounded-xl p-5 ${
                  r.status === "found" ? "border-[#00C1D5]/40" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {r.status === "found" ? (
                      <CheckCircle2 className="w-5 h-5 text-[#00C1D5]" />
                    ) : r.status === "error" ? (
                      <XCircle className="w-5 h-5 text-red-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-bold text-white">{r.firstName} {r.lastName}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.status === "found"
                          ? `${r.matchCount} match${r.matchCount !== 1 ? "es" : ""} found`
                          : r.status === "error"
                          ? "Search error"
                          : "No matches found"}
                      </p>
                    </div>
                  </div>
                  {r.status === "found" && r.totalAmountCents > 0 && (
                    <div className="flex items-center gap-1.5 bg-[#00C1D5]/10 border border-[#00C1D5]/30 rounded-full px-3 py-1">
                      <DollarSign className="w-3.5 h-3.5 text-[#00C1D5]" />
                      <span className="text-sm font-bold text-[#00C1D5]">{fmt(r.totalAmountCents)}</span>
                    </div>
                  )}
                </div>

                {r.status === "found" && r.matches.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {r.matches.map((m, j) => (
                      <div key={j} className="flex items-center justify-between bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-xs">
                        <div>
                          <span className="font-medium text-white">{m.name}</span>
                          <span className="text-muted-foreground ml-2">{m.source || m.holder}{m.state ? ` · ${m.state}` : ""}</span>
                        </div>
                        {m.amount && <span className="font-bold text-[#00C1D5]">{m.amount}</span>}
                      </div>
                    ))}
                  </div>
                )}

                {r.status === "found" && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-white">Next step:</strong> Contact {r.firstName} {r.lastName} — tell them you found {r.totalAmountCents > 0 ? fmt(r.totalAmountCents) : `${r.matchCount} match${r.matchCount !== 1 ? "es" : ""}`} in their name and offer to send the full claim report.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
