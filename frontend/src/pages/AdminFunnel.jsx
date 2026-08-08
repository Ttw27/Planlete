import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LABELS = {
  page_view: "Page views",
  builder_started: "Started building",
  builder_completed: "Finished the questions",
  checkout_opened: "Reached payment",
  payment_succeeded: "Paid",
  plan_opened: "Opened their plan",
};

/**
 * Where people drop out. The single most useful number here is the step with
 * the worst conversion — that's where the money is going, and it's almost
 * never the step you'd guess.
 */
export default function AdminFunnel() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    const t = localStorage.getItem("bfy_admin_token");
    if (!t) {
      navigate("/admin", { replace: true });
      return;
    }
    axios
      .get(`${API}/admin/funnel?days=${days}`, { headers: { "X-Admin-Token": t } })
      .then((res) => setData(res.data))
      .catch(() => {
        localStorage.removeItem("bfy_admin_token");
        navigate("/admin", { replace: true });
      });
  }, [days, navigate]);

  const worst = data?.funnel
    ?.filter((s) => s.conversion_from_previous !== null)
    .sort((a, b) => a.conversion_from_previous - b.conversion_from_previous)[0];

  const max = Math.max(1, ...(data?.funnel || []).map((s) => s.count));

  return (
    <div className="min-h-screen bg-[#050505] text-white px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <Link to="/admin" className="text-overline text-zinc-500 hover:text-white">
          ← Admin
        </Link>
        <h1 className="font-display text-4xl mt-6 mb-8">Funnel</h1>

        <div className="flex gap-2 mb-10">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-2 text-sm border transition-all ${
                days === d
                  ? "border-[#D4FF00] bg-[#D4FF00]/5 text-white"
                  : "border-white/15 text-zinc-400 hover:border-white/40"
              }`}
            >
              {d} days
            </button>
          ))}
        </div>

        {!data && <p className="text-overline text-zinc-500">Loading…</p>}

        {data && (
          <>
            <div className="space-y-4">
              {data.funnel.map((step) => (
                <div key={step.step}>
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-sm text-zinc-300">
                      {LABELS[step.step] || step.step}
                    </span>
                    <span className="font-mono-display text-sm text-white">
                      {step.count}
                      {step.conversion_from_previous !== null && (
                        <span
                          className={`ml-3 text-xs ${
                            step.conversion_from_previous < 30
                              ? "text-red-400"
                              : "text-zinc-500"
                          }`}
                        >
                          {step.conversion_from_previous}%
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 bg-white/5">
                    <div
                      className="h-full bg-[#D4FF00]"
                      style={{ width: `${(step.count / max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {worst && worst.count > 0 && (
              <div className="mt-10 border border-white/10 p-5">
                <p className="text-overline text-[#D4FF00] mb-2">Biggest drop-off</p>
                <p className="text-sm text-zinc-300">
                  {LABELS[worst.step] || worst.step} — only{" "}
                  <span className="text-white">{worst.conversion_from_previous}%</span> of
                  people get this far from the step before. That's where to look first.
                </p>
              </div>
            )}

            {data.funnel.every((s) => s.count === 0) && (
              <p className="text-sm text-zinc-500 mt-10">
                Nothing recorded yet. Events start appearing as soon as someone visits.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
