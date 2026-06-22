import { ATHLETE_APP, LONGEVITY_APP, FOOTBALL_APP, SPRINTER_APP } from "@/lib/sampleData";

export function getTemplateData(template) {
  switch (template) {
    case "athlete":
      return ATHLETE_APP;
    case "longevity":
      return LONGEVITY_APP;
    case "football":
      return FOOTBALL_APP;
    case "sprinter":
      return SPRINTER_APP;
    default:
      return ATHLETE_APP;
  }
}
