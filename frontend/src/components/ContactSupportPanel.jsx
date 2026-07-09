import { useState } from "react";
import axios from "axios";
import { Mail, Check } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const SUPPORT_EMAIL = "hello@planlete.co.uk";

/**
 * Drop-in contact panel for error states across the app (payment issues,
 * broken links, anything going wrong). Saves the message to the backend
 * (so it's never lost even if the person has no email app configured) and
 * also offers a direct mailto as a fallback/preference.
 *
 * Props:
 *   context     — optional string auto-included in the message, e.g.
 *                 "Order ID: xxx / Session: yyy" or the error text itself,
 *                 so support has what they need without back-and-forth.
 *   orderId     — optional, stored alongside the request for lookup
 *   sessionId   — optional, stored alongside the request for lookup
 */
export default function ContactSupportPanel({ context = "", orderId = null, sessionId = null }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(context ? `${context}\n\n` : "");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const mailtoHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    "Planlete — need some help"
  )}&body=${encodeURIComponent(context ? `${context}\n\n` : "")}`;

  const submit = async (e) => {
    e.preventDefault();
    if (!email.includes("@") || !message.trim()) return;
    setSubmitting(true);
    try {
      await axios.post(`${API}/support/contact`, {
        email,
        message: message.trim(),
        order_id: orderId,
        session_id: sessionId,
      });
      setSubmitted(true);
    } catch {
      // Fall back to mailto — still get the message even if the API call fails
      window.location.href = mailtoHref;
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="border border-[#D4FF00]/30 bg-[#D4FF00]/5 p-5 text-left">
        <div className="flex items-center gap-2 mb-2">
          <Check size={16} className="text-[#D4FF00]" />
          <p className="text-sm font-bold text-white">Got it — we'll reply within the hour</p>
        </div>
        <p className="text-xs text-zinc-400">
          If you were charged, that's already logged against your message — nothing extra to do.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-white/10 p-5 text-left">
      <p className="text-overline text-[#D4FF00] mb-3">Talk to us directly</p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full bg-black/40 border border-white/15 focus:border-[#D4FF00] outline-none text-sm text-white px-3 py-2.5 placeholder:text-white/20"
        />
        <textarea
          placeholder="What's going on?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          required
          className="w-full bg-black/40 border border-white/15 focus:border-[#D4FF00] outline-none text-sm text-white px-3 py-2.5 placeholder:text-white/20 resize-none"
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#D4FF00] text-black font-bold uppercase tracking-wide text-xs px-4 py-3 hover:bg-white transition-colors disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Send — we reply within the hour"}
        </button>
      </form>
      <a
        href={mailtoHref}
        className="mt-3 flex items-center justify-center gap-2 text-xs text-zinc-500 hover:text-white transition-colors"
      >
        <Mail size={12} /> Or email us directly at {SUPPORT_EMAIL}
      </a>
    </div>
  );
}
