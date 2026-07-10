import { Link } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-black text-white font-body">
      <SiteHeader />
      <div className="max-w-3xl mx-auto px-5 md:px-8 pt-32 pb-24">
        <p className="text-overline text-[#D4FF00] mb-4">— Legal</p>
        <h1 className="font-display text-4xl md:text-6xl uppercase leading-none tracking-tight mb-8">
          Privacy Policy
        </h1>
        <p className="text-zinc-500 text-sm mb-12">Last updated: July 2026</p>

        <div className="flex flex-col gap-8 text-zinc-300 leading-relaxed">
          <section>
            <h2 className="text-white font-display text-xl mb-3">Who we are</h2>
            <p>
              Planlete ("we", "us", "our") is operated by TEZL GROUP LTD, a company registered
              in the United Kingdom (company number: <strong className="text-yellow-400">[ADD COMPANY NUMBER]</strong>),
              registered office: <strong className="text-yellow-400">[ADD REGISTERED ADDRESS]</strong>.
              This policy explains what personal information we collect through planlete.co.uk,
              why we collect it, and what rights you have over it.
            </p>
          </section>

          <section>
            <h2 className="text-white font-display text-xl mb-3">What we collect</h2>
            <ul className="list-disc pl-5 flex flex-col gap-2">
              <li>Your name and email address, when you build a plan or download a free sample.</li>
              <li>Your training questionnaire answers — goal, experience level, days available, equipment, session length, and any notes you choose to add (see "Health information" below).</li>
              <li>Payment is processed entirely by Stripe. We never see or store your card details ourselves.</li>
              <li>Basic technical data (such as your device type and general location) automatically collected by our hosting providers for security and performance purposes.</li>
              <li>Logged training data (e.g. weights or reps you choose to record) associated with your plan.</li>
              <li>Messages you send us through the contact/support form.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-display text-xl mb-3">Health information — special category data</h2>
            <p>
              The questionnaire includes an optional field for injuries, allergies, or other
              health-related notes. Under UK GDPR, this counts as "special category data"
              because it relates to your health. We only ask for it, and only use it, to
              personalise the exercises and nutrition guidance in your plan — to avoid
              recommending something unsuitable given what you've told us. By entering
              information in this field, you are giving us your explicit consent to process
              it for this specific purpose. You do not have to provide this information, and
              the field can be left blank.
            </p>
          </section>

          <section>
            <h2 className="text-white font-display text-xl mb-3">If you're a coach or physio</h2>
            <p>
              If you sign up for a coach account, we additionally collect your business name,
              logo, and brand colours (used to present your clients' plans under your own
              branding), your login details, and subscription billing information (handled by
              Stripe — we don't store your card details). Any client details and plan content
              you enter is stored so it can be delivered to your client, and remains visible to
              you and to the client it was created for.
            </p>
          </section>

          <section>
            <h2 className="text-white font-display text-xl mb-3">How we use your information</h2>
            <ul className="list-disc pl-5 flex flex-col gap-2">
              <li>To generate your personalised training plan and deliver it to you by email.</li>
              <li>To process your payment via Stripe and keep a record of the transaction.</li>
              <li>To respond to support requests you send us.</li>
              <li>To improve Planlete — for example, understanding which sample plans are most popular.</li>
              <li>We do not sell your personal information to third parties.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-display text-xl mb-3">Where your data is stored</h2>
            <p>
              Your information is stored on MongoDB Atlas (database hosting) and processed by
              Railway (application hosting) and Anthropic (to generate your plan's content via
              their Claude API). Payments are processed by Stripe. Emails are sent via Resend.
              Each of these providers has its own security and privacy practices; we choose
              providers who maintain appropriate safeguards for personal data.
            </p>
          </section>

          <section>
            <h2 className="text-white font-display text-xl mb-3">How long we keep it</h2>
            <p>
              We keep your plan and account information for as long as you might reasonably
              want to access your app — plans don't expire. If you'd like your data deleted
              entirely, contact us (details below) and we'll remove it, save for records we're
              legally required to keep (such as transaction records for tax purposes).
            </p>
          </section>

          <section>
            <h2 className="text-white font-display text-xl mb-3">Your rights</h2>
            <p>
              Under UK GDPR you have the right to access, correct, or delete your personal
              data, to object to or restrict certain processing, and to data portability.
              To exercise any of these rights, contact us using the details below.
            </p>
          </section>

          <section>
            <h2 className="text-white font-display text-xl mb-3">Cookies and local storage</h2>
            <p>
              Planlete does not currently use tracking or advertising cookies. Your app does save
              a small amount of data directly on your device — such as which exercises you've
              ticked off — purely so the app remembers your progress between visits. This is
              strictly functional storage, not tracking, and isn't shared with us or anyone else.
              If our use of cookies changes in future, this policy will be updated and, where
              required, we'll ask for your consent first.
            </p>
          </section>

          <section>
            <h2 className="text-white font-display text-xl mb-3">Contact us</h2>
            <p>
              Questions about this policy or your data can be sent to{" "}
              <a href="mailto:hello@planlete.co.uk" className="text-[#D4FF00] underline">
                hello@planlete.co.uk
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-white font-display text-xl mb-3">Changes to this policy</h2>
            <p>
              We may update this policy from time to time. Material changes will be reflected
              by an updated "last updated" date at the top of this page.
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
