import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AdminLayout from "@/components/AdminLayout";
import { Mail, RefreshCw } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminLeads() {
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [leads, setLeads] = useState([]);
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

  const loadLeads = (t) => {
    setLoading(true);
    axios
      .get(`${API}/admin/leads`, { headers: { "X-Admin-Token": t } })
      .then((res) => setLeads(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (token) loadLeads(token);
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

  return (
    <AdminLayout title="Sample leads">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-overline mb-4">— Sample downloads</p>
          <h1 className="font-display text-4xl sm:text-5xl">
            Chase these up.
            <br />
            <span className="text-[#D4FF00]">Every email, logged.</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-5 max-w-xl">
            Anyone who downloads a free sample plan shows up here with their
            email and which plan they wanted — so you can follow up.
          </p>
        </div>
        <button
          onClick={() => loadLeads(token)}
          className="shrink-0 inline-flex items-center gap-2 border border-white/15 hover:border-white/40 text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-wide px-4 py-2 transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-zinc-500 text-sm">Loading leads…</p>
      ) : leads.length === 0 ? (
        <div className="border border-white/10 p-10 text-center">
          <Mail className="mx-auto mb-4 text-zinc-600" size={28} />
          <p className="text-zinc-400 text-sm">
            No sample downloads yet. Once someone requests a sample, their
            email will show up here.
          </p>
        </div>
      ) : (
        <div className="border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-zinc-500 text-xs uppercase tracking-widest">
                <th className="px-4 py-3 font-normal">Email</th>
                <th className="px-4 py-3 font-normal">Plan</th>
                <th className="px-4 py-3 font-normal">When</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3 text-white">{lead.email}</td>
                  <td className="px-4 py-3 text-zinc-400">{lead.plan_type}</td>
                  <td className="px-4 py-3 text-zinc-500 font-mono-display text-xs">
                    {formatDate(lead.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
