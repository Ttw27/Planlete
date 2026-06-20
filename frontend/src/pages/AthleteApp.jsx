import AppShell from "@/components/AppShell";
import { ATHLETE_APP } from "@/lib/sampleData";
import { useImageOverride } from "@/lib/useImages";

export default function AthleteApp() {
  const hero = useImageOverride("app_athlete_hero", ATHLETE_APP.hero);
  return <AppShell data={{ ...ATHLETE_APP, hero }} />;
}
