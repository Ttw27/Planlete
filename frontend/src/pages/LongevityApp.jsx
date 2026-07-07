import AppShell from "../components/AppShell";
import PlanCarousel from "../components/PlanCarousel";
import { useImages } from "../hooks/useImages";

const SLIDES = [
  {
    imageKey: "longevity_carousel_1",
    fallback: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
    caption: "Four days per week — sustainable, effective, built around life",
  },
  {
    imageKey: "longevity_carousel_2",
    fallback: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80",
    caption: "Mobility and joint health built into every session",
  },
  {
    imageKey: "longevity_carousel_3",
    fallback: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80",
    caption: "Anti-inflammatory nutrition — foods that work for you long term",
  },
  {
    imageKey: "longevity_carousel_4",
    fallback: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80",
    caption: "Sleep, recovery and supplement protocols for the long game",
  },
];

const LONGEVITY_DATA = {
  brand: "Planlete",
  tagline: "Longevity & Fitness Plan",
  hero: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
  days: [
    { day: "Mon", label: "Strength A", focus: "Lower + core", workouts: [
      { name: "Goblet Squat", sets: "3×12", load: "Moderate", rest: "90s" },
      { name: "Romanian Deadlift", sets: "3×10", load: "Moderate", rest: "90s" },
      { name: "Walking Lunge", sets: "3×10 each", load: "Light-mod", rest: "60s" },
      { name: "Dead Bug", sets: "3×10", load: "Bodyweight", rest: "45s" },
      { name: "Plank", sets: "3×45s", load: "Bodyweight", rest: "30s" },
    ]},
    { day: "Tue", label: "Zone 2 Cardio", focus: "Aerobic base", workouts: [
      { name: "Brisk Walk / Jog", sets: "40min", load: "60–70% HRmax", rest: "—" },
      { name: "Mobility Flow", sets: "15min", load: "Light", rest: "—" },
    ]},
    { day: "Wed", label: "Rest / Mobility", focus: "Active recovery", workouts: [
      { name: "Yoga or Stretching", sets: "30min", load: "Light", rest: "—" },
      { name: "Hip flexor stretch", sets: "2×60s each", load: "Bodyweight", rest: "30s" },
      { name: "Thoracic rotation", sets: "2×10", load: "Bodyweight", rest: "30s" },
    ]},
    { day: "Thu", label: "Strength B", focus: "Upper + posture", workouts: [
      { name: "DB Bench Press", sets: "3×12", load: "Moderate", rest: "90s" },
      { name: "Cable Row", sets: "3×12", load: "Moderate", rest: "90s" },
      { name: "DB Shoulder Press", sets: "3×12", load: "Light-mod", rest: "60s" },
      { name: "Face Pull", sets: "3×15", load: "Light", rest: "45s" },
      { name: "Farmer's Carry", sets: "3×30m", load: "Moderate", rest: "90s" },
    ]},
    { day: "Fri", label: "Zone 2 + Strength", focus: "Combined", workouts: [
      { name: "Cycle or Row", sets: "25min", load: "65% HRmax", rest: "—" },
      { name: "Trap Bar Deadlift", sets: "3×8", load: "Moderate", rest: "2min" },
      { name: "Step-up", sets: "3×10 each", load: "Light", rest: "60s" },
    ]},
    { day: "Sat", label: "Active Rest", focus: "Movement snack", workouts: [
      { name: "Walk outdoors", sets: "45–60min", load: "Easy", rest: "—" },
      { name: "Swimming (optional)", sets: "20min", load: "Easy", rest: "—" },
    ]},
    { day: "Sun", label: "Full Rest", focus: "Recovery", workouts: [
      { name: "Rest", sets: "—", load: "Priority", rest: "—" },
      { name: "Sleep 7–9hrs", sets: "1", load: "Non-negotiable", rest: "—" },
    ]},
  ],
  nutrition: {
    calories: 2400, protein: 160, carbs: 260, fats: 80,
    note: "Focus on whole foods. Anti-inflammatory priority — oily fish, olive oil, berries, leafy greens.",
    meals: [
      { time: "08:00", name: "Breakfast", items: "Eggs, sourdough, avocado, berries" },
      { time: "11:00", name: "Mid-morning", items: "Handful walnuts, apple, green tea" },
      { time: "13:00", name: "Lunch", items: "Salmon, quinoa, mixed salad, olive oil" },
      { time: "16:00", name: "Snack", items: "Greek yogurt, blueberries" },
      { time: "19:00", name: "Dinner", items: "Chicken or fish, sweet potato, greens" },
    ],
    supplements: ["Vitamin D3 4000IU", "Omega-3 2g", "Magnesium glycinate 400mg", "Collagen + Vit C"],
  },
  recovery: {
    sleepTarget: "7–9h",
    hrvTrend: "↑ Steady",
    protocols: [
      "No screens 60min before sleep",
      "Cold exposure 2–3x per week",
      "Sauna 2x per week if available",
      "Stress management — walk, breathwork",
      "Annual health bloods — track markers",
    ],
  },
  morningRoutine: [
    "Drink 500ml water immediately on waking",
    "10min sunlight exposure",
    "Hip flexor and thoracic mobility — 10min",
    "Cold shower — 2min",
  ],
};

export default function LongevityApp() {
  const { images } = useImages();
  return (
    <div>
      <PlanCarousel images={images} slides={SLIDES} planLabel="Longevity & Fitness Plan" />
      <AppShell data={LONGEVITY_DATA} />
    </div>
  );
}
