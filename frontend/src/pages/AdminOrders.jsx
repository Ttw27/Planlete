import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AdminLayout from "@/components/AdminLayout";
import { ShoppingBag, RefreshCw, ChevronDown, ChevronUp, ExternalLink, Wand2 } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const STATUS_STYLES = {
  plan_created: { label: "Delivered", classes: "border-[#D4FF00]/30 bg-[#D4FF00]/5 text-[#D4FF00]" },
  processing: { label: "Processing", classes: "border-blue-500/30 bg-blue-500/5 text-blue-300" },
  paid_generation_failed: { label: "Failed — needs action", classes: "border-red-500/30 bg-red-500/5 text-red-300" },
  paid: { label: "Paid", classes: "border-white/20 bg-white/5 text-white" },
  pending: { label: "Awaiting payment", classes: "border-white/10 text-zinc-500" },
};

export default function AdminOrders() {
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [regenerating, setRegenerating] = useState(null);
  const [regenResult, setRegenResult] = useState({});

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
      .get(`${API}/admin/orders`, { headers: { "X-Admin-Token": t } })
      .then((res) => setOrders(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (token) load(token);
  }, [token]);

  const regenerate = async (order) => {
    setRegenerating(order.id);
    try {
      const res = await axios.post(
        `${API}/plans/generate`,
        { answers: order.answers },
        { headers: { "X-Admin-Token": token } }
      );
      setRegenResult((prev) => ({ ...prev, [order.id]: res.data.link }));
    } catch (err) {
      setRegenResult((prev) => ({
        ...prev,
        [order.id]: { error: err.response?.data?.detail || "Generation failed — check Railway logs." },
      }));
    } finally {
      setRegenerating(null);
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
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const needsAction = orders.filter((o) => o.status === "paid_generation_failed");
  const rest = orders.filter((o) => o.status !== "paid_generation_failed");

  const OrderCard = ({ order }) => {
    const isOpen = expanded === order.id;
    const style = STATUS_STYLES[order.status] || STATUS_STYLES.pending;
    const regen = regenResult[order.id];

    return (
      <div className={`border ${style.classes.split(" ")[0]} bg-white/[0.02]`}>
        <button
          onClick={() => setExpanded(isOpen ? null : order.id)}
          className="w-full flex items-center justify-between gap-4 px-4 py-4 text-left"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm text-white font-bold truncate">
                {order.answers?.name || "Unknown"}
              </p>
              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 border ${style.classes}`}>
                {style.label}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1 truncate">
              {order.answers?.goal || "—"} · {order.answers?.email || "no email"}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <p className="text-[10px] text-zinc-600 font-mono-display hidden sm:block">
              {formatDate(order.created_at)}
            </p>
            {isOpen ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
          </div>
        </button>

        {isOpen && (
          <div className="px-4 pb-4 border-t border-white/5 pt-4">
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-zinc-400 mb-4">
              {order.answers && Object.entries(order.answers).map(([k, v]) => (
                <p key={k}><span className="text-zinc-600">{k}:</span> {String(v) || "—"}</p>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500 mb-4">
              <span>Order ID: {order.id}</span>
              {order.stripe_session_id && <span>· Session: {order.stripe_session_id.slice(0, 20)}...</span>}
              {order.paid_at && <span>· Paid: {formatDate(order.paid_at)}</span>}
            </div>

            {order.error && (
              <div className="border border-red-500/20 bg-red-500/5 p-3 mb-4">
                <p className="text-xs text-red-300 break-words">{order.error}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {order.status === "plan_created" && order.plan_id && (
                <a
                  href={`/app/u/${order.plan_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border border-white/20 hover:border-[#D4FF00] text-xs font-bold uppercase tracking-wide px-4 py-2.5 text-white transition-colors"
                >
                  Open their app <ExternalLink size={13} />
                </a>
              )}
              <button
                onClick={() => regenerate(order)}
                disabled={regenerating === order.id || !order.answers}
                className="inline-flex items-center gap-2 bg-[#D4FF00] text-black font-bold uppercase tracking-wide text-xs px-4 py-2.5 hover:bg-white transition-colors disabled:opacity-50"
              >
                <Wand2 size={13} />
                {regenerating === order.id ? "Generating…" : "Generate plan manually"}
              </button>
            </div>

            {regen && (
              <div className="mt-3">
                {regen.error ? (
                  <p className="text-xs text-red-300">{regen.error}</p>
                ) : (
                  <a
                    href={regen}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-[#D4FF00] underline"
                  >
                    New plan ready — open it <ExternalLink size={12} />
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <AdminLayout title="Orders">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-overline mb-4">— Every payment attempt</p>
          <h1 className="font-display text-4xl sm:text-5xl">
            Every sale,
            <br />
            <span className="text-[#D4FF00]">what they asked for.</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-5 max-w-xl">
            Click an order to see their full questionnaire answers. If something failed
            during generation, "Generate plan manually" runs it again for free using their
            exact answers.
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
      ) : orders.length === 0 ? (
        <div className="border border-white/10 p-10 text-center">
          <ShoppingBag className="mx-auto mb-4 text-zinc-600" size={28} />
          <p className="text-zinc-400 text-sm">No orders yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {needsAction.length > 0 && (
            <div>
              <p className="text-overline text-red-300 mb-3">Needs action · {needsAction.length}</p>
              <div className="flex flex-col gap-2">
                {needsAction.map((o) => <OrderCard key={o.id} order={o} />)}
              </div>
            </div>
          )}
          <div>
            {needsAction.length > 0 && <p className="text-overline text-zinc-600 mb-3">All orders</p>}
            <div className="flex flex-col gap-2">
              {rest.map((o) => <OrderCard key={o.id} order={o} />)}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
