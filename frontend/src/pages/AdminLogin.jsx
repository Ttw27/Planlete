import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Lock } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("bfy_admin_token");
    if (!token) return;
    axios
      .get(`${API}/admin/verify`, { headers: { "X-Admin-Token": token } })
      .then(() => navigate("/admin/images", { replace: true }))
      .catch(() => localStorage.removeItem("bfy_admin_token"));
  }, [navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/admin/login`, { password });
      localStorage.setItem("bfy_admin_token", res.data.token);
      toast.success("Welcome back");
      navigate("/admin/images");
    } catch {
      toast.error("Wrong password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-10">
          <div className="inline-flex items-center gap-3 mb-6">
            <span className="w-8 h-px bg-[#D4FF00]" />
            <p className="text-overline text-[#D4FF00]">Admin</p>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl">
            Sign in to
            <br />
            <span className="text-[#D4FF00]">manage the site.</span>
          </h1>
        </div>

        <form onSubmit={submit} data-testid="admin-login-form" className="flex flex-col gap-5">
          <label className="text-overline">Password</label>
          <div className="relative">
            <Lock
              size={16}
              className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <input
              data-testid="admin-password-input"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-transparent border-b border-white/20 focus:border-[#D4FF00] outline-none pl-7 py-3 font-display text-2xl placeholder:text-white/20"
            />
          </div>
          <button
            data-testid="admin-login-submit"
            type="submit"
            disabled={loading || !password}
            className="mt-6 bg-[#D4FF00] text-black font-bold uppercase tracking-wider text-sm px-7 py-4 hover:bg-white transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in →"}
          </button>
        </form>
        <p className="text-xs text-zinc-500 mt-10">
          Forgot the password? It&apos;s stored in your{" "}
          <span className="font-mono-display">backend/.env</span> under{" "}
          <span className="font-mono-display">ADMIN_PASSWORD</span>.
        </p>
      </div>
    </div>
  );
}
