import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Image as ImageIcon, Type, ExternalLink, Users, LifeBuoy, FlaskConical, ShoppingBag } from "lucide-react";

export default function AdminLayout({ children, title }) {
  const location = useLocation();
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("bfy_admin_token");
    navigate("/admin");
  };

  const nav = [
    { to: "/admin/content", label: "Text content", icon: <Type size={16} /> },
    { to: "/admin/images", label: "Images", icon: <ImageIcon size={16} /> },
    { to: "/admin/orders", label: "Orders", icon: <ShoppingBag size={16} /> },
    { to: "/admin/leads", label: "Sample leads", icon: <Users size={16} /> },
    { to: "/admin/support", label: "Support requests", icon: <LifeBuoy size={16} /> },
    { to: "/admin/test-plan", label: "Test plan generator", icon: <FlaskConical size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="border-b border-white/10 sticky top-0 z-40 bg-black/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-overline text-[#D4FF00]">
              Planlete · Admin
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-overline">{title}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/"
              target="_blank"
              className="text-overline hover:text-[#D4FF00] inline-flex items-center gap-2"
            >
              View site <ExternalLink size={14} />
            </Link>
            <button
              data-testid="admin-logout-button"
              onClick={logout}
              className="text-overline hover:text-white inline-flex items-center gap-2"
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-10 md:py-14 grid md:grid-cols-12 gap-8">
        <aside className="md:col-span-3">
          <nav className="flex md:flex-col gap-1 sticky top-24">
            {nav.map((n) => {
              const active = location.pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`flex items-center gap-3 px-3 py-3 text-overline transition-colors ${
                    active
                      ? "text-[#D4FF00] border-l-2 border-[#D4FF00]"
                      : "text-zinc-400 hover:text-white border-l-2 border-transparent"
                  }`}
                >
                  {n.icon}
                  <span>{n.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="md:col-span-9">{children}</main>
      </div>
    </div>
  );
}
