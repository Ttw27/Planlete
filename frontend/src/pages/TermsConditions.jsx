import { Link } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function TermsConditions() {
  return (
    <div className="min-h-screen bg-black text-white font-body">
      <SiteHeader />
      <div className="max-w-3xl mx-auto px-5 md:px-8 pt-32 pb-24">
        <p className="text-overline text-[#D4FF00] mb-4">— Legal</p>
        <h1 className="font-display text-4xl md:text-6xl uppercase leading-none tracking-tight mb-8">
          Terms & Conditions
        </h1>
        <p className="text-zinc-500 text-sm mb-12">Last updated: July 2026</p>

        <div className="flex flex-col gap-8 text-zinc-300 leading-relaxed">
          <section>
            <h2 className="text-white font-display text-xl mb-3">1. Who we are</h2>
            <p>
              Planlete (planlete.co.uk) is operated by TEZL GROUP LTD, a company registered in
              the United Kingdom (company number: <strong className="text-yellow-400">[ADD COMPANY NUMBER]</strong>),
              registered office: <strong className="text-yellow-400">[ADD REGISTERED ADDRESS]</strong>.
              By using this site or purchasing a plan, you agree to these terms.
            </p>
            <p className="mt-3">
              You must be 18 or over to purchase a plan or create a coach account. Planlete
              is not intended for use by children.
            </p>
          </section>

          <section>
            <h2 className="text-white font-display text-xl mb-3">2. What Planlete is</h2>
            <p>
              Planlete generates a personalised training and nutrition programme using
              artificial intelligence (Claude, by Anthropic), based on the answers you provide
              in our questionnaire. Your plan is delivered as a web app accessible via a link,
              which you can save to your phone's home screen.
            </p>
          </section>

          <section>
            <h2 className="text-white font-display text-xl mb-3">3. Not medical or professional advice</h2>
            <p>
              Planlete is not a substitute for professional coaching, physiotherapy, or medical
              advice. Your plan is generated automatically based on the information you provide
              and has not been reviewed by a human coach, physiotherapist, or doctor. You should
              consult a doctor or other qualified healthcare professional before starting any
              new exercise or nutrition programme, particularly if you have an existing injury,
              medical condition, or are pregnant. If any exercise causes pain, stop immediately
              and seek appropriate advice. Some sample plans and generated programmes may
              include contact/combat-sport elements (such as sparring) intended only for
              suitably experienced individuals training in a supervised, appropriate setting —
              you are responsible for assessing whether any activity is suitable for you.
            </p>
          </section>

          <section>
            <h2 className="text-white font-display text-xl mb-3">4. Payment and pricing</h2>
            <p>
              Plans are sold as a one-off payment (currently £4.99 as a launch offer; the
              standard price is £20). This is a single payment for a single generated plan, not
              a subscription. If your goals, circumstances, or health change, you're welcome to
              purchase a new plan at any time — each plan is independently generated and
              charged for separately. Payments are processed securely by Stripe; we do not
              store your card details.
            </p>
          </section>

          <section>
            <h2 className="text-white font-display text-xl mb-3">5. Coaches, subscriptions, and client plans</h2>
            <p>
              Coaches and physios may create an account to build branded plans for their own
              clients. Subscribing gives a coach unlimited client plans for as long as the
              subscription is active; subscriptions are billed on a recurring basis via Stripe
              and can be cancelled at any time, taking effect at the end of the current billing
              period. Without an active subscription, each client is instead charged a one-off
              fee to unlock their individual plan.
            </p>
            <p className="mt-3">
              Any exercise, nutrition, or recovery content a coach enters is entirely their own
              professional input — Planlete does not write, review, check, or endorse this
              content, and the coach is solely responsible for its accuracy and suitability for
              their client. Coaches confirm this explicitly before any client plan is saved.
              Content must be lawful, must be the coach's own original work (or content they
              have the right to use), and must not infringe anyone else's intellectual property.
            </p>
          </section>

          <section>
            <h2 className="text-white font-display text-xl mb-3">6. Refunds</h2>
            <p>
              See our separate <Link to="/refunds" className="text-[#D4FF00] underline">Refund Policy</Link> for
              full details.
            </p>
          </section>

          <section>
            <h2 className="text-white font-display text-xl mb-3">7. Accuracy of generated content</h2>
            <p>
              While we design our system to produce safe, sensible, and personalised
              programmes, AI-generated content can occasionally be imperfect or contain
              errors. We ask that you use common sense when following any plan, and contact
              us if something looks clearly wrong so we can help.
            </p>
          </section>

          <section>
            <h2 className="text-white font-display text-xl mb-3">8. Your account and data</h2>
            <p>
              See our <Link to="/privacy" className="text-[#D4FF00] underline">Privacy Policy</Link> for
              details on what information we collect and how it's used.
            </p>
          </section>

          <section>
            <h2 className="text-white font-display text-xl mb-3">9. Acceptable use</h2>
            <p>
              You agree not to misuse Planlete — including attempting to access other
              customers' plans, reverse-engineer the service, or use it in any way that could
              harm the platform or other users.
            </p>
          </section>

          <section>
            <h2 className="text-white font-display text-xl mb-3">10. Limitation of liability</h2>
            <p>
              To the fullest extent permitted by law, Planlete and TEZL GROUP LTD are not
              liable for any injury, loss, or damage arising from your use of a generated
              training or nutrition plan. Nothing in these terms limits liability that cannot
              be excluded under UK law, including liability for death or personal injury
              caused by negligence.
            </p>
          </section>

          <section>
            <h2 className="text-white font-display text-xl mb-3">11. Changes to these terms</h2>
            <p>
              We may update these terms from time to time. Continued use of Planlete after
              changes are posted means you accept the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-white font-display text-xl mb-3">12. Contact</h2>
            <p>
              Questions about these terms:{" "}
              <a href="mailto:hello@planlete.co.uk" className="text-[#D4FF00] underline">
                hello@planlete.co.uk
              </a>.
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
