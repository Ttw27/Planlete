import { Link } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white font-body">
      <SiteHeader />
      <div className="max-w-3xl mx-auto px-5 md:px-8 pt-32 pb-24 flex flex-col items-center justify-center text-center">
        <p className="text-overline text-[#D4FF00] mb-4">— 404</p>
        <h1 className="font-display text-5xl md:text-7xl uppercase leading-none tracking-tight mb-6">
          Page not found
        </h1>
        <p className="text-zinc-400 text-lg max-w-md mb-12">
          This page doesn't exist, or maybe it moved. Let's get you back on track.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-[#D4FF00] text-black font-bold uppercase tracking-wider text-sm px-8 py-4 hover:bg-white transition-colors"
        >
          Back to home
        </Link>
      </div>
      <SiteFooter />
    </div>
  );
}
