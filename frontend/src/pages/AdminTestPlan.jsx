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

  const questions = buildQuestions(answers.goal);

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

  const generate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await axios.post(
        `${API}/plans/generate`,
        { answers },
        { headers: { "X-Admin-Token": token } }
      );
      setResult(res.data);
    } catch (err) {
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
        {loading ? "Generating… (can take up to a minute)" : "Generate test plan"}
      </button>

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
    </AdminLayout>
  );
}
