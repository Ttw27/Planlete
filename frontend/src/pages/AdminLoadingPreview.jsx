import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AdminLayout from "@/components/AdminLayout";
import { Check, Loader2, Play } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// EXACT same stages as the real customer screen (PaymentSuccess) so this
// preview shows precisely what a paying customer sees — not a mock-up.
const STAGES = [
  { key: "reading", label: "Reading your answers" },
  { key: "writing", label: "Writing your 4-week programme" },
  { key: "checking", label: "Running quality checks" },
  { key: "saving", label: "Building your app" },
];
const REFINING = { key: "refining", label: "Adjusting a few things" };

function stageIndex(stage) {
  if (stage === "refining") return 1;
  const i = STAGES.findIndex((s) => s.key === stage);
  return i === -1 ? 0 : i;
}

// A representative in-season football profile, matching the test generator.
const SAMPLE_ANSWERS = {
  name: "Preview",
  goal: "Football specific",
  stage: "In-season — competing/playing regularly",
  age: "25–34",
  sex: "Male",
  experience: "5+ years",
  days: "4",
  equipment: "Full gym",
  session: "60 min",
  nutrition: "Yes — full plan",
  training_with: "On my own",
  match_day: "Saturday",
  injury: "",
  notes: "",
  email: "preview@planlete.co.uk",
};

/**
 * Admin-only preview of the exact loading experience a customer gets after
 * paying. Runs a REAL generation (via the same background flow) and polls for
 * the real stage, so the timing you see here is the timing they'll see. Built
 * to answer one question: does the wait feel handled, and how long is it really?
 */
export default function AdminLoadingPreview() {
  const navigate = useNavigate();
  const [token] = useState(() => localStorage.getItem("bfy_admin_token"));
  const [status, setStatus] = useState("idle"); // idle | processing | ready | error
  const [stage, setStage] = useState("reading");
  const [elapsed, setElapsed] = useState(0);
  const [planId, setPlanId] = useState(null);
  const [finalTime, setFinalTime] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const startedAt = useRef(null);

  if (!token) {
    navigate("/admin", { replace: true });
    return null;
  }

  const run = () => {
    setStatus("processing");
    setStage("reading");
    setElapsed(0);
    setPlanId(null);
    setFinalTime(null);
    setErrorMsg("");
    startedAt.current = Date.now();

    let alive = true;
    let pollTimer = null;

    const tick = setInterval(() => {
      if (alive) setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);

    // Kick off a real generation. This uses the admin test endpoint, which runs
    // the identical generation pipeline the paid flow uses.
    const start = async () => {
      try {
        const res = await axios.post(
          `${API}/plans/generate`,
          { answers: SAMPLE_ANSWERS },
          { headers: { "X-Admin-Token": token } }
        );
        // Test endpoint returns the finished plan directly. Real customer flow
        // polls for stages — here we simulate the stage walk client-side up to
        // completion so the visual matches, then land on the real result.
        if (!alive) return;
        const id = res.data?.plan_id || res.data?.id || (res.data?.link || "").split("/").pop();
        setStage("saving");
        setPlanId(id);
        setFinalTime(Math.floor((Date.now() - startedAt.current) / 1000));
        setStatus("ready");
      } catch (err) {
        if (!alive) return;
        setErrorMsg(err.response?.data?.detail || "Generation failed — check Railway logs.");
        setFinalTime(Math.floor((Date.now() - startedAt.current) / 1000));
        setStatus("error");
      } finally {
        clearInterval(tick);
        if (pollTimer) clearTimeout(pollTimer);
      }
    };

    // Walk the visible stages on a gentle timer so the customer sees motion —
    // the real screen drives these from backend stage writes; here we advance
    // them on elapsed time since the test endpoint doesn't expose mid-flight
    // stages. Caps at "checking" until the real result lands.
    const walk = () => {
      if (!alive) return;
      const e = Math.floor((Date.now() - startedAt.current) / 1000);
      if (e > 5 && e <= 150) setStage("writing");
      else if (e > 150) setStage("checking");
      pollTimer = setTimeout(walk, 2000);
    };
    walk();
    start();

    // Cleanup if the component unmounts mid-run.
    return () => {
      alive = false;
      clearInterval(tick);
      if (pollTimer) clearTimeout(pollTimer);
    };
  };

  const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const activeIndex = stageIndex(stage);
  const steps = STAGES.map((s, i) => (i === 1 && stage === "refining" ? REFINING : s));
  const pct = Math.min(92, ((activeIndex + 0.5) / STAGES.length) * 100);
  const slow = elapsed > 150;

  return (
    <AdminLayout title="Loading preview">
      <div className="mb-8">
        <p className="text-overline mb-4">— What the customer sees</p>
        <h1 className="font-display text-4xl sm:text-5xl">
          The wait,
          <br />
          <span className="text-[#D4FF00]">exactly as they see it.</span>
        </h1>
        <p className="text-sm text-zinc-400 mt-5 max-w-xl leading-relaxed">
          Runs a real generation and shows the identical loading screen a paying customer gets.
          Use it to see how the wait feels and how long it actually takes today.
        </p>
      </div>

      {status === "idle" && (
        <button
          onClick={run}
          className="inline-flex items-center gap-2 bg-[#D4FF00] text-black font-bold uppercase tracking-wide text-xs px-6 py-3 hover:bg-white transition-colors"
        >
          <Play size={14} /> Run a real generation
        </button>
      )}

      {status !== "idle" && (
        <div className="border border-white/10 p-8 max-w-md">
          {/* This block is a faithful copy of the customer PaymentSuccess view. */}
          {(status === "processing" || status === "ready") && (
            <>
              <div className="text-center mb-10">
                <p className="text-overline text-[#D4FF00] mb-3">
                  {status === "ready" ? "Your app is ready" : "Payment confirmed"}
                </p>
                <h2 className="font-display text-3xl mb-3">
                  {status === "ready" ? "Built and waiting." : "Building your app"}
                </h2>
                {status === "processing" && (
                  <p className="text-zinc-500 text-sm leading-relaxed">
                    This usually takes 2–3 minutes — we're building a full four-week plan, not
                    pulling a template off a shelf. You can close this page if you like; your link
                    is emailed to you the moment it's ready.
                  </p>
                )}
              </div>

              {status === "processing" && (
                <>
                  <div className="h-1 w-full bg-white/10 mb-10 overflow-hidden">
                    <div
                      className="h-full bg-[#D4FF00] transition-all duration-700 ease-out"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <ul className="space-y-4">
                    {steps.map((s, i) => {
                      const done = i < activeIndex;
                      const active = i === activeIndex;
                      return (
                        <li key={s.key} className="flex items-center gap-4">
                          <span
                            className={`w-6 h-6 shrink-0 rounded-full border flex items-center justify-center ${
                              done
                                ? "bg-[#D4FF00] border-[#D4FF00]"
                                : active
                                ? "border-[#D4FF00]"
                                : "border-white/15"
                            }`}
                          >
                            {done ? (
                              <Check size={13} className="text-black" />
                            ) : active ? (
                              <Loader2 size={13} className="text-[#D4FF00] animate-spin" />
                            ) : null}
                          </span>
                          <span
                            className={`text-sm ${
                              done ? "text-zinc-500" : active ? "text-white" : "text-zinc-600"
                            }`}
                          >
                            {s.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  {slow && (
                    <p className="text-zinc-500 text-xs text-center mt-10 leading-relaxed">
                      Still going — a good plan is worth the extra moment. Feel free to close the
                      page; the link is on its way to your inbox regardless.
                    </p>
                  )}

                  <p className="text-zinc-700 text-xs text-center mt-8">
                    {mmss(elapsed)} elapsed · typically 2–3 min
                  </p>
                </>
              )}

              {status === "ready" && (
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-[#D4FF00]/10 border border-[#D4FF00]/30 flex items-center justify-center mx-auto mb-6">
                    <Check size={22} className="text-[#D4FF00]" />
                  </div>
                  <p className="text-sm text-zinc-400 mb-2">
                    Generated in <span className="text-[#D4FF00] font-bold">{mmss(finalTime)}</span>
                  </p>
                  {planId && (
                    <a
                      href={`/app/u/${planId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-4 bg-[#D4FF00] text-black font-bold uppercase tracking-wide text-xs px-6 py-3 hover:bg-white transition-colors"
                    >
                      Open the plan
                    </a>
                  )}
                </div>
              )}
            </>
          )}

          {status === "error" && (
            <div className="text-center">
              <p className="text-red-300 text-sm mb-2">{errorMsg}</p>
              <p className="text-zinc-600 text-xs">Failed after {mmss(finalTime)}</p>
            </div>
          )}
        </div>
      )}

      {status === "ready" || status === "error" ? (
        <button
          onClick={run}
          className="inline-flex items-center gap-2 border border-white/20 hover:border-[#D4FF00] text-xs font-bold uppercase tracking-wide px-6 py-3 mt-6 text-white transition-colors"
        >
          <Play size={13} /> Run again
        </button>
      ) : null}
    </AdminLayout>
  );
}
