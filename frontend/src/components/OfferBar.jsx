import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

export default function OfferBar() {
  return (
    <div
      data-testid="offer-bar"
      className="fixed top-0 left-0 right-0 z-[60] bg-[#D4FF00] text-black"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-8 flex items-center justify-center gap-3 text-[11px] font-bold uppercase tracking-widest">
        <Zap size={12} className="hidden sm:block" />
        <span className="hidden sm:inline">Launch offer</span>
        <span className="hidden sm:inline opacity-60">·</span>
        <span>
          <span className="hidden sm:inline">Build your app for </span>
          <span className="line-through opacity-50 font-normal">£20</span>{" "}
          £4.99
        </span>
        <span className="opacity-60">·</span>
        <span className="hidden md:inline">Limited time</span>
        <Link
          to="/build"
          data-testid="offer-bar-cta"
          className="underline ml-1 hover:no-underline"
        >
          Claim →
        </Link>
      </div>
    </div>
  );
}
