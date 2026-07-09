import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Check, X } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * Landing point after Stripe redirects back from checkout. Confirms payment
 * with the backend (never trusts the redirect alone), which generates the
 * plan only once payment is verified, then sends the person on to the
 * save-to-phone instructions for their new app.
 */
export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("confirming"); // confirming | error
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const orderId = searchParams.get("order_id");

    if (!sessionId || !orderId) {
      setStatus("error");
      setErrorMessage("Missing payment details in the link. If you were charged, contact us and we'll sort it.");
      return;
    }

    let alive = true;
    axios
      .get(`${API}/checkout/confirm`, { params: { session_id: sessionId, order_id: orderId } })
      .then((res) => {
        if (!alive) return;
        const id = res.data.id;
        navigate(`/app/u/${id}/save-instructions`, { replace: true });
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
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
            <X size={24} className="text-red-400" />
          </div>
          <h2 className="font-display text-3xl mb-4">We couldn't confirm that</h2>
          <p className="text-zinc-400 text-sm leading-relaxed mb-8">{errorMessage}</p>
          <Link
            to="/build"
            className="inline-block bg-[#D4FF00] text-black font-bold uppercase tracking-wider text-xs px-6 py-3"
          >
            Back to the questionnaire
          </Link>
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
        <p className="text-overline text-[#D4FF00] mb-3">Payment confirmed</p>
        <h2 className="font-display text-3xl mb-4">Building your app…</h2>
        <p className="text-zinc-400 text-sm">
          This takes a few seconds — we're generating your personalised 4-week programme now.
        </p>
      </div>
    </div>
  );
}
