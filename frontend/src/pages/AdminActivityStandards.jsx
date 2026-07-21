import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AdminLayout from "@/components/AdminLayout";
import { Sparkles, Save, RefreshCw, Trash2, AlertTriangle } from "lucide-react";
import { BASE_QUESTIONS } from "@/pages/BuildApp";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const FIELDS = [
  { key: "must_include", label: "A professional plan always includes" },
  { key: "common_injuries", label: "Most common injuries" },
  { key: "prevention", label: "Preventative work that must appear" },
  { key: "never_include", label: "Never include" },
  { key: "hallmarks", label: "Professional vs amateur" },
];

// Pulled from the questionnaire itself so this list can never drift from what
// customers can actually pick.
const ALL_GOALS =
  BASE_QUESTIONS.find((q) => q.id === "goal")?.options?.filter(
    (g) => !g.toLowerCase().includes("something else")
  ) || [];

/**
 * Sport-specific quality standards, written by Claude and reviewed here.
 *
 * The point of this page is that reviewing ten lines per sport is a job you can
 * actually do — reading a full 28-day plan for every activity to spot what's
 * missing is not. Edit anything that looks wrong and every future plan for that
 * activity improves, with no deploy.
 */
export default function AdminActivityStandards() {
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [note, setNote] = useState(null);

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

  const load = useCallback(async (t) => {
    try {
      const res = await axios.get(`${API}/admin/activity-standards`, {
        headers: { "X-Admin-Token": t },
      });
      setItems(res.data.standards || []);
    } catch {
      setNote({ type: "error", text: "Couldn't load standards." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) load(token);
  }, [token, load]);

  const generate = async (goal) => {
    setBusy(goal);
    setNote(null);
    try {
      await axios.post(
        `${API}/admin/activity-standards/generate`,
        { goal },
        { headers: { "X-Admin-Token": token } }
      );
      await load(token);
      setNote({ type: "ok", text: `Generated standards for ${goal}.` });
    } catch (err) {
      setNote({
        type: "error",
        text: err.response?.data?.detail || `Generation failed for ${goal}.`,
      });
    } finally {
      setBusy(null);
    }
  };

  // Sequential rather than parallel — a burst of concurrent generations is a
  // good way to hit rate limits and get half of them back as failures.
  const generateMissing = async () => {
    const have = new Set(items.map((i) => i.goal));
    const missing = ALL_GOALS.filter((g) => !have.has(g));
    if (!missing.length) {
      setNote({ type: "ok", text: "Every activity already has standards." });
      return;
    }
    for (const goal of missing) {
      // eslint-disable-next-line no-await-in-loop
      await generate(goal);
    }
    setNote({ type: "ok", text: `Generated standards for ${missing.length} activities.` });
  };

  const draftFor = (item) => drafts[item.key] || item.standards || {};

  const setDraftLine = (item, field, index, value) => {
    const current = draftFor(item);
    const list = [...(current[field] || [])];
    list[index] = value;
    setDrafts((d) => ({ ...d, [item.key]: { ...current, [field]: list } }));
  };

  const save = async (item) => {
    setBusy(item.key);
    try {
      const payload = FIELDS.reduce((acc, f) => {
        acc[f.key] = (draftFor(item)[f.key] || []).filter((l) => l && l.trim());
        return acc;
      }, {});
      await axios.put(`${API}/admin/activity-standards/${item.key}`, payload, {
        headers: { "X-Admin-Token": token },
      });
      setDrafts((d) => {
        const next = { ...d };
        delete next[item.key];
        return next;
      });
      await load(token);
      setNote({ type: "ok", text: `Saved ${item.goal}.` });
    } catch {
      setNote({ type: "error", text: `Couldn't save ${item.goal}.` });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete standards for ${item.goal}? The next plan will regenerate them.`))
      return;
    setBusy(item.key);
    try {
      await axios.delete(`${API}/admin/activity-standards/${item.key}`, {
        headers: { "X-Admin-Token": token },
      });
      await load(token);
    } finally {
      setBusy(null);
    }
  };

  if (!token || loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-zinc-400">
        Loading…
      </div>
    );
  }

  const missingCount = ALL_GOALS.filter((g) => !items.some((i) => i.goal === g)).length;

  return (
    <AdminLayout title="Activity standards">
      <div className="mb-8">
        <p className="text-overline mb-4">— Plan quality</p>
        <h1 className="font-display text-4xl sm:text-5xl">
          What a specialist
          <br />
          <span className="text-[#D4FF00]">would insist on.</span>
        </h1>
        <p className="text-sm text-zinc-400 mt-5 max-w-2xl leading-relaxed">
          Before writing a plan, we ask Claude what a specialist coach in that activity would
          always include — injuries, prevention, and what separates a professional plan from a
          generic one. Those answers are cached here and fed into every plan for that activity.
          Edit anything that looks wrong and every future plan improves.
        </p>
      </div>

      {note && (
        <div
          className={`mb-6 p-3 text-sm border ${
            note.type === "error"
              ? "border-red-500/30 bg-red-500/5 text-red-300"
              : "border-[#D4FF00]/30 bg-[#D4FF00]/5 text-[#D4FF00]"
          }`}
        >
          {note.text}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-10">
        <button
          onClick={generateMissing}
          disabled={!!busy || missingCount === 0}
          className="inline-flex items-center gap-2 bg-[#D4FF00] text-black font-bold uppercase tracking-wide text-xs px-5 py-3 hover:bg-white transition-colors disabled:opacity-40"
        >
          <Sparkles size={14} />
          {busy ? "Working…" : `Generate missing (${missingCount})`}
        </button>
        <p className="text-xs text-zinc-500">
          Pre-generating means no customer waits for it mid-purchase.
        </p>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-zinc-500">
          Nothing generated yet — hit the button above to build standards for every activity.
        </p>
      )}

      <div className="space-y-6">
        {items.map((item) => {
          const d = draftFor(item);
          const dirty = !!drafts[item.key];
          return (
            <div key={item.key} className="border border-white/10 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
                <div>
                  <h2 className="font-display text-2xl">{item.goal}</h2>
                  <p className="text-xs text-zinc-500 mt-1">
                    {item.family} · {item.edited ? "hand-edited" : "generated"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {dirty && (
                    <button
                      onClick={() => save(item)}
                      disabled={busy === item.key}
                      className="inline-flex items-center gap-2 bg-[#D4FF00] text-black font-bold uppercase tracking-wide text-[11px] px-4 py-2 disabled:opacity-40"
                    >
                      <Save size={13} /> Save
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (
                        item.edited &&
                        !window.confirm("This will overwrite your edits. Continue?")
                      )
                        return;
                      generate(item.goal);
                    }}
                    disabled={busy === item.key}
                    className="inline-flex items-center gap-2 border border-white/20 text-[11px] uppercase tracking-wide px-4 py-2 hover:border-white disabled:opacity-40"
                  >
                    <RefreshCw size={13} /> Regenerate
                  </button>
                  <button
                    onClick={() => remove(item)}
                    disabled={busy === item.key}
                    className="text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-40"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {FIELDS.map((f) => (
                  <div key={f.key}>
                    <p className="text-overline mb-3">{f.label}</p>
                    <div className="space-y-2">
                      {(d[f.key] || []).map((line, i) => (
                        <textarea
                          key={i}
                          rows={2}
                          value={line}
                          onChange={(e) => setDraftLine(item, f.key, i, e.target.value)}
                          className="w-full bg-black/40 border border-white/10 focus:border-[#D4FF00] outline-none text-sm text-zinc-300 px-3 py-2"
                        />
                      ))}
                      {!(d[f.key] || []).length && (
                        <p className="text-xs text-zinc-600">— none —</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {item.edited && (
                <p className="flex items-center gap-2 text-xs text-zinc-500 mt-6">
                  <AlertTriangle size={13} />
                  Hand-edited — regenerating will discard these changes.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
}
