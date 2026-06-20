import AppShell from "@/components/AppShell";
import { LONGEVITY_APP } from "@/lib/sampleData";
import { useImageOverride } from "@/lib/useImages";

export default function LongevityApp() {
  const hero = useImageOverride("app_longevity_hero", LONGEVITY_APP.hero);
  return <AppShell data={{ ...LONGEVITY_APP, hero }} />;
}
