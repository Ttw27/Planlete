import PlanCarousel from "../components/PlanCarousel";
import { useImages } from "../hooks/useImages";

const SLIDES = [
  {
    imageKey: "longevity_carousel_1",
    fallback: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&q=80",
    caption: "Four days per week — sustainable, effective, built around life",
  },
  {
    imageKey: "longevity_carousel_2",
    fallback: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&q=80",
    caption: "Mobility and joint health built into every session",
  },
  {
    imageKey: "longevity_carousel_3",
    fallback: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=80",
    caption: "Anti-inflammatory nutrition — foods that work for you long term",
  },
  {
    imageKey: "longevity_carousel_4",
    fallback: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&q=80",
    caption: "Sleep, recovery and supplement protocols for the long game",
  },
];

export default function LongevityApp() {
  const { images } = useImages();
  return (
    <div className="min-h-screen bg-black">
      <PlanCarousel images={images} slides={SLIDES} planLabel="Longevity & Fitness Plan" />
    </div>
  );
}
