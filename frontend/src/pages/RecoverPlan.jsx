import { useState } from "react";

import axios from "axios";
import SiteHeader from "@/components/SiteHeader";
import { useSeo } from "@/lib/useSeo";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * "I've lost my plan." The emailed link is the only way into something the
 * customer paid for, so losing the email currently means losing the plan.
 * This re-sends every plan attached to an address — and only ever to that
 * address, so it can't be used to find out who is a customer.
 */
export default function RecoverPlan() {
  useSeo({
    title: "Lost Your Plan? — Planlete",
    description:
      "Enter the email you bought your plan with and we will send the link again.",
    canonical: "https://www.planlete.co.uk/recover",
  });

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!email.includes("@")) return;
    setSending(true);
    try {
      await axios.post(`${API}/plans/recover`, { email: email.trim() });
    } catch {
      // The endpoint answers identically either way, so there's nothing
      // useful to tell them on failure beyond the same message.
    } finally {
      setSending(false);
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <SiteHeader />
      <div className="max-w-xl mx-auto px-6 pt-28 pb-20">
        <p className="text-overline text-[#D4FF00] mb-4">Lost your plan?</p>
        <h1 className="font-display text-4xl sm:text-5xl mb-5">
          We'll send it again.
        </h1>

        {sent ? (
          <div className="border border-[#D4FF00]/30 bg-[#D4FF00]/5 p-5">
            <p className="text-sm text-zinc-300 leading-relaxed">
              If we've got a plan for that email, it's on its way to your inbox now.
              Have a look in spam if it doesn't turn up in a few minutes.
            </p>
            <p className="text-sm text-zinc-500 mt-4">
              Still nothing? Email{" "}
              <a
                href="mailto:hello@planlete.co.uk"
                className="text-[#D4FF00] underline"
              >
                hello@planlete.co.uk
              </a>{" "}
              and we'll sort it manually.
            </p>
          </div>
        ) : (
          <>
            <p className="text-zinc-400 leading-relaxed mb-8">
              Enter the email you used when you bought your plan and we'll send the
              link back to you. Your plan hasn't gone anywhere — it's exactly where
              you left it, logged sessions and all.
            </p>
            <div className="flex flex-wrap gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="you@example.com"
                autoFocus
                className="flex-1 min-w-[240px] bg-transparent border border-white/15 focus:border-[#D4FF00] outline-none px-4 py-3 text-white placeholder:text-white/25"
              />
              <button
                onClick={submit}
                disabled={sending || !email.includes("@")}
                className="bg-[#D4FF00] text-black font-bold uppercase tracking-wide text-sm px-6 py-3 hover:bg-white transition-colors disabled:opacity-40"
              >
                {sending ? "Sending…" : "Send my link"}
              </button>
            </div>
            <p className="text-xs text-zinc-600 mt-5">
              We'll only ever send plans to the address they were bought with.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
