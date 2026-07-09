import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AdminLayout from "@/components/AdminLayout";
import { LifeBuoy, RefreshCw, Check } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminSupport() {
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem("bfy_admin_token");
    if (!t) {
      navigate("/admin", { replace: true });
      return;
    }
    axios
      .get(`${API}/admin/verify`, { headers: { "X-Admin-Token": t } })
      .then(() => setToken(t))
      .catch(() => {
        localStorage.removeItem("bfy_admin_token");
        navigate("/admin", { replace: true });
      });
  }, [navigate]);

  const load = (t) => {
    setLoading(true);
    axios
      .get(`${API}/admin/support`, { headers: { "X-Admin-Token": t } })
      .then((res) => setRequests(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (token) load(token);
  }, [token]);

  const resolve = async (id) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, resolved: true } : r)));
    try {
      await axios.patch(`${API}/admin/support/${id}/resolve`, null, {
        headers: { "X-Admin-Token": token },
      });
    } catch {
      load(token); // revert to real state if the call failed
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-zinc-400">
        Loading…
      </div>
    );
  }

  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const unresolved = requests.filter((r) => !r.resolved);
  const resolved = requests.filter((r) => r.resolved);

  return (
    <AdminLayout title="Support requests">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-overline mb-4">— Contact requests</p>
          <h1 className="font-display text-4xl sm:text-5xl">
            Anyone stuck,
            <br />
            <span className="text-[#D4FF00]">right here.</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-5 max-w-xl">
            Submitted from any error page — payment issues, broken links,
            anything. If someone's flagged a charge, sort it fast.
          </p>
        </div>
        <button
          onClick={() => load(token)}
          className="shrink-0 inline-flex items-center gap-2 border border-white/15 hover:border-white/40 text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-wide px-4 py-2 transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-zinc-500 text-sm">Loading…</p>
      ) : requests.length === 0 ? (
        <div className="border border-white/10 p-10 text-center">
          <LifeBuoy className="mx-auto mb-4 text-zinc-600" size={28} />
          <p className="text-zinc-400 text-sm">Nothing here yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {unresolved.length > 0 && (
            <div>
              <p className="text-overline text-[#D4FF00] mb-3">
                Needs a reply · {unresolved.length}
              </p>
              <div className="flex flex-col gap-3">
                {unresolved.map((r) => (
                  <div key={r.id} className="border border-[#D4FF00]/30 bg-[#D4FF00]/5 p-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <p className="text-sm text-white font-bold">{r.email}</p>
                        <p className="text-[11px] text-zinc-500 font-mono-display mt-0.5">
                          {formatDate(r.created_at)}
                          {r.order_id && ` · order ${r.order_id}`}
                        </p>
                      </div>
                      <button
                        onClick={() => resolve(r.id)}
                        className="shrink-0 flex items-center gap-1.5 border border-white/20 hover:border-[#D4FF00] text-zinc-300 hover:text-white text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 transition-colors"
                      >
                        <Check size={12} /> Mark resolved
                      </button>
                    </div>
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap">{r.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {resolved.length > 0 && (
            <div>
              <p className="text-overline text-zinc-600 mb-3">
                Resolved · {resolved.length}
              </p>
              <div className="flex flex-col gap-2">
                {resolved.map((r) => (
                  <div key={r.id} className="border border-white/5 p-4 opacity-50">
                    <p className="text-sm text-zinc-400">{r.email}</p>
                    <p className="text-[11px] text-zinc-600 font-mono-display mt-0.5">
                      {formatDate(r.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
