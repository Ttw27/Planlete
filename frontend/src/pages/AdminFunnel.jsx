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
                  {LABELS[worst.step] || worst.step}: only{" "}
                  <span className="text-white">{worst.conversion_from_previous}%</span> of
                  people get this far from the step before. That's where to look first.
                </p>
              </div>
            )}

            {data.by_source?.length > 0 && (
              <div className="mt-12">
                <p className="text-overline text-[#D4FF00] mb-2">Where they came from</p>
                <p className="text-xs text-zinc-500 mb-4">
                  Visitors per source, then how many started, reached payment and paid. Use
                  ?utm_source=instagram (or tiktok, facebook) on bio links so they show by name.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-zinc-500 text-xs">
                        <th className="py-2 pr-4 font-normal">Source</th>
                        <th className="py-2 pr-4 font-normal text-right">Visits</th>
                        <th className="py-2 pr-4 font-normal text-right">Started</th>
                        <th className="py-2 pr-4 font-normal text-right">Payment page</th>
                        <th className="py-2 font-normal text-right">Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.by_source.map((row) => (
                        <tr key={row.source} className="border-t border-white/10">
                          <td className="py-2 pr-4 text-zinc-300">{row.source}</td>
                          <td className="py-2 pr-4 text-right font-mono-display">{row.page_view}</td>
                          <td className="py-2 pr-4 text-right font-mono-display">{row.builder_started}</td>
                          <td className="py-2 pr-4 text-right font-mono-display">{row.checkout_opened}</td>
                          <td className="py-2 text-right font-mono-display text-[#D4FF00]">
                            {row.payment_succeeded}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
