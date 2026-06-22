import AppShell from "@/components/AppShell";
import { SPRINTER_APP } from "@/lib/sampleData";
import { useImageOverride } from "@/lib/useImages";
import { useContent } from "@/lib/useContent";

export default function SprinterApp() {
  const hero = useImageOverride("app_sprinter_hero", SPRINTER_APP.hero);
  const brand = useContent("app_sprinter_brand", SPRINTER_APP.brand);
  const tagline = useContent("app_sprinter_tagline", SPRINTER_APP.tagline);
  return <AppShell data={{ ...SPRINTER_APP, hero, brand, tagline }} />;
}
