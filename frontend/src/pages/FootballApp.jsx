import { useState } from "react";
import AppShell from "@/components/AppShell";
import { FOOTBALL_APP } from "@/lib/sampleData";
import { useImageOverride } from "@/lib/useImages";
import { useContent } from "@/lib/useContent";

const MODES = [
  { id: "off", label: "Off Season" },
  { id: "pre", label: "Pre Season" },
  { id: "in", label: "In Season" },
];

export default function FootballApp() {
  const [mode, setMode] = useState("off");
  const modeData = FOOTBALL_APP.modes[mode];
  const hero = useImageOverride("app_football_hero", FOOTBALL_APP.hero);
  const brand = useContent("app_football_brand", FOOTBALL_APP.brand);
  const tagline = useContent("app_football_tagline", FOOTBALL_APP.tagline);

  const data = {
    ...FOOTBALL_APP,
    hero,
    brand,
    tagline: modeData.focus || tagline,
    nutrition: modeData.nutrition,
  };

  const toggle = (
    <div
      data-testid="football-mode-toggle"
      className="border-b border-white/10 bg-[#0a0a0a] grid grid-cols-3"
    >
      {MODES.map((m) => (
        <button
          key={m.id}
          data-testid={`football-mode-${m.id}`}
          onClick={() => setMode(m.id)}
          className={`text-[10px] uppercase tracking-widest py-3 transition-colors ${
            mode === m.id
              ? "text-[#D4FF00] border-b-2 border-[#D4FF00] -mb-px"
              : "text-zinc-500 hover:text-white"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );

  return <AppShell data={data} mode={mode} modeToggle={toggle} />;
}
