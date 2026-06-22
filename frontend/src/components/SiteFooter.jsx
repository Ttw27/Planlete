import { Link } from "react-router-dom";
import { useContent } from "@/lib/useContent";
import { CONTENT_DEFAULTS } from "@/lib/contentKeys";

export default function SiteFooter() {
  const headline = useContent("footer_headline", CONTENT_DEFAULTS.footer_headline);
  const cta = useContent("footer_cta", CONTENT_DEFAULTS.footer_cta);
  return (
    <footer
      data-testid="site-footer"
      className="relative border-t border-white/10 bg-[#050505] mt-16"
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-16 md:py-24">
        <div className="grid md:grid-cols-12 gap-12">
          <div className="md:col-span-7">
            <p className="text-overline mb-6">— Footer / CTA</p>
            <h3 className="font-display text-3xl sm:text-5xl lg:text-6xl text-white mb-8 max-w-3xl">
              {headline}
            </h3>
            <Link
              to="/build"
              data-testid="footer-cta"
              className="inline-flex items-center gap-3 bg-[#D4FF00] text-black font-bold uppercase tracking-wider text-sm px-7 py-4 hover:bg-white transition-colors"
            >
              {cta}
              <span aria-hidden>→</span>
            </Link>
            <p className="text-sm text-zinc-500 mt-5 max-w-md">
              Free samples available above.{" "}
              <span className="text-[#D4FF00]">Launch offer:</span> £4.99{" "}
              <span className="line-through">£20</span> · no subscription · one-off payment.
            </p>
          </div>

          <div className="md:col-span-5 md:pl-12 md:border-l md:border-white/10 flex flex-col gap-6">
            <div>
              <p className="text-overline mb-3">Planlete · Built for You</p>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Training apps built around you — athletes, everyday people,
                football players, sprinters and rehab clients. One-off. No
                subscription.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm text-zinc-400">
              <Link
                to="/app/athlete"
                className="hover:text-[#D4FF00] transition-colors"
              >
                Athlete app
              </Link>
              <Link
                to="/app/longevity"
                className="hover:text-[#D4FF00] transition-colors"
              >
                Longevity app
              </Link>
              <Link
                to="/app/football"
                className="hover:text-[#D4FF00] transition-colors"
              >
                Football app
              </Link>
              <Link
                to="/app/sprinter"
                className="hover:text-[#D4FF00] transition-colors"
              >
                Sprinter app
              </Link>
              <Link
                to="/build"
                className="hover:text-[#D4FF00] transition-colors"
              >
                Build my plan
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between gap-4 text-xs text-zinc-500 font-mono-display">
          <p>© {new Date().getFullYear()} PLANLETE — Built for You. All rights reserved.</p>
          <p className="uppercase tracking-[0.2em]">
            Your plan · Your app · No gym required
          </p>
        </div>
      </div>
    </footer>
  );
}
