import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AdminLayout from "@/components/AdminLayout";
import { FileJson, Copy, Check, RefreshCw } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * Raw plan JSON with a copy button.
 *
 * Checking a generated plan properly means reading all 28 days, which a
 * screenshot can't show and browser devtools make awkward — especially on a
 * phone. This puts the whole plan one tap from the clipboard.
 *
 * It accepts either a bare id or a full URL, because the id is easiest to get
 * by copying the address of a plan you already have open.
 */
export default function AdminPlanJson() {
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [input, setInput] = useState("");
  const [recent, setRecent] = useState([]);
  const [json, setJson] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

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

  const loadRecent = async (t) => {
    try {
      const res = await axios.get(`${API}/admin/plans/recent?test_only=true&limit=10`, {
        headers: { "X-Admin-Token": t },
      });
      setRecent(res.data?.plans || []);
    } catch {
      /* the shortcut list is a convenience — never block on it */
    }
  };

  useEffect(() => {
    if (token) loadRecent(token);
  }, [token]);

  /** Pull a plan id out of whatever got pasted: bare id, app link or API link. */
  const extractId = (raw) => {
    const match = String(raw || "").match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
    );
    return match ? match[0] : String(raw || "").trim();
  };

  const fetchPlan = async (rawId) => {
    const id = extractId(rawId);
    if (!id) {
      setError("Paste a plan ID or a plan link first.");
      return;
    }
    setLoading(true);
    setError(null);
    setJson("");
    setCopied(false);
    try {
      const res = await axios.get(`${API}/admin/plans/${id}/edit`, {
        headers: { "X-Admin-Token": token },
      });
      setJson(JSON.stringify(res.data, null, 2));
    } catch (err) {
      setError(
        err.response?.status === 404
          ? "No plan with that ID."
          : "Couldn't load that plan — check the ID and your connection."
      );
    } finally {
      setLoading(false);
    }
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access is blocked in some mobile browsers, so fall back to
      // selecting the text and letting them copy it the normal way.
      const el = document.getElementById("plan-json");
      if (el) {
        el.focus();
        el.select();
      }
      setError("Couldn't copy automatically — the text is selected, copy it manually.");
    }
  };

  if (!token) return null;

  const sizeKb = json ? Math.round(json.length / 1024) : 0;

  return (
    <AdminLayout title="Plan JSON">
      <div className="flex items-center gap-2 mb-2">
        <FileJson size={18} className="text-[#D4FF00]" />
        <h1 className="font-display text-2xl">Plan JSON</h1>
      </div>
      <p className="text-sm text-zinc-500 mb-6 max-w-2xl">
        The full raw plan, for checking every day at once rather than a screen at a time.
        Paste a plan ID or any plan link.
      </p>

      <div className="flex gap-2 max-w-2xl mb-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchPlan(input)}
          placeholder="Plan ID, or paste a plan link"
          className="flex-1 bg-black border border-white/15 px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-[#D4FF00] focus:outline-none"
        />
        <button
          onClick={() => fetchPlan(input)}
          disabled={loading}
          className="shrink-0 bg-[#D4FF00] text-black font-bold uppercase tracking-wider text-xs px-5 py-2.5 hover:bg-white transition-colors disabled:opacity-40"
        >
          {loading ? "Loading..." : "Load"}
        </button>
      </div>

      {recent.length > 0 && (
        <div className="max-w-2xl mb-6">
          <p className="text-overline text-zinc-600 mb-2">Recent test plans</p>
          <div className="flex flex-col gap-1">
            {recent.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setInput(p.id);
                  fetchPlan(p.id);
                }}
                className="text-left border border-white/10 px-3 py-2 hover:border-white/30 transition-colors"
              >
                <span className="text-sm text-white">{p.goal || "Plan"}</span>
                <span className="text-xs text-zinc-600 ml-2">
                  {p.name ? `${p.name} · ` : ""}
                  {p.created_at ? new Date(p.created_at).toLocaleString() : ""}
                </span>
                <span className="block text-[10px] text-zinc-700 font-mono-display">{p.id}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 border border-red-500/30 bg-red-500/5 p-4 max-w-2xl">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {json && (
        <div className="max-w-4xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-zinc-600">
              {sizeKb}kb · {json.split("\n").length.toLocaleString()} lines
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchPlan(input)}
                className="flex items-center gap-1.5 border border-white/15 text-zinc-400 text-xs px-3 py-1.5 hover:border-white/30 hover:text-white transition-colors"
              >
                <RefreshCw size={12} /> Reload
              </button>
              <button
                onClick={copyJson}
                className="flex items-center gap-1.5 bg-[#D4FF00] text-black font-bold uppercase tracking-wider text-xs px-4 py-1.5 hover:bg-white transition-colors"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy all"}
              </button>
            </div>
          </div>
          <textarea
            id="plan-json"
            readOnly
            value={json}
            spellCheck={false}
            className="w-full h-[60vh] bg-black border border-white/15 p-3 text-[11px] leading-relaxed text-zinc-400 font-mono-display focus:border-[#D4FF00] focus:outline-none"
          />
        </div>
      )}
    </AdminLayout>
  );
}
