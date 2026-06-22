import AppShell from "@/components/AppShell";
import { ATHLETE_APP } from "@/lib/sampleData";
import { useImageOverride } from "@/lib/useImages";
import { useContent } from "@/lib/useContent";

export default function AthleteApp() {
  const hero = useImageOverride("app_athlete_hero", ATHLETE_APP.hero);
  const brand = useContent("app_athlete_brand", ATHLETE_APP.brand);
  const tagline = useContent("app_athlete_tagline", ATHLETE_APP.tagline);
  return <AppShell data={{ ...ATHLETE_APP, hero, brand, tagline }} />;
}
