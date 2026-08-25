import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AdminLayout from "@/components/AdminLayout";
import { FlaskConical, ExternalLink, Copy, Check } from "lucide-react";
import { buildQuestions } from "@/pages/BuildApp";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;


const DEFAULTS = {
  name: "Tim",
  goal: "Football specific",
  stage: "In-season — competing/playing regularly",
  age: "35–44",
  sex: "Male",
  experience: "5+ years",
  days: "4",
  equipment: "Full gym",
  session: "60 min",
  nutrition: "Yes — full plan",
  training_with: "On my own",
  injury: "",
  notes: "",
  email: "tim@hugehoods.co.uk",
};

export default function AdminTestPlan() {
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [answers, setAnswers] = useState(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
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

  const questions = buildQuestions(answers.goal).filter(
    (q) => !q.showIf || q.showIf(answers)
  );

  const set = (key, value) =>
    setAnswers((a) => {
      const next = { ...a, [key]: value };
      // Changing goal changes which stage options are valid. Without this, a
      // football goal could keep "final 4 weeks (fight camp peak)" from an
      // earlier selection and quietly produce a nonsense brief.
      if (key === "goal") {
        const stageQ = buildQuestions(value).find((q) => q.id === "stage");
        next.stage = stageQ ? stageQ.options[0] : "";
      }
      return next;
    });

  const loadRecent = async () => {
    try {
      const res = await axios.get(`${API}/admin/plans/recent`, {
        params: { test_only: true, limit: 20 },
        headers: { "X-Admin-Token": token },
      });
      setRecent(res.data.plans || []);
    } catch {
      /* the list is a convenience — never block generating over it */
    }
  };

  useEffect(() => {
    if (token) loadRecent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /**
   * Look for a test plan created after we started generating.
   *
   * Generation now takes 5-6 minutes, which is past the proxy's request
   * timeout, so the connection gets cut while the backend carries on and saves
   * the plan perfectly well. That showed up here as "Generation failed" on a
   * run that had in fact succeeded (25 Aug, plan e6dfff3c). Rather than trust
   * the dropped request, ask the database whether the plan actually landed.
   */
  const findPlanCreatedAfter = async (startedAt) => {
    try {
      const res = await axios.get(`${API}/admin/plans/recent?test_only=true&limit=5`, {
        headers: { "X-Admin-Token": token },
      });
      const match = (res.data?.plans || []).find(
        (p) => p.created_at && new Date(p.created_at).getTime() >= startedAt - 5000
      );
      return match || null;
    } catch {
      return null;
    }
  };

  const generate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    const startedAt = Date.now();
    try {
      const res = await axios.post(
        `${API}/plans/generate`,
        { answers },
        { headers: { "X-Admin-Token": token }, timeout: 15 * 60 * 1000 }
      );
      setResult(res.data);
      loadRecent();
    } catch (err) {
      // A dropped connection is not the same as a failed generation. Poll for
      // the plan for a few minutes before declaring anything broken.
      setStatus("Connection dropped — checking whether the plan saved anyway...");
      for (let i = 0; i < 40; i++) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 10000));
        // eslint-disable-next-line no-await-in-loop
        const found = await findPlanCreatedAfter(startedAt);
        if (found) {
          setStatus(null);
          setResult({ plan_id: found.id, link: `/plan/${found.id}` });
          loadRecent();
          setLoading(false);
          return;
        }
      }
      setStatus(null);
      setError(
        err.response?.data?.detail ||
          "Generation failed — check Railway logs for the actual error."
      );
    } finally {
      setLoading(false);
    }
  };

  const fullLink = result ? `${window.location.origin}${result.link}` : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-zinc-400">
        Loading…
      </div>
    );
  }

  const inputClass =
    "w-full bg-black/40 border border-white/15 focus:border-[#D4FF00] outline-none text-sm text-white px-3 py-2.5";

  return (
    <AdminLayout title="Test plan generator">
      <div className="mb-8">
        <p className="text-overline mb-4">— Free, no payment</p>
        <h1 className="font-display text-4xl sm:text-5xl">
          Generate a test plan,
          <br />
          <span className="text-[#D4FF00]">no curl required.</span>
        </h1>
        <p className="text-sm text-zinc-400 mt-5 max-w-xl">
          Fill in any answers you'd like to test with and hit generate — this uses the same
          AI generation as a real purchase, but completely free, for checking quality before
          it goes live.
        </p>
      </div>

      {/* Rendered from the SAME question definitions the real questionnaire
          uses, imported from BuildApp. Previously this form kept its own copy
          of the options, which is exactly how it drifted out of sync — it was
          still offering a fight-camp stage for a football goal, and had no way
          to set the new training-context or injury fields at all. Now anything
          added to the customer form appears here automatically. */}
      <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
        {questions
          .filter((q) => q.id !== "email")
          .map((q) => (
            <div key={q.id} className={q.type === "text" ? "sm:col-span-2" : ""}>
              <label className="text-overline block mb-2">
                {q.label}
                {q.optional && <span className="text-zinc-600 normal-case"> (optional)</span>}
              </label>

              {q.type === "choice" ? (
                <select
                  className={inputClass}
                  value={answers[q.id] || ""}
                  onChange={(e) => set(q.id, e.target.value)}
                >
                  <option value="">— not set —</option>
                  {q.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : q.type === "multi" ? (
                /* Multi-answer questions (facilities, club days) genuinely have
                   more than one true answer — someone can have a track AND hills,
                   and club nights on Tuesday AND Thursday. Without this branch
                   they fell through to the plain text input below, which stored a
                   raw string and gave no hint what to type. */
                <div className="flex flex-wrap gap-2">
                  {q.options.map((opt) => {
                    const current = Array.isArray(answers[q.id]) ? answers[q.id] : [];
                    const picked = current.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          let next;
                          if (picked) {
                            next = current.filter((x) => x !== opt);
                          } else if (q.exclusive && opt === q.exclusive) {
                            next = [opt];
                          } else {
                            next = [...current.filter((x) => x !== q.exclusive), opt];
                          }
                          set(q.id, next);
                        }}
                        className={`px-3 py-2 text-xs border transition-colors ${
                          picked
                            ? "border-[#D4FF00] bg-[#D4FF00]/10 text-[#D4FF00]"
                            : "border-white/15 text-zinc-400 hover:border-white/30"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : q.type === "text" ? (
                <textarea
                  className={inputClass}
                  rows={2}
                  placeholder={q.placeholder || ""}
                  value={answers[q.id] || ""}
                  onChange={(e) => set(q.id, e.target.value)}
                />
              ) : (
                <input
                  className={inputClass}
                  placeholder={q.placeholder || ""}
                  value={answers[q.id] || ""}
                  onChange={(e) => set(q.id, e.target.value)}
                />
              )}
            </div>
          ))}

        <div className="sm:col-span-2">
          <label className="text-overline block mb-2">Email (for record only)</label>
          <input
            className={inputClass}
            value={answers.email || ""}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>
      </div>

      <button
        onClick={generate}
        disabled={loading}
        className="mt-6 inline-flex items-center gap-2 bg-[#D4FF00] text-black font-bold uppercase tracking-wide text-xs px-6 py-3.5 hover:bg-white transition-colors disabled:opacity-50"
      >
        <FlaskConical size={14} />
        {loading ? "Generating… (2–3 minutes — leave this tab open)" : "Generate test plan"}
      </button>

      {status && (
        <div className="mt-6 border border-white/15 bg-white/[0.03] p-4 max-w-2xl">
          <p className="text-sm text-zinc-300">{status}</p>
          <p className="text-xs text-zinc-500 mt-1">
            Generation runs 5-6 minutes, which is longer than the request is allowed to stay
            open. The plan usually saves fine — this is just waiting for it to appear.
          </p>
        </div>
      )}

      {error && (
        <div className="mt-6 border border-red-500/30 bg-red-500/5 p-4 max-w-2xl">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-6 border border-[#D4FF00]/30 bg-[#D4FF00]/5 p-5 max-w-2xl">
          <p className="text-sm font-bold text-white mb-3">Plan generated ✓</p>
          <div className="flex items-center gap-2">
            <a
              href={fullLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-[#D4FF00] text-black font-bold uppercase tracking-wide text-xs px-4 py-3 hover:bg-white transition-colors"
            >
              Open plan <ExternalLink size={14} />
            </a>
            <button
              onClick={copyLink}
              className="flex items-center gap-2 border border-white/20 hover:border-[#D4FF00] text-xs font-bold uppercase tracking-wide px-4 py-3 text-white transition-colors"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
      )}
      {recent.length > 0 && (
        <div className="mt-14 max-w-2xl">
          <p className="text-overline mb-4">Recent test plans</p>
          <div className="border border-white/10 divide-y divide-white/10">
            {recent.map((p) => (
              <a
                key={p.id}
                href={`/app/u/${p.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-white/5 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">
                    {p.goal}
                    {p.sample_mode && (
                      <span className="text-[10px] uppercase tracking-wider text-[#D4FF00] ml-2">
                        sample
                      </span>
                    )}
                    {p.needs_review && (
                      <span className="text-[10px] uppercase tracking-wider text-yellow-300/80 ml-2">
                        review
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {p.created_at ? new Date(p.created_at).toLocaleString("en-GB", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    }) : "—"}
                  </p>
                </div>
                <ExternalLink size={14} className="text-zinc-600 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
