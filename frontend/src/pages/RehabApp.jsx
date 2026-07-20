import { useEffect, useState } from "react";
import axios from "axios";
import PlanCarousel from "../components/PlanCarousel";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function resolveUrl(url) {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/api/")) return `${BACKEND_URL}${url}`;
  return url;
}

export default function RehabApp() {
  const [samplePlan, setSamplePlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlan = async () => {
      try {
        const res = await axios.get(`${API}/sample-plans/rehab`);
        setSamplePlan(res.data);
      } catch (err) {
        console.error("Failed to load sample plan");
      } finally {
        setLoading(false);
      }
    };
    loadPlan();
  }, []);

  if (loading) return <div className="min-h-screen bg-black" />;

  const SLIDES = samplePlan?.slides.map((slide) => ({
    imageKey: slide.image_key,
    fallback: resolveUrl(slide.image_url) || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&q=80",
    caption: slide.caption,
  })) || [];

  return (
    <div className="min-h-screen bg-black text-white">
      {samplePlan && (
        <div className="max-w-4xl mx-auto px-5 md:px-8 pt-24 pb-12">
          <p className="text-overline text-[#D4FF00] mb-4">— Sample plan</p>
          <h1 className="font-display text-4xl md:text-5xl uppercase leading-tight mb-4">
            {samplePlan.title}
          </h1>
          <p className="text-zinc-400 text-lg mb-8 max-w-2xl">
            {samplePlan.description} <span className="text-[#D4FF00]">{samplePlan.disclaimer}</span>.
          </p>
          <ul className="grid md:grid-cols-2 gap-4 max-w-2xl">
            {samplePlan.bullets.map((bullet, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="w-1.5 h-1.5 bg-[#D4FF00] rounded-full mt-2 shrink-0" />
                <span className="text-zinc-300">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <PlanCarousel
        images={{}}
        slides={SLIDES}
        planLabel="Rehab & Recovery Plan"
        defaultLink={samplePlan?.sample_link || "https://planlete.vercel.app/app/rehab"}
      />
    </div>
  );
}
