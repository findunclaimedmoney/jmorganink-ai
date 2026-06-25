import { useState, useEffect, useCallback } from "react";

const BASE = import.meta.env.BASE_URL;

interface Analytics {
  pageViews: { today: number; week: number; total: number };
  searches: { today: number; week: number; total: number; found: number };
  finance: { today: number; week: number; total: number };
  emailAlerts: { today: number; week: number; total: number };
  charts: {
    pageViewsByDay: { day: string; count: number }[];
    searchesByDay: { day: string; count: number }[];
  };
  recentActivity: {
    type: string;
    email: string;
    first_name: string;
    last_name: string;
    detail: string;
    created_at: string;
  }[];
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-end gap-1 h-16">
      <div className="w-full bg-white/5 rounded-sm relative" style={{ height: "100%" }}>
        <div
          className={`absolute bottom-0 left-0 right-0 rounded-sm transition-all duration-500 ${color}`}
          style={{ height: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}

function Card({ label, today, week, total, color }: { label: string; today: number; week: number; total: number; color: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <p className="text-xs text-white/40 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-4xl font-bold mb-3 ${color}`}>{today}</p>
      <div className="flex gap-4 text-xs text-white/50">
        <span>7 days: <span className="text-white/80">{week}</span></span>
        <span>All time: <span className="text-white/80">{total}</span></span>
      </div>
    </div>
  );
}

function typeLabel(type: string) {
  if (type === "search") return { label: "Search", bg: "bg-blue-500/20 text-blue-300" };
  if (type === "finance") return { label: "Finance lead", bg: "bg-yellow-500/20 text-yellow-300" };
  if (type === "email_alert") return { label: "Email alert", bg: "bg-green-500/20 text-green-300" };
  return { label: type, bg: "bg-white/10 text-white/50" };
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function buildChartDays(data: { day: string; count: number }[]): { label: string; count: number }[] {
  const days: { label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-AU", { weekday: "short" });
    const found = data.find((x) => x.day.slice(0, 10) === key);
    days.push({ label, count: found?.count ?? 0 });
  }
  return days;
}

export default function AdminDashboard() {
  const [password, setPassword] = useState(() => sessionStorage.getItem("mc_admin_pw") ?? "");
  const [input, setInput] = useState("");
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (pw: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}api/admin/analytics`, {
        headers: { "x-admin-password": pw },
      });
      if (res.status === 401) {
        setError("Wrong password");
        setAuthed(false);
        return;
      }
      const json = await res.json() as Analytics;
      setData(json);
      setAuthed(true);
      setError("");
      setLastRefresh(new Date());
      sessionStorage.setItem("mc_admin_pw", pw);
    } catch {
      setError("Failed to load — check your connection");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (password) fetchData(password);
  }, []);

  useEffect(() => {
    if (!authed || !password) return;
    const id = setInterval(() => fetchData(password), 30_000);
    return () => clearInterval(id);
  }, [authed, password, fetchData]);

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#061826]">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-white mb-1">Admin Dashboard</h1>
          <p className="text-white/40 text-sm mb-6">MissingCash live analytics</p>
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <input
            type="password"
            placeholder="Password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setPassword(input); fetchData(input); } }}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/30 mb-4 outline-none focus:border-primary"
          />
          <button
            onClick={() => { setPassword(input); fetchData(input); }}
            className="w-full bg-primary text-black font-bold py-3 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Enter
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#061826]">
        <div className="text-white/40 animate-pulse">Loading analytics…</div>
      </div>
    );
  }

  const pvDays = buildChartDays(data.charts.pageViewsByDay);
  const srDays = buildChartDays(data.charts.searchesByDay);
  const pvMax = Math.max(...pvDays.map((d) => d.count), 1);
  const srMax = Math.max(...srDays.map((d) => d.count), 1);
  const foundPct = data.searches.total > 0 ? Math.round((data.searches.found / data.searches.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#061826] text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Live Traffic</h1>
            <p className="text-white/40 text-sm mt-1">
              Real users only · Auto-refreshes every 30s
              {lastRefresh && ` · Last: ${lastRefresh.toLocaleTimeString("en-AU")}`}
            </p>
          </div>
          <button
            onClick={() => fetchData(password)}
            disabled={loading}
            className="text-xs text-white/40 border border-white/10 rounded-lg px-3 py-2 hover:border-white/30 transition-colors disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh now"}
          </button>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card label="Page Views Today" today={data.pageViews.today} week={data.pageViews.week} total={data.pageViews.total} color="text-white" />
          <Card label="Mia Searches Today" today={data.searches.today} week={data.searches.week} total={data.searches.total} color="text-blue-400" />
          <Card label="Finance Leads Today" today={data.finance.today} week={data.finance.week} total={data.finance.total} color="text-yellow-400" />
          <Card label="Email Signups Today" today={data.emailAlerts.today} week={data.emailAlerts.week} total={data.emailAlerts.total} color="text-green-400" />
        </div>

        {/* Money found stat */}
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-5 mb-8 flex items-center gap-6">
          <div>
            <p className="text-xs text-primary/60 uppercase tracking-widest mb-1">Mia Success Rate</p>
            <p className="text-5xl font-bold text-primary">{foundPct}%</p>
          </div>
          <div className="text-white/50 text-sm">
            <p><span className="text-white">{data.searches.found}</span> of <span className="text-white">{data.searches.total}</span> real searches found money</p>
            <p className="mt-1 text-xs">Tests and internal searches excluded</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <p className="text-xs text-white/40 uppercase tracking-widest mb-4">Page Views — Last 7 Days</p>
            <div className="grid grid-cols-7 gap-1">
              {pvDays.map((d) => (
                <div key={d.label} className="flex flex-col items-center gap-1">
                  <Bar value={d.count} max={pvMax} color="bg-white/40" />
                  <span className="text-[10px] text-white/30">{d.label}</span>
                  <span className="text-[10px] text-white/60">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <p className="text-xs text-white/40 uppercase tracking-widest mb-4">Mia Searches — Last 7 Days</p>
            <div className="grid grid-cols-7 gap-1">
              {srDays.map((d) => (
                <div key={d.label} className="flex flex-col items-center gap-1">
                  <Bar value={d.count} max={srMax} color="bg-blue-400/60" />
                  <span className="text-[10px] text-white/30">{d.label}</span>
                  <span className="text-[10px] text-white/60">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity feed */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <p className="text-xs text-white/40 uppercase tracking-widest mb-4">Recent Activity (Real Users)</p>
          {data.recentActivity.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">No real user activity yet — traffic will appear here the moment it starts</p>
          ) : (
            <div className="space-y-3">
              {data.recentActivity.map((a, i) => {
                const { label, bg } = typeLabel(a.type);
                return (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${bg}`}>{label}</span>
                    <span className="text-white/80 text-sm flex-1">
                      {a.first_name} {a.last_name}
                      <span className="text-white/30 ml-2">· {a.email}</span>
                    </span>
                    <span className="text-white/30 text-xs">{timeAgo(a.created_at)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          Bookmark this page · Password stored in session
          <button onClick={() => { sessionStorage.removeItem("mc_admin_pw"); setAuthed(false); setPassword(""); }} className="ml-3 underline hover:text-white/40">Sign out</button>
        </p>
      </div>
    </div>
  );
}
