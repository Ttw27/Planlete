import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  LogOut,
  Plus,
  ExternalLink,
  Trash2,
  Upload,
  Save,
  Copy,
  Building2,
  Pencil,
  CreditCard,
  Check,
} from "lucide-react";
import {
  coachApi,
  setCoachToken,
  resolveAssetUrl,
  formatApiError,
} from "@/lib/coachApi";

export default function CoachDashboard() {
  const navigate = useNavigate();
  const [coach, setCoach] = useState(null);
  const [clients, setClients] = useState([]);
  const [tab, setTab] = useState("clients");
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    coachApi
      .get("/coach/me")
      .then((res) => setCoach(res.data))
      .catch(() => {
        setCoachToken(null);
        navigate("/coach", { replace: true });
      });
    coachApi
      .get("/coach/clients")
      .then((res) => setClients(res.data))
      .catch(() => setClients([]));
  }, [navigate]);

  const logout = async () => {
    try {
      await coachApi.post("/coach/logout");
    } catch {
      /* ignore */
    }
    setCoachToken(null);
    navigate("/coach");
  };

  const refreshClients = async () => {
    try {
      const res = await coachApi.get("/coach/clients");
      setClients(res.data);
    } catch {
      /* ignore */
    }
  };

  const subscribe = async () => {
    setSubscribing(true);
    try {
      const res = await coachApi.post("/coach/subscribe/create-session");
      window.location.href = res.data.checkout_url;
    } catch (err) {
      toast.error(formatApiError(err, "Couldn't start checkout"));
      setSubscribing(false);
    }
  };

  if (!coach) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-zinc-400">
        Loading…
      </div>
    );
  }

  const subscribed = coach.subscription_status === "active";

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="border-b border-white/10 sticky top-0 z-40 bg-black/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-overline text-[#D4FF00]">
              Planlete · Coach
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-overline">{coach.brand_name}</span>
          </div>
          <div className="flex items-center gap-4">
            {subscribed ? (
              <span className="text-overline text-[#D4FF00] inline-flex items-center gap-2">
                <Check size={14} /> Subscribed
              </span>
            ) : (
              <button
                onClick={subscribe}
                disabled={subscribing}
                className="text-overline text-black bg-[#D4FF00] hover:bg-white px-4 py-2 inline-flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <CreditCard size={14} />
                {subscribing ? "Redirecting…" : "Subscribe"}
              </button>
            )}
            <Link
              to="/"
              target="_blank"
              className="text-overline hover:text-[#D4FF00] inline-flex items-center gap-2"
            >
              View Planlete <ExternalLink size={14} />
            </Link>
            <button
              data-testid="coach-logout"
              onClick={logout}
              className="text-overline hover:text-white inline-flex items-center gap-2"
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-5 md:px-8 py-10 md:py-14">
        <div className="flex items-baseline justify-between mb-12 flex-wrap gap-4">
          <div>
            <p className="text-overline text-[#D4FF00] mb-3">
              Welcome, {coach.brand_name}
            </p>
            <h1 className="font-display text-4xl sm:text-5xl">
              Build branded plans
              <br />
              <span className="text-[#D4FF00]">for your clients.</span>
            </h1>
            <p className="text-sm text-zinc-400 mt-4 max-w-xl">
              {subscribed
                ? "You're subscribed — every client plan you create is included, no extra charge."
                : "No subscription? Each client pays a one-off fee to unlock their plan. Subscribe above for unlimited clients included."}
            </p>
          </div>
        </div>

        <div className="flex gap-1 mb-8 border-b border-white/10">
          <TabButton id="clients" tab={tab} setTab={setTab}>
            Client plans ({clients.length})
          </TabButton>
          <TabButton id="brand" tab={tab} setTab={setTab}>
            Brand & logo
          </TabButton>
        </div>

        {tab === "clients" ? (
          <ClientsTab
            coach={coach}
            clients={clients}
            refresh={refreshClients}
          />
        ) : (
          <BrandTab coach={coach} setCoach={setCoach} />
        )}
      </div>
    </div>
  );
}

function TabButton({ id, tab, setTab, children }) {
  const active = tab === id;
  return (
    <button
      data-testid={`coach-tab-${id}`}
      onClick={() => setTab(id)}
      className={`px-5 py-3 text-overline transition-colors -mb-px border-b-2 ${
        active
          ? "text-[#D4FF00] border-[#D4FF00]"
          : "text-zinc-500 hover:text-white border-transparent"
      }`}
    >
      {children}
    </button>
  );
}

function ClientsTab({ coach, clients, refresh }) {
  return (
    <div>
      <div className="mb-6">
        <Link
          to="/coach/builder"
          data-testid="new-client-button"
          className="inline-flex items-center gap-3 bg-[#D4FF00] text-black font-bold uppercase tracking-wider text-sm px-7 py-4 hover:bg-white transition-colors"
        >
          <Plus size={16} />
          New client plan
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="border border-white/10 border-dashed p-12 text-center">
          <p className="font-display text-2xl mb-2">No client plans yet.</p>
          <p className="text-sm text-zinc-400">
            Create your first branded client plan above.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/10">
          {clients.map((c) => (
            <ClientCard
              key={c.id}
              client={c}
              coach={coach}
              refresh={refresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ClientCard({ client, coach, refresh }) {
  const url = `${window.location.origin}/c/${coach.slug}/${client.slug}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy");
    }
  };
  const del = async () => {
    if (!window.confirm(`Delete plan for ${client.client_name}?`)) return;
    try {
      await coachApi.delete(`/coach/clients/${client.id}`);
      toast.success("Deleted");
      refresh();
    } catch {
      toast.error("Delete failed");
    }
  };

  const statusBadge = {
    included: { label: "Included", classes: "text-[#D4FF00] border-[#D4FF00]/30" },
    paid: { label: "Paid", classes: "text-[#D4FF00] border-[#D4FF00]/30" },
    pending_payment: { label: "Awaiting client payment", classes: "text-yellow-400 border-yellow-400/30" },
  }[client.payment_status] || { label: client.payment_status, classes: "text-zinc-500 border-white/10" };

  return (
    <div
      data-testid={`client-card-${client.slug}`}
      className="bg-[#0a0a0a] p-5 flex flex-col gap-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xl">{client.client_name}</p>
          <p className="text-overline text-[10px] mt-1">
            {new Date(client.created_at).toLocaleDateString()}
          </p>
        </div>
        <button
          data-testid={`delete-client-${client.slug}`}
          onClick={del}
          className="text-zinc-500 hover:text-red-400 transition-colors"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <span className={`self-start text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 border ${statusBadge.classes}`}>
        {statusBadge.label}
      </span>

      {client.notes && (
        <p className="text-xs text-zinc-400 leading-relaxed border-l-2 border-white/10 pl-3">
          {client.notes}
        </p>
      )}
      <div className="flex gap-2 mt-auto">
        <Link
          to={`/c/${coach.slug}/${client.slug}`}
          target="_blank"
          data-testid={`open-client-${client.slug}`}
          className="flex-1 bg-[#D4FF00] text-black font-bold uppercase tracking-wider text-[11px] px-3 py-2 inline-flex items-center justify-center gap-2 hover:bg-white transition-colors"
        >
          <ExternalLink size={12} /> Open
        </Link>
        <Link
          to={`/coach/builder/${client.id}`}
          className="border border-white/15 text-white font-bold uppercase tracking-wider text-[11px] px-3 py-2 inline-flex items-center gap-2 hover:bg-white/5 transition-colors"
        >
          <Pencil size={12} /> Edit
        </Link>
        <button
          data-testid={`copy-client-${client.slug}`}
          onClick={copy}
          className="border border-white/15 text-white font-bold uppercase tracking-wider text-[11px] px-3 py-2 inline-flex items-center gap-2 hover:bg-white/5 transition-colors"
        >
          <Copy size={12} />
        </button>
      </div>
    </div>
  );
}

function BrandTab({ coach, setCoach }) {
  const [brandName, setBrandName] = useState(coach.brand_name);
  const [primary, setPrimary] = useState(coach.primary_color || "#D4FF00");
  const [secondary, setSecondary] = useState(coach.secondary_color || "#050505");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const dirty =
    brandName !== coach.brand_name ||
    primary !== coach.primary_color ||
    secondary !== coach.secondary_color;

  const save = async () => {
    setSaving(true);
    try {
      const res = await coachApi.patch("/coach/me", {
        brand_name: brandName,
        primary_color: primary,
        secondary_color: secondary,
      });
      setCoach(res.data);
      toast.success("Brand updated");
    } catch (err) {
      toast.error(formatApiError(err, "Couldn't save"));
    } finally {
      setSaving(false);
    }
  };

  const onLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Image files only");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Max 4MB");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await coachApi.post("/coach/logo", fd);
      const me = await coachApi.get("/coach/me");
      setCoach(me.data);
      toast.success("Logo updated");
    } catch (err) {
      toast.error(formatApiError(err, "Upload failed"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const logoSrc = coach.logo_url ? resolveAssetUrl(coach.logo_url) : null;

  return (
    <div className="grid md:grid-cols-2 gap-px bg-white/10">
      {/* Identity card */}
      <div className="bg-[#0a0a0a] p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <Building2 size={18} className="text-[#D4FF00]" />
          <p className="text-overline">Identity</p>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-overline">Brand name</label>
            <input
              data-testid="brand-name-input"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="bg-transparent border-b border-white/20 focus:border-[#D4FF00] outline-none py-3 text-lg"
            />
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-overline">Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-black border border-white/10 overflow-hidden flex items-center justify-center">
                {logoSrc ? (
                  <img
                    src={logoSrc}
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-overline text-[10px] text-zinc-600 text-center px-2">
                    No logo
                  </span>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={onLogo}
                className="hidden"
                data-testid="logo-file-input"
              />
              <button
                data-testid="upload-logo"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 border border-white/20 px-4 py-2.5 text-overline hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                <Upload size={14} />
                {uploading ? "Uploading…" : logoSrc ? "Replace logo" : "Upload logo"}
              </button>
            </div>
            <p className="text-xs text-zinc-500">
              Square or transparent PNG works best. Max 4MB.
            </p>
          </div>
        </div>
      </div>

      {/* Colours + preview */}
      <div className="bg-[#0a0a0a] p-6 md:p-8">
        <p className="text-overline mb-6">— Brand colours</p>
        <div className="grid grid-cols-2 gap-5 mb-8">
          <ColorPicker
            label="Primary (accent)"
            testid="primary-color"
            value={primary}
            setValue={setPrimary}
          />
          <ColorPicker
            label="Secondary (background)"
            testid="secondary-color"
            value={secondary}
            setValue={setSecondary}
          />
        </div>

        {/* Preview */}
        <p className="text-overline mb-3">Preview</p>
        <div
          className="border border-white/10 p-5"
          style={{ backgroundColor: secondary, color: "white" }}
        >
          <div className="flex items-center gap-3 mb-4">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt="Logo"
                className="w-8 h-8 object-contain bg-white p-0.5"
              />
            ) : (
              <div className="w-8 h-8 bg-white/10" />
            )}
            <p className="text-overline">{brandName}</p>
          </div>
          <p className="font-display text-2xl mb-2">Today&apos;s session</p>
          <div
            className="border-l-2 px-3 py-2 mt-3"
            style={{ borderColor: primary, background: "rgba(255,255,255,0.04)" }}
          >
            <p className="text-sm">Back Squat</p>
            <p className="font-mono-display text-sm" style={{ color: primary }}>
              5 × 5
            </p>
          </div>
        </div>

        <button
          data-testid="brand-save"
          onClick={save}
          disabled={!dirty || saving}
          className="mt-8 inline-flex items-center gap-3 bg-[#D4FF00] text-black font-bold uppercase tracking-wider text-sm px-6 py-3 hover:bg-white transition-colors disabled:opacity-50 disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          <Save size={14} />
          {saving ? "Saving…" : dirty ? "Save brand" : "Saved"}
        </button>
      </div>
    </div>
  );
}

function ColorPicker({ label, value, setValue, testid }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-overline">{label}</label>
      <div className="flex items-center gap-3 border border-white/10 px-3 py-2">
        <input
          data-testid={`${testid}-swatch`}
          type="color"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-9 h-9 bg-transparent border-0 cursor-pointer p-0"
        />
        <input
          data-testid={`${testid}-hex`}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="bg-transparent text-sm font-mono-display uppercase outline-none flex-1"
        />
      </div>
    </div>
  );
}
