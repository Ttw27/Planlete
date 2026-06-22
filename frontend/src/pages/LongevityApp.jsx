import AppShell from "@/components/AppShell";
import { LONGEVITY_APP } from "@/lib/sampleData";
import { useImageOverride } from "@/lib/useImages";
import { useContent } from "@/lib/useContent";

export default function LongevityApp() {
  const hero = useImageOverride("app_longevity_hero", LONGEVITY_APP.hero);
  const brand = useContent("app_longevity_brand", LONGEVITY_APP.brand);
  const tagline = useContent("app_longevity_tagline", LONGEVITY_APP.tagline);
  return <AppShell data={{ ...LONGEVITY_APP, hero, brand, tagline }} />;
}
