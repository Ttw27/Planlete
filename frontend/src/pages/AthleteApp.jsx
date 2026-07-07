import PlanCarousel from "../components/PlanCarousel";
import { useImages } from "../hooks/useImages";

const SLIDES = [
  {
    imageKey: "athlete_carousel_1",
    fallback: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80",
    caption: "Six day split — strength, power and conditioning",
  },
  {
    imageKey: "athlete_carousel_2",
    fallback: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&q=80",
    caption: "Progressive overload built into every session",
  },
  {
    imageKey: "athlete_carousel_3",
    fallback: "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1200&q=80",
    caption: "Nutrition targets, meal timing and supplement stack included",
  },
  {
    imageKey: "athlete_carousel_4",
    fallback: "https://images.unsplash.com/photo-1581009137042-c552e485697a?w=1200&q=80",
    caption: "Recovery protocols — sleep, HRV and morning movement",
  },
];

export default function AthleteApp() {
  const { images } = useImages();
  return (
    <div className="min-h-screen bg-black">
      <PlanCarousel images={images} slides={SLIDES} planLabel="Athlete Performance Plan" />
    </div>
  );
}
