import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { RotateCcw, Save } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { CONTENT_GROUPS } from "@/lib/contentKeys";
import { useAllContent, notifyContentChanged } from "@/lib/useContent";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminContent() {
  const navigate = useNavigate();
  const overrides = useAllContent();
  const [token, setToken] = useState(null);

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

  if (!token) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-zinc-400">
        Loading…
      </div>
    );
  }

  return (
    <AdminLayout title="Text content">
      <div className="mb-10">
        <p className="text-overline mb-4">— Content editor</p>
        <h1 className="font-display text-4xl sm:text-5xl">
          Rewrite anything.
          <br />
          <span className="text-[#D4FF00]">Anytime you want.</span>
        </h1>
        <p className="text-sm text-zinc-400 mt-5 max-w-xl">
          Edit any text on the public site. Hit Save to push live. Reset to
          revert to the original copy.
        </p>
      </div>

      <div className="flex flex-col gap-12">
        {CONTENT_GROUPS.map((group) => (
          <section key={group.id} data-testid={`content-group-${group.id}`}>
            <div className="flex items-center gap-3 mb-5">
              <span className="w-8 h-px bg-[#D4FF00]" />
              <h2 className="text-overline text-[#D4FF00]">{group.label}</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-px bg-white/10">
              {group.fields.map((f) => (
                <ContentField
                  key={f.key}
                  field={f}
                  currentValue={overrides[f.key]}
                  token={token}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </AdminLayout>
  );
}

function ContentField({ field, currentValue, token }) {
  const initial = currentValue != null ? currentValue : field.default;
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const isOverridden = currentValue != null;
  const dirty = value !== initial;

  useEffect(() => {
    setValue(currentValue != null ? currentValue : field.default);
  }, [currentValue, field.default]);

  const save = async () => {
    setSaving(true);
    try {
      await axios.post(
        `${API}/admin/content`,
        { key: field.key, value },
        { headers: { "X-Admin-Token": token } },
      );
      notifyContentChanged();
      toast.success(`Saved: ${field.label}`);
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    try {
      await axios.delete(`${API}/admin/content/${field.key}`, {
        headers: { "X-Admin-Token": token },
      });
      notifyContentChanged();
      setValue(field.default);
      toast.success("Reset to default");
    } catch {
      toast.error("Reset failed");
    }
  };

  return (
    <div
      data-testid={`content-field-${field.key}`}
      className="bg-[#0a0a0a] p-5 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-white">{field.label}</p>
          <p className="text-overline text-[10px] mt-1">
            {field.key}
            {isOverridden && (
              <span className="text-[#D4FF00] ml-2">· custom</span>
            )}
          </p>
        </div>
        {isOverridden && (
          <button
            data-testid={`reset-${field.key}`}
            onClick={reset}
            className="text-zinc-500 hover:text-white text-xs inline-flex items-center gap-1"
            title="Reset to default"
          >
            <RotateCcw size={12} /> Reset
          </button>
        )}
      </div>

      {field.long ? (
        <textarea
          data-testid={`input-${field.key}`}
          rows={3}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="bg-transparent border border-white/10 px-3 py-2 text-sm text-white focus:border-[#D4FF00] outline-none resize-y"
        />
      ) : (
        <input
          data-testid={`input-${field.key}`}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="bg-transparent border border-white/10 px-3 py-2 text-sm text-white focus:border-[#D4FF00] outline-none"
        />
      )}

      <button
        data-testid={`save-${field.key}`}
        onClick={save}
        disabled={!dirty || saving}
        className="self-start inline-flex items-center gap-2 bg-[#D4FF00] text-black font-bold uppercase tracking-wider text-[11px] px-4 py-2 hover:bg-white transition-colors disabled:opacity-40 disabled:bg-zinc-700 disabled:text-zinc-400"
      >
        <Save size={12} />
        {saving ? "Saving…" : dirty ? "Save" : "Saved"}
      </button>
    </div>
  );
}
