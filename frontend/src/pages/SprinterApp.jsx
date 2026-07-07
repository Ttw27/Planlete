import PlanCarousel from "../components/PlanCarousel";
import { useImages } from "../hooks/useImages";

const SLIDES = [
  {
    imageKey: "sprinter_carousel_1",
    fallback: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&q=80",
    caption: "Acceleration, max velocity and speed endurance — all phases covered",
  },
  {
    imageKey: "sprinter_carousel_2",
    fallback: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=1200&q=80",
    caption: "Plyometrics and power development built around sprint mechanics",
  },
  {
    imageKey: "sprinter_carousel_3",
    fallback: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&q=80",
    caption: "Gym sessions designed to transfer power to the track",
  },
  {
    imageKey: "sprinter_carousel_4",
    fallback: "https://images.unsplash.com/photo-1594882645126-14ac19a0c6e7?w=1200&q=80",
    caption: "Recovery protocols to protect hamstrings and maintain output",
  },
];

export default function SprinterApp() {
  const { images } = useImages();
  return (
    <div className="min-h-screen bg-black">
      <PlanCarousel images={images} slides={SLIDES} planLabel="Sprint Training Plan" />
    </div>
  );
}
