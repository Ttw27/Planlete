import PlanCarousel from "../components/PlanCarousel";
import { useImages } from "../hooks/useImages";

const SLIDES = [
  {
    imageKey: "rehab_carousel_1",
    fallback: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&q=80",
    caption: "A structured, staged return to full training after injury",
  },
  {
    imageKey: "rehab_carousel_2",
    fallback: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&q=80",
    caption: "Load managed week by week — nothing rushed",
  },
  {
    imageKey: "rehab_carousel_3",
    fallback: "https://images.unsplash.com/photo-1544216717-3bbf52512659?w=1200&q=80",
    caption: "Mobility, strength and stability work built around the injury",
  },
  {
    imageKey: "rehab_carousel_4",
    fallback: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&q=80",
    caption: "Clear markers for when to progress to the next stage",
  },
];

export default function RehabApp() {
  const { images } = useImages();
  return (
    <div className="min-h-screen bg-black">
      <PlanCarousel
        images={images}
        slides={SLIDES}
        planLabel="Rehab & Recovery Plan"
        linkKey="sample_link_rehab"
        defaultLink="https://planlete.vercel.app/app/rehab"
      />
    </div>
  );
}
