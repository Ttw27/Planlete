import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AdminLayout from "@/components/AdminLayout";
import PlanBuilderForm from "@/components/PlanBuilderForm";
import { ExternalLink, Copy, Check } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminPlanBuilder() {
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

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

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await axios.post(`${API}/admin/plans/manual`, payload, {
        headers: { "X-Admin-Token": token },
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't save this plan.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-zinc-400">
        Loading…
      </div>
    );
  }

  const fullLink = result ? `${window.location.origin}${result.link}` : "";
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <AdminLayout title="Manual plan builder">
      <div className="mb-8">
        <p className="text-overline mb-4">— No AI, no payment, admin only</p>
        <h1 className="font-display text-4xl sm:text-5xl">
          Build a plan
          <br />
          <span className="text-[#D4FF00]">exactly as typed.</span>
        </h1>
        <p className="text-sm text-zinc-400 mt-5 max-w-xl">
          Same builder coaches use, minus payment and the disclaimer — for building your own
          reference plans, one-off requests, or anything you want to hand-craft directly.
        </p>
      </div>

      {error && (
        <div className="mb-6 border border-red-500/30 bg-red-500/5 p-4 max-w-2xl">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {result && (
        <div className="mb-6 border border-[#D4FF00]/30 bg-[#D4FF00]/5 p-5 max-w-2xl">
          <p className="text-sm font-bold text-white mb-3">Plan saved ✓</p>
          <div className="flex items-center gap-2">
            <a
              href={fullLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-[#D4FF00] text-black font-bold uppercase tracking-wide text-xs px-4 py-3 hover:bg-white transition-colors"
            >
              Open plan <ExternalLink size={14} />
            </a>
            <button
              onClick={copyLink}
              className="flex items-center gap-2 border border-white/20 hover:border-[#D4FF00] text-xs font-bold uppercase tracking-wide px-4 py-3 text-white transition-colors"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
      )}

      <PlanBuilderForm
        mode="admin"
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel="Save & generate link"
      />
    </AdminLayout>
  );
}
