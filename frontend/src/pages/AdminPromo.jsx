import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AdminLayout from "@/components/AdminLayout";
import { Ticket, Copy, Check } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * Promo codes for free plans.
 *
 * A code skips Stripe entirely — a 100% discount can't go through Checkout in
 * payment mode, since a zero amount is rejected — so redemption creates the
 * order, marks it paid and generates exactly as a real payment does.
 *
 * The use cap is enforced atomically in a single database operation, not by
 * reading the count and then incrementing it. Fifty people arriving at once
 * from an ad cannot all pass the check and all claim a place.
 */
export default function AdminPromo() {
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [codes, setCodes] = useState([]);
  const [code, setCode] = useState("");
  const [maxUses, setMaxUses] = useState(50);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    const t = localStorage.getItem("bfy_admin_token");
    if (!t) {
      navigate("/admin", { replace: true });
      return;
    }
    axios
      .get(`${API}/admin/verify`, { headers: { "X-Admin-Token": t } })
      .then(() => setToken(t))
      .catch(() => {
        localStorage.removeItem("bfy_admin_token");
        navigate("/admin", { replace: true });
      });
  }, [navigate]);

  const load = async (t) => {
    try {
      const res = await axios.get(`${API}/admin/promo`, {
        headers: { "X-Admin-Token": t },
      });
      setCodes(res.data?.codes || []);
    } catch {
      setError("Couldn't load codes.");
    }
  };

  useEffect(() => {
    if (token) load(token);
  }, [token]);

  const save = async (payload) => {
    setBusy(true);
    setError(null);
    try {
      await axios.post(`${API}/admin/promo`, payload, {
        headers: { "X-Admin-Token": token },
      });
      await load(token);
      setCode("");
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't save that code.");
    } finally {
      setBusy(false);
    }
  };

  // Diagnostic. The customer-facing field said "not recognised" for a code this
  // very page listed as active with 49 left — the two read the same collection,
  // so one of them is lying. This calls the exact endpoint the build page uses
  // and shows the raw answer, which settles it in one click.
  const [testResult, setTestResult] = useState(null);

  const testCode = async (c) => {
    setTestResult({ code: c, text: "checking..." });
    try {
      const res = await axios.post(`${API}/promo/check`, { code: c });
      setTestResult({ code: c, text: JSON.stringify(res.data) });
    } catch (err) {
      setTestResult({
        code: c,
        text: `HTTP ${err.response?.status || "?"} — ${err.response?.data?.detail || err.message}`,
      });
    }
  };

  const copyCode = async (c) => {
    try {
      await navigator.clipboard.writeText(c);
      setCopied(c);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard blocked — they can read it off the screen */
    }
  };

  if (!token) return null;

  return (
    <AdminLayout title="Promo codes">
      <div className="flex items-center gap-2 mb-2">
        <Ticket size={18} className="text-[#D4FF00]" />
        <h1 className="font-display text-2xl">Promo codes</h1>
      </div>
      <p className="text-sm text-zinc-500 mb-6 max-w-2xl">
        A code gives a completely free plan and skips payment entirely. The place limit is
        enforced on the server, so it can't be overrun by people arriving at once.
      </p>

      <div className="flex flex-wrap items-end gap-2 max-w-2xl mb-8">
        <div className="flex-1 min-w-[180px]">
          <label className="text-overline text-zinc-500 block mb-2">Code</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
            placeholder="FIRST50"
            className="w-full bg-black border border-white/15 px-3 py-2.5 text-sm text-white placeholder-zinc-700 focus:border-[#D4FF00] focus:outline-none"
          />
        </div>
        <div className="w-32">
          <label className="text-overline text-zinc-500 block mb-2">Places</label>
          <input
            type="number"
            min="1"
            value={maxUses}
            onChange={(e) => setMaxUses(Number(e.target.value))}
            className="w-full bg-black border border-white/15 px-3 py-2.5 text-sm text-white focus:border-[#D4FF00] focus:outline-none"
          />
        </div>
        <button
          onClick={() => save({ code, max_uses: maxUses, active: true })}
          disabled={busy || !code}
          className="bg-[#D4FF00] text-black font-bold uppercase tracking-wider text-xs px-6 py-3 hover:bg-white transition-colors disabled:opacity-40"
        >
          {busy ? "Saving..." : "Create"}
        </button>
      </div>

      {error && (
        <div className="mb-6 border border-red-500/30 bg-red-500/5 p-4 max-w-2xl">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <div className="max-w-2xl flex flex-col gap-2">
        {codes.length === 0 && (
          <p className="text-sm text-zinc-600">No codes yet.</p>
        )}
        {codes.map((c) => {
          const used = c.uses || 0;
          const left = Math.max(0, (c.max_uses || 0) - used);
          const pct = c.max_uses ? Math.min(100, (used / c.max_uses) * 100) : 0;
          return (
            <div key={c.code} className="border border-white/10 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono-display text-sm text-[#D4FF00]">{c.code}</span>
                  <button
                    onClick={() => copyCode(c.code)}
                    className="text-zinc-600 hover:text-white transition-colors"
                    aria-label="Copy code"
                  >
                    {copied === c.code ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                  {!c.active && (
                    <span className="text-[10px] uppercase tracking-wider text-zinc-600 border border-white/15 px-2 py-0.5">
                      off
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500">
                    {used}/{c.max_uses} used · {left} left
                  </span>
                  <button
                    onClick={() => testCode(c.code)}
                    className="text-[10px] uppercase tracking-wider border border-white/15 text-zinc-400 px-2.5 py-1 hover:border-white/30 hover:text-white transition-colors"
                  >
                    Test
                  </button>
                  <button
                    onClick={() => save({ code: c.code, max_uses: c.max_uses, active: !c.active })}
                    className="text-[10px] uppercase tracking-wider border border-white/15 text-zinc-400 px-2.5 py-1 hover:border-white/30 hover:text-white transition-colors"
                  >
                    {c.active ? "Turn off" : "Turn on"}
                  </button>
                </div>
              </div>
              {testResult?.code === c.code && (
                <p className="mt-2 font-mono-display text-[10px] text-zinc-400 break-all">
                  {testResult.text}
                </p>
              )}
              <div className="h-0.5 w-full bg-white/10 mt-3">
                <div className="h-full bg-[#D4FF00]" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
}
