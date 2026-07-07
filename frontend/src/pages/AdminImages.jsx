import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Upload, RotateCcw, Link as LinkIcon } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAllImages, notifyImagesChanged } from "@/lib/useImages";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const IMAGE_SLOTS = [
  {
    key: "hero_landing",
    label: "Landing — Hero background",
    default:
      "https://images.pexels.com/photos/33360904/pexels-photo-33360904.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    note: "Full-bleed image behind the main headline.",
  },
  {
    key: "card_athlete",
    label: "Landing — Athlete card",
    default:
      "https://images.pexels.com/photos/9944894/pexels-photo-9944894.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  },
  {
    key: "card_longevity",
    label: "Landing — Longevity card",
    default:
      "https://images.pexels.com/photos/6922129/pexels-photo-6922129.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  },
  {
    key: "card_football",
    label: "Landing — Football card",
    default:
      "https://images.pexels.com/photos/6409107/pexels-photo-6409107.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  },
  {
    key: "card_sprinter",
    label: "Landing — Sprinter card",
    default:
      "https://images.pexels.com/photos/2526878/pexels-photo-2526878.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  },
  {
    key: "app_athlete_hero",
    label: "Athlete app — Inside hero",
    default:
      "https://images.pexels.com/photos/9944894/pexels-photo-9944894.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  },
  {
    key: "app_longevity_hero",
    label: "Longevity app — Inside hero",
    default:
      "https://images.pexels.com/photos/6922129/pexels-photo-6922129.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  },
  {
    key: "app_football_hero",
    label: "Football app — Inside hero",
    default:
      "https://images.pexels.com/photos/6409107/pexels-photo-6409107.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  },
  {
    key: "app_sprinter_hero",
    label: "Sprinter app — Inside hero",
    default:
      "https://images.pexels.com/photos/2526878/pexels-photo-2526878.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  },
  // Athlete sample carousel
  {
    key: "athlete_carousel_1",
    label: "Athlete sample — Carousel image 1",
    default: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80",
  },
  {
    key: "athlete_carousel_2",
    label: "Athlete sample — Carousel image 2",
    default: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&q=80",
  },
  {
    key: "athlete_carousel_3",
    label: "Athlete sample — Carousel image 3",
    default: "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1200&q=80",
  },
  {
    key: "athlete_carousel_4",
    label: "Athlete sample — Carousel image 4",
    default: "https://images.unsplash.com/photo-1581009137042-c552e485697a?w=1200&q=80",
  },
  // Longevity sample carousel
  {
    key: "longevity_carousel_1",
    label: "Longevity sample — Carousel image 1",
    default: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&q=80",
  },
  {
    key: "longevity_carousel_2",
    label: "Longevity sample — Carousel image 2",
    default: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&q=80",
  },
  {
    key: "longevity_carousel_3",
    label: "Longevity sample — Carousel image 3",
    default: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=80",
  },
  {
    key: "longevity_carousel_4",
    label: "Longevity sample — Carousel image 4",
    default: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&q=80",
  },
  // Football sample carousel
  {
    key: "football_carousel_1",
    label: "Football sample — Carousel image 1",
    default: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=80",
  },
  {
    key: "football_carousel_2",
    label: "Football sample — Carousel image 2",
    default: "https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=1200&q=80",
  },
  {
    key: "football_carousel_3",
    label: "Football sample — Carousel image 3",
    default: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1200&q=80",
  },
  {
    key: "football_carousel_4",
    label: "Football sample — Carousel image 4",
    default: "https://images.unsplash.com/photo-1580748141549-71748dbe0bdc?w=1200&q=80",
  },
  // Sprinter sample carousel
  {
    key: "sprinter_carousel_1",
    label: "Sprinter sample — Carousel image 1",
    default: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&q=80",
  },
  {
    key: "sprinter_carousel_2",
    label: "Sprinter sample — Carousel image 2",
    default: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=1200&q=80",
  },
  {
    key: "sprinter_carousel_3",
    label: "Sprinter sample — Carousel image 3",
    default: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&q=80",
  },
  {
    key: "sprinter_carousel_4",
    label: "Sprinter sample — Carousel image 4",
    default: "https://images.unsplash.com/photo-1594882645126-14ac19a0c6e7?w=1200&q=80",
  },
];

function resolveUrl(url) {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/api/")) return `${BACKEND_URL}${url}`;
  return url;
}

export default function AdminImages() {
  const navigate = useNavigate();
  const overrides = useAllImages();
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
    <AdminLayout title="Images">
      <div className="mb-10">
        <p className="text-overline mb-4">— Image manager</p>
        <h1 className="font-display text-4xl sm:text-5xl">
          Swap the visuals.
          <br />
          <span className="text-[#D4FF00]">Anytime you want.</span>
        </h1>
        <p className="text-sm text-zinc-400 mt-5 max-w-xl">
          Upload a new image or paste a URL. Changes go live immediately for
          visitors. Recommended: 1600×1000+ JPG/WebP under 8MB.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-px bg-white/10">
        {IMAGE_SLOTS.map((slot) => (
          <ImageSlot
            key={slot.key}
            slot={slot}
            currentRaw={overrides[slot.key]}
            token={token}
          />
        ))}
      </div>
    </AdminLayout>
  );
}

function ImageSlot({ slot, currentRaw, token }) {
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const fileRef = useRef(null);
  const current = currentRaw ? resolveUrl(currentRaw) : slot.default;
  const isOverridden = !!currentRaw;

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Image files only");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Max 8MB");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await axios.post(`${API}/admin/images/upload?key=${slot.key}`, fd, {
        headers: { "X-Admin-Token": token },
      });
      notifyImagesChanged();
      toast.success(`${slot.label} updated`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const setUrl = async (e) => {
    e.preventDefault();
    if (!urlInput.startsWith("http")) {
      toast.error("Must be a full http(s) URL");
      return;
    }
    try {
      await axios.post(
        `${API}/admin/images/url?key=${slot.key}&url=${encodeURIComponent(urlInput)}`,
        null,
        { headers: { "X-Admin-Token": token } },
      );
      notifyImagesChanged();
      setUrlInput("");
      toast.success(`${slot.label} updated`);
    } catch {
      toast.error("Failed");
    }
  };

  const reset = async () => {
    try {
      await axios.delete(`${API}/admin/images/${slot.key}`, {
        headers: { "X-Admin-Token": token },
      });
      notifyImagesChanged();
      toast.success("Reset to default");
    } catch {
      toast.error("Failed");
    }
  };

  return (
    <div
      data-testid={`image-slot-${slot.key}`}
      className="bg-[#0a0a0a] p-5 md:p-6 flex flex-col gap-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg leading-tight">{slot.label}</p>
          <p className="text-overline text-[10px] mt-2">
            {slot.key}{" "}
            {isOverridden && (
              <span className="text-[#D4FF00] ml-2">· custom</span>
            )}
          </p>
        </div>
        {isOverridden && (
          <button
            data-testid={`reset-${slot.key}`}
            onClick={reset}
            className="text-zinc-500 hover:text-white text-xs inline-flex items-center gap-1"
            title="Reset to default"
          >
            <RotateCcw size={12} /> Reset
          </button>
        )}
      </div>

      <div className="aspect-[16/9] bg-black border border-white/10 overflow-hidden">
        <img
          src={current}
          alt={slot.label}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onFile}
          className="hidden"
          data-testid={`file-input-${slot.key}`}
        />
        <button
          data-testid={`upload-${slot.key}`}
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex-1 bg-[#D4FF00] text-black font-bold uppercase tracking-wider text-xs px-4 py-3 hover:bg-white transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          <Upload size={14} />
          {uploading ? "Uploading…" : "Upload file"}
        </button>
      </div>

      <form
        onSubmit={setUrl}
        className="flex gap-2"
        data-testid={`url-form-${slot.key}`}
      >
        <div className="flex-1 relative">
          <LinkIcon
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="…or paste an image URL"
            className="w-full bg-transparent border border-white/15 pl-9 pr-3 py-2.5 text-sm focus:border-[#D4FF00] outline-none placeholder:text-zinc-600"
          />
        </div>
        <button
          type="submit"
          disabled={!urlInput}
          className="border border-white/20 text-white font-bold uppercase tracking-wider text-xs px-4 py-2.5 hover:bg-white/5 transition-colors disabled:opacity-40"
        >
          Set
        </button>
      </form>
    </div>
  );
}
