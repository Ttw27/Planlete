import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { Check, X, Loader2 } from "lucide-react";
import ContactSupportPanel from "@/components/ContactSupportPanel";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * Landing point after Stripe redirects back from checkout. Confirms payment
 * with the backend (never trusts the redirect alone), then polls for the live
 * generation stage.
 *
 * The stages reported here are real — the backend writes each one onto the
 * order as it happens, rather than this page animating a plausible-looking
 * lie. The customer has already been charged at this point, so a screen that
 * visibly moves is the difference between waiting patiently and assuming the
 * thing has crashed with their money.
 */

const STAGES = [
  { key: "reading", label: "Reading your answers" },
  { key: "writing", label: "Writing your 4-week programme" },
  { key: "checking", label: "Running quality checks" },
  { key: "saving", label: "Building your app" },
];

// Shown in place of "writing" when a QA check rejected the first attempt and
// generation is going round again. Being honest about this is better than
// freezing on a stage that has silently restarted.
const REFINING = { key: "refining", label: "Adjusting a few things" };

function stageIndex(stage) {
  if (stage === "refining") return 1;
  const i = STAGES.findIndex((s) => s.key === stage);
  return i === -1 ? 0 : i;
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("confirming"); // confirming | processing | ready | error
  const [stage, setStage] = useState("reading");
  const [elapsed, setElapsed] = useState(0);
  const [planId, setPlanId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [orderInfo, setOrderInfo] = useState({ orderId: null, sessionId: null });
  const startedAt = useRef(Date.now());

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const orderId = searchParams.get("order_id");
    setOrderInfo({ orderId, sessionId });

    if (!sessionId || !orderId) {
      setStatus("error");
      setErrorMessage(
        "Missing payment details in the link. If you were charged, contact us and we'll sort it."
      );
      return;
    }

    let alive = true;
    let timer = null;

    const poll = async () => {
      try {
        const res = await axios.get(`${API}/checkout/confirm`, {
          params: { session_id: sessionId, order_id: orderId },
        });
        if (!alive) return;

        const data = res.data || {};
        if (data.stage) setStage(data.stage);

        if (data.status === "plan_created" && data.plan_id) {
          setPlanId(data.plan_id);
          setStatus("ready");
          return; // stop polling
        }

        setStatus("processing");
        timer = setTimeout(poll, 2500);
      } catch (err) {
        if (!alive) return;
        setStatus("error");
        setErrorMessage(
          err.response?.data?.detail ||
            "Something went wrong confirming your payment. If you were charged, contact us and we'll sort it."
        );
      }
    };

    poll();

    const tick = setInterval(() => {
      if (alive) setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "error") {
    const context = `Payment issue on Planlete.\nOrder ID: ${orderInfo.orderId || "unknown"}\nSession ID: ${orderInfo.sessionId || "unknown"}\nError shown: ${errorMessage}`;
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-8">
        <div className="text-center max-w-md w-full">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
            <X size={24} className="text-red-400" />
          </div>
          <h2 className="font-display text-3xl mb-4">We couldn't confirm that</h2>
          <p className="text-zinc-400 text-sm leading-relaxed mb-8">{errorMessage}</p>

          <ContactSupportPanel
            context={context}
            orderId={orderInfo.orderId}
            sessionId={orderInfo.sessionId}
          />

          <Link
            to="/build"
            className="inline-block mt-6 border border-white/20 text-white font-bold uppercase tracking-wider text-xs px-6 py-3 hover:border-white transition-colors"
          >
            Back to the questionnaire
          </Link>
        </div>
      </div>
    );
  }

  if (status === "ready" && planId) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 rounded-full bg-[#D4FF00]/10 border border-[#D4FF00]/30 flex items-center justify-center mx-auto mb-6">
            <Check size={24} className="text-[#D4FF00]" />
          </div>
          <p className="text-overline text-[#D4FF00] mb-3">Your app is ready</p>
          <h2 className="font-display text-3xl mb-4">Built and waiting.</h2>
          <p className="text-zinc-400 text-sm leading-relaxed mb-8">
            We've also emailed the link, so you'll never lose it.
          </p>
          <Link
            to={`/app/u/${planId}/save-instructions`}
            className="inline-block bg-[#D4FF00] text-black font-bold uppercase tracking-wider text-sm px-8 py-4 hover:bg-white transition-colors"
          >
            Open my app
          </Link>
        </div>
      </div>
    );
  }

  if (status === "processing") {
    const activeIndex = stageIndex(stage);
    const steps = STAGES.map((s, i) =>
      i === 1 && stage === "refining" ? REFINING : s
    );
    // Never shows 100% — the bar completing is the plan actually being ready,
    // not an animation reaching the end of itself.
    const pct = Math.min(92, ((activeIndex + 0.5) / STAGES.length) * 100);
    const slow = elapsed > 150;

    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-10">
            <p className="text-overline text-[#D4FF00] mb-3">Payment confirmed</p>
            <h2 className="font-display text-3xl mb-3">Building your app</h2>
            <p className="text-zinc-500 text-sm leading-relaxed">
              This usually takes 2–3 minutes — we're building a full four-week plan, not pulling a
              template off a shelf. You can close this page if you like; your link is emailed to you
              the moment it's ready.
            </p>
          </div>

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
              Still going — a good plan is worth the extra moment, and we're checking the detail
              rather than rushing it. Feel free to close the page; the link is on its way to your
              inbox regardless.
            </p>
          )}

          <p className="text-zinc-700 text-xs text-center mt-8">
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} elapsed · typically 2–3 min
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-14 h-14 rounded-full bg-[#D4FF00]/10 border border-[#D4FF00]/30 flex items-center justify-center mx-auto mb-6 animate-pulse">
          <Check size={24} className="text-[#D4FF00]" />
        </div>
        <p className="text-overline text-[#D4FF00] mb-3">Confirming your payment…</p>
      </div>
    </div>
  );
}
