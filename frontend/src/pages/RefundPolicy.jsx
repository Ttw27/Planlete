import { Link } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-black text-white font-body">
      <SiteHeader />
      <div className="max-w-3xl mx-auto px-5 md:px-8 pt-32 pb-24">
        <p className="text-overline text-[#D4FF00] mb-4">— Legal</p>
        <h1 className="font-display text-4xl md:text-6xl uppercase leading-none tracking-tight mb-8">
          Refund Policy
        </h1>
        <p className="text-zinc-500 text-sm mb-12">Last updated: July 2026</p>

        <div className="flex flex-col gap-8 text-zinc-300 leading-relaxed">
          <section>
            <h2 className="text-white font-display text-xl mb-3">One-off plan purchases — your right to cancel</h2>
            <p>
              Under UK consumer law, you normally have a 14-day right to cancel an online
              purchase. However, because Planlete generates and delivers your personalised
              plan immediately (usually within a couple of hours of payment), this right is
              lost once your plan has been generated and delivered to you — the same way it
              would be for any instantly-delivered digital product. By completing your
              purchase and providing your questionnaire answers, you acknowledge and agree
              that generation begins promptly and that your cancellation right ends once your
              plan has been delivered. This section covers one-off plan purchases (the AI
              questionnaire and self-serve builder); coach subscriptions and client plans are
              covered separately below.
            </p>
          </section>

          <section>
            <h2 className="text-white font-display text-xl mb-3">When we will refund you</h2>
            <ul className="list-disc pl-5 flex flex-col gap-2">
              <li>If you were charged but never received your plan due to a technical fault on our end, and we're unable to resolve it promptly.</li>
              <li>If your plan is clearly broken, incomplete, or doesn't match the schema it should (for example, missing entire weeks or sections).</li>
              <li>If you were charged more than once for the same purchase due to an error.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-display text-xl mb-3">Coach subscriptions</h2>
            <p>
              Coach subscriptions are billed on a recurring basis and can be cancelled at any
              time from your dashboard, or by contacting us — cancellation takes effect at the
              end of your current billing period, and you keep access until then. We don't
              provide refunds for the current billing period once it's begun, but you won't be
              charged again after cancelling. If you're charged in error (for example, a
              duplicate charge or a charge after you'd already cancelled), contact us and we'll
              refund it.
            </p>
          </section>

          <section>
            <h2 className="text-white font-display text-xl mb-3">Client-pays plans (via a coach)</h2>
            <p>
              If your coach doesn't have an active subscription, you may be asked to pay a
              one-off fee to unlock the plan they've built for you. The same right-to-cancel
              position as our one-off plan purchases applies — once the plan is unlocked and
              delivered, the 14-day cancellation right ends, since it's an instantly-delivered
              digital product.
            </p>
          </section>

          <section>
            <h2 className="text-white font-display text-xl mb-3">What isn't covered</h2>
            <p>
              We don't offer refunds simply because you've changed your mind after receiving a
              working, complete plan, or because the specific exercises or nutrition
              suggestions weren't to your taste — the whole point of the one-off, low price is
              that you're welcome to build a fresh plan (for a new £4.99 charge) any time your
              goals or circumstances change, rather than needing a refund on the original.
            </p>
          </section>

          <section>
            <h2 className="text-white font-display text-xl mb-3">How to request a refund</h2>
            <p>
              Contact us at{" "}
              <a href="mailto:hello@planlete.co.uk" className="text-[#D4FF00] underline">
                hello@planlete.co.uk
              </a>{" "}
              with your order details (or use the contact form shown if you ever land on an
              error page) and we'll respond within one working day. Approved refunds are
              processed back to your original payment method via Stripe and typically appear
              within 5–10 business days, depending on your bank.
            </p>
          </section>

          <section>
            <h2 className="text-white font-display text-xl mb-3">Your statutory rights</h2>
            <p>
              This policy doesn't affect your statutory rights as a consumer under UK law.
            </p>
          </section>
        </div>

        <Link
          to="/"
          className="inline-block mt-16 border border-white/20 text-white font-bold uppercase tracking-wider text-xs px-6 py-3 hover:border-[#D4FF00] hover:text-[#D4FF00] transition-colors"
        >
          Back to home
        </Link>
      </div>
      <SiteFooter />
    </div>
  );
}
