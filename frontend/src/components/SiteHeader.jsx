import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <header
      data-testid="site-header"
      className={`fixed top-8 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "backdrop-blur-xl bg-black/70 border-b border-white/10"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
        <Link
          to="/"
          data-testid="brand-logo"
          className="flex items-center gap-2 group"
        >
          <span className="font-display text-[15px] tracking-tight uppercase text-white group-hover:text-[#D4FF00] transition-colors leading-none">
            Planlete
          </span>
          <span className="w-1 h-1 bg-[#D4FF00] rounded-full" />
          <span className="font-mono-display text-[10px] tracking-[0.22em] uppercase text-zinc-500 group-hover:text-zinc-300 transition-colors">
            Built for You
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <a
            href="/#how"
            data-testid="nav-how"
            className="text-overline hover:text-white transition-colors"
          >
            How it works
          </a>
          <a
            href="/#samples"
            data-testid="nav-samples"
            className="text-overline hover:text-white transition-colors"
          >
            Sample apps
          </a>
          <a
            href="/#pricing"
            data-testid="nav-pricing"
            className="text-overline hover:text-white transition-colors"
          >
            Pricing
          </a>
          <a
            href="/#b2b"
            data-testid="nav-b2b"
            className="text-overline hover:text-white transition-colors"
          >
            For coaches
          </a>
          <Link
            to="/build"
            data-testid="nav-cta"
            className="bg-[#D4FF00] text-black font-bold uppercase tracking-wide text-xs px-5 py-2.5 hover:bg-white transition-colors"
          >
            Build my plan
          </Link>
        </nav>

        <button
          data-testid="mobile-menu-toggle"
          className="md:hidden text-white"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div
          data-testid="mobile-menu"
          className="md:hidden bg-black border-t border-white/10 px-5 py-6 flex flex-col gap-5"
        >
          <a href="/#how" className="text-overline">
            How it works
          </a>
          <a href="/#samples" className="text-overline">
            Sample apps
          </a>
          <a href="/#pricing" className="text-overline">
            Pricing
          </a>
          <a href="/#b2b" className="text-overline">
            For coaches
          </a>
          <Link
            to="/build"
            data-testid="nav-cta-mobile"
            className="bg-[#D4FF00] text-black font-bold uppercase tracking-wide text-xs px-5 py-3 inline-block text-center"
          >
            Build my plan — £4.99
          </Link>
        </div>
      )}
    </header>
  );
}
