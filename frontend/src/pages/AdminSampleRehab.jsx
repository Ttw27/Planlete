import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ChevronLeft, Upload, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function resolveUrl(url) {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/api/")) return `${BACKEND_URL}${url}`;
  return url;
}

export default function AdminSampleRehab() {
  const navigate = useNavigate();
  const [token] = useState(() => localStorage.getItem("bfy_admin_token"));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    plan_type: "rehab",
    title: "Rehab & Recovery",
    description: "Post-injury return with gentle progression and structural integrity.",
    disclaimer: "This is a scaled back version only to be used as a sample",
    sample_link: "",
    bullets: [
      "Structured return-to-training after injury",
      "Hip, groin, and pelvic floor stability work",
      "Progressive loading and pain management",
      "Full rehab protocols built in",
    ],
    slides: [
      {
        image_key: "rehab_carousel_1",
        image_url: null,
        caption: "A structured, staged return to full training after injury",
      },
      {
        image_key: "rehab_carousel_2",
        image_url: null,
        caption: "Load managed week by week — nothing rushed",
      },
      {
        image_key: "rehab_carousel_3",
        image_url: null,
        caption: "Mobility, strength and stability work built around the injury",
      },
      {
        image_key: "rehab_carousel_4",
        image_url: null,
        caption: "Clear markers for when to progress to the next stage",
      },
    ],
  });

  useEffect(() => {
    const loadPlan = async () => {
      try {
        const res = await axios.get(`${API}/admin/sample-plans/rehab`, {
          headers: { "X-Admin-Token": token },
        });
        setFormData(res.data);
      } catch (err) {
        if (err.response?.status !== 404) {
          toast.error("Failed to load sample plan");
        }
      } finally {
        setLoading(false);
      }
    };
    loadPlan();
  }, []);

  const handleImageUpload = async (slideIndex, file) => {
    if (!file) return;
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      const key = `sample_rehab_${slideIndex}`;
      const res = await axios.post(
        `${API}/admin/images/upload?key=${key}`,
        formDataUpload,
        { headers: { "Content-Type": "multipart/form-data", "X-Admin-Token": token } }
      );
      const newSlides = [...formData.slides];
      newSlides[slideIndex].image_url = res.data.url;
      setFormData({ ...formData, slides: newSlides });
      toast.success("Image uploaded");
    } catch (err) {
      toast.error("Upload failed");
    }
  };

  const handleBulletChange = (index, value) => {
    const newBullets = [...formData.bullets];
    newBullets[index] = value;
    setFormData({ ...formData, bullets: newBullets });
  };

  const handleCaptionChange = (index, value) => {
    const newSlides = [...formData.slides];
    newSlides[index].caption = value;
    setFormData({ ...formData, slides: newSlides });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/sample-plans/rehab`, formData, {
        headers: { "X-Admin-Token": token },
      });
      toast.success("Sample plan updated");
    } catch (err) {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto p-8">
        <button
          onClick={() => navigate("/admin")}
          className="flex items-center gap-2 text-overline text-zinc-400 hover:text-[#D4FF00] mb-12"
        >
          <ChevronLeft size={16} /> Back to admin
        </button>

        <h1 className="font-display text-5xl uppercase mb-4">Rehab & Recovery Sample Plan</h1>
        <p className="text-zinc-400 mb-12">Manage the carousel, description, and sample link</p>

        <div className="space-y-12">
          <section className="border border-white/10 p-8">
            <h2 className="font-display text-2xl uppercase mb-6">Content</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-overline mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-transparent border-b border-white/20 focus:border-[#D4FF00] outline-none py-3 text-lg"
                />
              </div>
              <div>
                <label className="block text-overline mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-transparent border border-white/20 focus:border-[#D4FF00] outline-none p-4 text-sm h-24"
                />
              </div>
              <div>
                <label className="block text-overline mb-2">Sample Link (Live Plan URL)</label>
                <input
                  type="text"
                  value={formData.sample_link}
                  onChange={(e) => setFormData({ ...formData, sample_link: e.target.value })}
                  placeholder="https://planlete.co.uk/app/u/..."
                  className="w-full bg-transparent border-b border-white/20 focus:border-[#D4FF00] outline-none py-3 text-lg"
                />
              </div>
            </div>
          </section>

          <section className="border border-white/10 p-8">
            <h2 className="font-display text-2xl uppercase mb-6">Bullet Points (4)</h2>
            <div className="space-y-4">
              {formData.bullets.map((bullet, i) => (
                <div key={i}>
                  <label className="block text-overline text-sm mb-2">Point {i + 1}</label>
                  <textarea
                    value={bullet}
                    onChange={(e) => handleBulletChange(i, e.target.value)}
                    className="w-full bg-transparent border border-white/20 focus:border-[#D4FF00] outline-none p-3 text-sm h-16"
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="border border-white/10 p-8">
            <h2 className="font-display text-2xl uppercase mb-6">Carousel Slides (4)</h2>
            <div className="space-y-12">
              {formData.slides.map((slide, i) => (
                <div key={i} className="border border-white/10 p-6">
                  <p className="text-overline mb-4">Slide {i + 1}</p>
                  <div className="mb-6">
                    <label className="block text-overline text-sm mb-3">Image</label>
                    {slide.image_url && (
                      <img
                        src={resolveUrl(slide.image_url)}
                        alt={`Slide ${i + 1}`}
                        className="w-full max-w-md h-64 object-cover rounded mb-4"
                      />
                    )}
                    <label className="inline-flex items-center gap-2 bg-[#D4FF00] text-black font-bold uppercase tracking-wider text-xs px-6 py-3 cursor-pointer hover:bg-white transition-colors">
                      <Upload size={16} />
                      Upload Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(i, e.target.files?.[0])}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div>
                    <label className="block text-overline text-sm mb-2">Caption</label>
                    <textarea
                      value={slide.caption}
                      onChange={(e) => handleCaptionChange(i, e.target.value)}
                      className="w-full bg-transparent border border-white/20 focus:border-[#D4FF00] outline-none p-3 text-sm h-20"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-[#D4FF00] text-black font-bold uppercase tracking-wider text-sm px-8 py-4 hover:bg-white transition-colors disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? "Saving…" : "Save Sample Plan"}
          </button>
        </div>
      </div>
    </div>
  );
}
