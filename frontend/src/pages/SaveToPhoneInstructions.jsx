import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Check, Monitor, Smartphone } from "lucide-react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * Instruction page that shows how to save an app to phone, 
 * then offers a button to go to the actual app link
 */
export default function SaveToPhoneInstructions() {
  const { id } = useParams();
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    axios
      .get(`${API}/plans/${id}`)
      .then((res) => {
        if (alive) setPlan(res.data);
      })
      .catch(() => alive && setError("Plan not found"));
    return () => {
      alive = false;
    };
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <p className="text-overline mb-4">404</p>
          <h2 className="font-display text-4xl">This plan doesn't exist.</h2>
          <Link
            to="/build"
            className="inline-block mt-8 bg-[#D4FF00] text-black font-bold uppercase tracking-wider text-xs px-6 py-3"
          >
            Build a new one
          </Link>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <p className="text-overline text-[#D4FF00] animate-pulse">
          Loading…
        </p>
      </div>
    );
  }

  const appLink = `/app/u/${id}`;
  const name = plan.answers?.name || "Your";

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="max-w-3xl mx-auto px-5 md:px-8 py-20">
        {/* Header */}
        <div className="mb-16">
          <p className="text-overline text-[#D4FF00] mb-4">✓ Plan ready</p>
          <h1 className="font-display text-5xl md:text-6xl mb-6">
            Save {name}'s app to your phone.
          </h1>
          <p className="text-xl text-zinc-300 max-w-xl">
            Your personalised training app is ready. Here's how to save it so you can access it anytime, like a normal app.
          </p>
        </div>

        {/* Two column instructions */}
        <div className="grid md:grid-cols-2 gap-12 mb-16">
          {/* iOS */}
          <div className="border border-white/10 p-8 rounded">
            <div className="flex items-center gap-3 mb-6">
              <Smartphone size={24} className="text-[#D4FF00]" />
              <h3 className="font-display text-2xl">iPhone / iPad</h3>
            </div>
            <ol className="space-y-4 text-zinc-300">
              <li className="flex gap-3">
                <span className="font-bold text-[#D4FF00] min-w-fit">1.</span>
                <span>Tap the <strong>Share button</strong> (arrow pointing up)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-[#D4FF00] min-w-fit">2.</span>
                <span>Scroll and tap <strong>"Add to Home Screen"</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-[#D4FF00] min-w-fit">3.</span>
                <span>Tap <strong>"Add"</strong> in the top right</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-[#D4FF00] min-w-fit">4.</span>
                <span>It's now on your home screen like a real app</span>
              </li>
            </ol>
          </div>

          {/* Android */}
          <div className="border border-white/10 p-8 rounded">
            <div className="flex items-center gap-3 mb-6">
              <Smartphone size={24} className="text-[#D4FF00]" />
              <h3 className="font-display text-2xl">Android</h3>
            </div>
            <ol className="space-y-4 text-zinc-300">
              <li className="flex gap-3">
                <span className="font-bold text-[#D4FF00] min-w-fit">1.</span>
                <span>Tap the <strong>Menu button</strong> (three dots)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-[#D4FF00] min-w-fit">2.</span>
                <span>Tap <strong>"Install app"</strong> or <strong>"Add to home screen"</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-[#D4FF00] min-w-fit">3.</span>
                <span>Tap <strong>"Install"</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-[#D4FF00] min-w-fit">4.</span>
                <span>It's now on your home screen like a real app</span>
              </li>
            </ol>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-[#D4FF00]/5 border border-[#D4FF00]/20 p-8 rounded mb-8">
          <h3 className="font-bold text-lg mb-4">Ready?</h3>
          <p className="text-zinc-300 mb-6">
            Open the link below and follow the steps above to save it to your phone. You can then use it offline and come back anytime.
          </p>
          <Link
            to={appLink}
            className="inline-flex items-center gap-3 bg-[#D4FF00] text-black font-bold uppercase tracking-wide text-sm px-8 py-4 hover:bg-white transition-colors"
          >
            Go to {name}'s app →
          </Link>
        </div>

        {/* Tips */}
        <div className="space-y-4 text-sm text-zinc-500">
          <p>
            <strong className="text-zinc-300">💡 Tip:</strong> Bookmark this link or check your email — we sent you a link you can save.
          </p>
          <p>
            <strong className="text-zinc-300">📱 Works offline:</strong> Once saved to your home screen, you can use it without internet (after first load).
          </p>
          <p>
            <strong className="text-zinc-300">🔄 Updates:</strong> New features arrive automatically whenever we push updates.
          </p>
        </div>
      </div>
    </div>
  );
}
