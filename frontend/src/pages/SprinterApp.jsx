import AppShell from "@/components/AppShell";
import { SPRINTER_APP } from "@/lib/sampleData";
import { useImageOverride } from "@/lib/useImages";

export default function SprinterApp() {
  const hero = useImageOverride("app_sprinter_hero", SPRINTER_APP.hero);
  return <AppShell data={{ ...SPRINTER_APP, hero }} />;
}
