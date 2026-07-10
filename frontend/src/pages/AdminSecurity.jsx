import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AdminLayout from "@/components/AdminLayout";
import { ShieldAlert, RefreshCw, CheckCircle2, XCircle } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminSecurity() {
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [attempts, setAttempts] = useState([]);
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
      .get(`${API}/admin/login-attempts`, { headers: { "X-Admin-Token": t } })
      .then((res) => setAttempts(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (token) load(token);
  }, [token]);

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
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const failedCount = attempts.filter((a) => !a.success).length;

  return (
    <AdminLayout title="Security & login activity">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-overline mb-4">— Admin login attempts</p>
          <h1 className="font-display text-4xl sm:text-5xl">
            Every login,
            <br />
            <span className="text-[#D4FF00]">who and where from.</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-5 max-w-xl">
            Every attempt to log into this admin panel — successful or not — with IP address
            and a rough location. After 5 failed attempts from the same IP within 15 minutes,
            further attempts are automatically blocked for 15 minutes.
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

      {failedCount > 0 && (
        <div className="mb-6 border border-yellow-500/30 bg-yellow-500/5 p-4 flex items-center gap-3">
          <ShieldAlert size={18} className="text-yellow-400 shrink-0" />
          <p className="text-sm text-yellow-100">
            {failedCount} failed login attempt{failedCount === 1 ? "" : "s"} recorded. If you don't
            recognise these, consider rotating your admin password and token.
          </p>
        </div>
      )}

      {loading ? (
        <p className="text-zinc-500 text-sm">Loading…</p>
      ) : attempts.length === 0 ? (
        <div className="border border-white/10 p-10 text-center">
          <p className="text-zinc-400 text-sm">No login attempts recorded yet.</p>
        </div>
      ) : (
        <div className="border border-white/10 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-zinc-500 text-xs uppercase tracking-widest">
                <th className="px-4 py-3 font-normal">Status</th>
                <th className="px-4 py-3 font-normal">IP address</th>
                <th className="px-4 py-3 font-normal">Location</th>
                <th className="px-4 py-3 font-normal">When</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    {a.success ? (
                      <span className="inline-flex items-center gap-1.5 text-[#D4FF00] text-xs font-bold uppercase">
                        <CheckCircle2 size={13} /> Success
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-red-400 text-xs font-bold uppercase">
                        <XCircle size={13} /> Failed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white font-mono-display text-xs">{a.ip}</td>
                  <td className="px-4 py-3 text-zinc-400">{a.location}</td>
                  <td className="px-4 py-3 text-zinc-500 font-mono-display text-xs">{formatDate(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
