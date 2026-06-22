import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Building2 } from "lucide-react";
import { coachApi, setCoachToken, formatApiError } from "@/lib/coachApi";

export default function CoachAuth() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [brandName, setBrandName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    coachApi
      .get("/coach/me")
      .then(() => navigate("/coach/dashboard", { replace: true }))
      .catch(() => {});
  }, [navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = mode === "login" ? "/coach/login" : "/coach/signup";
      const body =
        mode === "login"
          ? { email, password }
          : { email, password, brand_name: brandName };
      const res = await coachApi.post(url, body);
      setCoachToken(res.data.token);
      toast.success(mode === "login" ? "Welcome back" : "Welcome to Planlete");
      navigate("/coach/dashboard");
    } catch (err) {
      toast.error(formatApiError(err, "Auth failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="grid md:grid-cols-2 min-h-screen">
        {/* Left side — pitch */}
        <div className="relative p-8 md:p-14 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/10 overflow-hidden">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-overline text-zinc-500 hover:text-[#D4FF00] transition-colors"
          >
            ← Planlete
          </Link>

          <div className="my-12">
            <p className="text-overline text-[#D4FF00] mb-6">— For coaches</p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[0.95]">
              Branded
              <br />
              client apps.
              <br />
              <span className="text-[#D4FF00]">No subscription.</span>
            </h1>
            <p className="text-base text-zinc-300 mt-8 leading-relaxed max-w-md">
              Built for PTs, gyms, sports clubs and rehab clinics who want
              white-label client apps without the monthly fee, the lock-in or
              the awkward cancellation. Pay only when you create a plan.
            </p>
            <ul className="mt-10 flex flex-col gap-3 text-sm text-zinc-300">
              <Bullet>Your logo · your brand colours</Bullet>
              <Bullet>4 expert-led templates to start from</Bullet>
              <Bullet>Unique shareable link per client</Bullet>
              <Bullet>No subscription · no tie-ins · no cancellation calls</Bullet>
            </ul>
          </div>

          <p className="text-overline text-[10px] text-zinc-600">
            Planlete — Built for You. By experts you trust.
          </p>
        </div>

        {/* Right side — form */}
        <div className="p-8 md:p-14 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto">
            <div className="flex items-center gap-2 mb-8">
              <Building2 size={20} className="text-[#D4FF00]" />
              <p className="text-overline">
                {mode === "login" ? "Coach sign in" : "Coach sign up"}
              </p>
            </div>
            <h2 className="font-display text-4xl mb-10">
              {mode === "login" ? (
                <>
                  Welcome
                  <br />
                  <span className="text-[#D4FF00]">back.</span>
                </>
              ) : (
                <>
                  Create your
                  <br />
                  <span className="text-[#D4FF00]">coach account.</span>
                </>
              )}
            </h2>

            <form
              data-testid="coach-auth-form"
              onSubmit={submit}
              className="flex flex-col gap-5"
            >
              {mode === "signup" && (
                <Field
                  label="Brand name"
                  hint="Your gym, studio or your own name."
                >
                  <input
                    data-testid="coach-brand-name"
                    required
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="Iron Lane Performance"
                    className="bg-transparent border-b border-white/20 focus:border-[#D4FF00] outline-none py-3 text-lg"
                  />
                </Field>
              )}
              <Field label="Email">
                <input
                  data-testid="coach-email"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="coach@yourbrand.com"
                  className="bg-transparent border-b border-white/20 focus:border-[#D4FF00] outline-none py-3 text-lg"
                />
              </Field>
              <Field
                label="Password"
                hint={mode === "signup" ? "Minimum 8 characters." : undefined}
              >
                <input
                  data-testid="coach-password"
                  required
                  type="password"
                  minLength={mode === "signup" ? 8 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-transparent border-b border-white/20 focus:border-[#D4FF00] outline-none py-3 text-lg tracking-widest"
                />
              </Field>

              <button
                data-testid="coach-submit"
                type="submit"
                disabled={loading}
                className="mt-6 inline-flex items-center justify-between gap-3 bg-[#D4FF00] text-black font-bold uppercase tracking-wider text-sm px-7 py-4 hover:bg-white transition-colors disabled:opacity-50"
              >
                <span>
                  {loading
                    ? mode === "login"
                      ? "Signing in…"
                      : "Creating…"
                    : mode === "login"
                    ? "Sign in"
                    : "Create account · free"}
                </span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                data-testid="coach-mode-toggle"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="text-overline text-zinc-400 hover:text-[#D4FF00] transition-colors mt-3 self-start"
              >
                {mode === "login"
                  ? "New here? Create a coach account →"
                  : "Already have an account? Sign in →"}
              </button>
            </form>

            <p className="text-xs text-zinc-500 mt-12">
              No subscription. No card needed to sign up.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bullet({ children }) {
  return (
    <li className="flex items-start gap-3">
      <span className="w-1.5 h-1.5 bg-[#D4FF00] rounded-full mt-2" />
      <span>{children}</span>
    </li>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-overline">{label}</label>
      {children}
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}
