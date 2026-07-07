import PlanCarousel from "../components/PlanCarousel";
import { useImages } from "../hooks/useImages";

const SLIDES = [
  {
    imageKey: "football_carousel_1",
    fallback: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=80",
    caption: "Off-season — rebuild base fitness and strength",
  },
  {
    imageKey: "football_carousel_2",
    fallback: "https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=1200&q=80",
    caption: "Pre-season — football-specific conditioning and pitch work",
  },
  {
    imageKey: "football_carousel_3",
    fallback: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1200&q=80",
    caption: "In-season — maintain without fatigue. MD-1, MD, MD+1 structure",
  },
  {
    imageKey: "football_carousel_4",
    fallback: "https://images.unsplash.com/photo-1580748141549-71748dbe0bdc?w=1200&q=80",
    caption: "Recovery nutrition and sleep priority — built into every phase",
  },
];

export default function FootballApp() {
  const { images } = useImages();
  return (
    <div className="min-h-screen bg-black">
      <PlanCarousel
        images={images}
        slides={SLIDES}
        planLabel="Football Player Plan"
        linkKey="sample_link_football"
        defaultLink="https://planlete.vercel.app/app/football"
      />
    </div>
  );
}
