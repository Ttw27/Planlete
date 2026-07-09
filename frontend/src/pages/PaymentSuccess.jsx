import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Check, X } from "lucide-react";
import ContactSupportPanel from "@/components/ContactSupportPanel";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * Landing point after Stripe redirects back from checkout. Confirms payment
 * with the backend (never trusts the redirect alone). Plan generation now
 * happens in the background on the server — this page just confirms the
 * payment went through and tells the person to expect an email, rather than
 * making them wait on a loading screen for an AI generation that can take
 * up to 20-30 seconds.
 */
export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("confirming"); // confirming | processing | error
  const [errorMessage, setErrorMessage] = useState("");
  const [orderInfo, setOrderInfo] = useState({ orderId: null, sessionId: null });

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const orderId = searchParams.get("order_id");
    setOrderInfo({ orderId, sessionId });

    if (!sessionId || !orderId) {
      setStatus("error");
      setErrorMessage("Missing payment details in the link. If you were charged, contact us and we'll sort it.");
      return;
    }

    let alive = true;
    axios
      .get(`${API}/checkout/confirm`, { params: { session_id: sessionId, order_id: orderId } })
      .then(() => {
        if (!alive) return;
        setStatus("processing");
      })
      .catch((err) => {
        if (!alive) return;
        setStatus("error");
        setErrorMessage(
          err.response?.data?.detail ||
            "Something went wrong confirming your payment. If you were charged, contact us and we'll sort it."
        );
      });

    return () => {
      alive = false;
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

  if (status === "processing") {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 rounded-full bg-[#D4FF00]/10 border border-[#D4FF00]/30 flex items-center justify-center mx-auto mb-6">
            <Check size={24} className="text-[#D4FF00]" />
          </div>
          <p className="text-overline text-[#D4FF00] mb-3">Payment confirmed</p>
          <h2 className="font-display text-3xl mb-4">You're all set.</h2>
          <p className="text-zinc-400 text-sm leading-relaxed mb-2">
            We're building your personalised 4-week programme now. You'll get an email at the
            address you gave us with your app link and instructions on how to install it —
            usually within a couple of hours.
          </p>
          <p className="text-zinc-600 text-xs mt-6">
            You can close this page — there's nothing else to do here.
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
