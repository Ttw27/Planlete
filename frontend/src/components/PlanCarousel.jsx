import { useState } from "react";
import { ChevronLeft, ChevronRight, Download, Check, X } from "lucide-react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ─── Email Gate ──────────────────────────────────────────────────────────────
function EmailGate({ planLabel, onClose, onSuccess }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/leads/sample`, { email, plan_type: planLabel });
      onSuccess();
    } catch (error) {
      console.error("Lead capture error:", error);
      toast.error("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur flex items-end md:items-center justify-center p-4">
      <div className="bg-zinc-900 border border-white/10 w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white"
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <p className="font-display text-2xl uppercase mb-1">Download this sample</p>
        <p className="text-zinc-400 text-sm mb-6">
          Pop your email in and we'll send you the link — plus show you how to save it to your phone.
        </p>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            className="w-full bg-transparent border-b border-white/20 focus:border-[#D4FF00] outline-none text-lg py-3 placeholder:text-white/20"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-3 bg-[#D4FF00] text-black font-bold uppercase tracking-wide text-xs px-6 py-3 hover:bg-white transition-colors disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Get my sample"}
          </button>
        </form>
        <p className="text-xs text-zinc-600 mt-4">No spam. Just your sample link.</p>
      </div>
    </div>
  );
}

// ─── Save to Phone Instructions ─────────────────────────────────────────────
function SaveInstructions({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur flex items-end md:items-center justify-center p-4">
      <div className="bg-zinc-900 border border-white/10 w-full max-w-md p-6">
        <p className="font-display text-2xl uppercase mb-1">Save to your phone</p>
        <p className="text-zinc-400 text-sm mb-6">Follow the steps for your device below.</p>

        <div className="flex flex-col gap-5">
          {/* iPhone */}
          <div className="border border-white/10 p-4">
            <p className="text-overline text-[#D4FF00] mb-3">iPhone / Safari</p>
            <ol className="flex flex-col gap-2 text-sm text-zinc-300">
              <li className="flex gap-3"><span className="text-[#D4FF00] font-mono-display shrink-0">01</span>Tap the <strong className="text-white">Share</strong> button at the bottom of Safari (the box with an arrow pointing up)</li>
              <li className="flex gap-3"><span className="text-[#D4FF00] font-mono-display shrink-0">02</span>Scroll down and tap <strong className="text-white">"Add to Home Screen"</strong></li>
              <li className="flex gap-3"><span className="text-[#D4FF00] font-mono-display shrink-0">03</span>Tap <strong className="text-white">Add</strong> — it appears on your home screen like an app</li>
            </ol>
          </div>

          {/* Samsung / Android Chrome */}
          <div className="border border-white/10 p-4">
            <p className="text-overline text-[#D4FF00] mb-3">Samsung / Android Chrome</p>
            <ol className="flex flex-col gap-2 text-sm text-zinc-300">
              <li className="flex gap-3"><span className="text-[#D4FF00] font-mono-display shrink-0">01</span>Tap the <strong className="text-white">three dots menu</strong> (⋮) in the top right of Chrome</li>
              <li className="flex gap-3"><span className="text-[#D4FF00] font-mono-display shrink-0">02</span>Tap <strong className="text-white">"Add to Home screen"</strong></li>
              <li className="flex gap-3"><span className="text-[#D4FF00] font-mono-display shrink-0">03</span>Tap <strong className="text-white">Add</strong> — done</li>
            </ol>
          </div>

          {/* Other Android */}
          <div className="border border-white/10 p-4">
            <p className="text-overline text-[#D4FF00] mb-3">Other Android browsers</p>
            <ol className="flex flex-col gap-2 text-sm text-zinc-300">
              <li className="flex gap-3"><span className="text-[#D4FF00] font-mono-display shrink-0">01</span>Tap the browser <strong className="text-white">menu</strong> (usually ⋮ or ☰)</li>
              <li className="flex gap-3"><span className="text-[#D4FF00] font-mono-display shrink-0">02</span>Look for <strong className="text-white">"Add to Home screen"</strong> or <strong className="text-white">"Install app"</strong></li>
              <li className="flex gap-3"><span className="text-[#D4FF00] font-mono-display shrink-0">03</span>Confirm — it saves to your home screen</li>
            </ol>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 bg-[#D4FF00] text-black font-bold uppercase tracking-wide text-xs px-6 py-3 hover:bg-white transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

// ─── Plan Carousel ───────────────────────────────────────────────────────────
/**
 * Props:
 *   images       — object from useImages() hook, keyed by imageKey
 *   slides       — array of { imageKey, fallback, caption? }
 *   planLabel    — e.g. "Football Player"
 *   buildHref    — defaults to "/build"
 */
export default function PlanCarousel({ images = {}, slides = [], planLabel = "This plan", buildHref = "/build" }) {
  const [current, setCurrent] = useState(0);
  const [showEmailGate, setShowEmailGate] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const total = slides.length;

  if (total === 0) return null;

  const prev = () => setCurrent((c) => (c - 1 + total) % total);
  const next = () => setCurrent((c) => (c + 1) % total);

  const slide = slides[current];
  const imgSrc = images?.[slide.imageKey] || slide.fallback;

  const handleDownloadClick = () => {
    setShowEmailGate(true);
  };

  const handleEmailSuccess = () => {
    setShowEmailGate(false);
    setDownloaded(true);
    setShowInstructions(true);
  };

  return (
    <>
      {showEmailGate && (
        <EmailGate
          planLabel={planLabel}
          onClose={() => setShowEmailGate(false)}
          onSuccess={handleEmailSuccess}
        />
      )}
      {showInstructions && <SaveInstructions onClose={() => setShowInstructions(false)} />}

      <div className="w-full bg-zinc-950 border-b border-white/10">
        {/* Images */}
        <div className="relative aspect-[16/9] overflow-hidden">
          <img
            key={imgSrc}
            src={imgSrc}
            alt={slide.caption || planLabel}
            className="w-full h-full object-cover transition-opacity duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

          {/* Counter */}
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur px-3 py-1 text-xs font-mono text-zinc-400">
            {String(current + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </div>

          {/* Caption */}
          {slide.caption && (
            <p className="absolute bottom-4 left-5 right-5 text-sm text-zinc-300">{slide.caption}</p>
          )}

          {/* Arrow overlays */}
          {total > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 backdrop-blur flex items-center justify-center text-white hover:text-[#D4FF00] transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 backdrop-blur flex items-center justify-center text-white hover:text-[#D4FF00] transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>

        {/* Dots + actions */}
        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Dots */}
          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === current ? "bg-[#D4FF00]" : "bg-white/20"
                }`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleDownloadClick}
              className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide px-4 py-2 border transition-colors ${
                downloaded
                  ? "border-[#D4FF00] text-[#D4FF00]"
                  : "border-white/20 text-white hover:border-white"
              }`}
            >
              {downloaded ? <Check size={12} /> : <Download size={12} />}
              {downloaded ? "Sent" : "Download sample"}
            </button>
            <Link
              to={buildHref}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide px-4 py-2 bg-[#D4FF00] text-black hover:bg-white transition-colors"
            >
              Build mine — £4.99
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
