import AppShell from "../components/AppShell";
import PlanCarousel from "../components/PlanCarousel";
import { useImages } from "../hooks/useImages";

const SLIDES = [
  {
    imageKey: "athlete_carousel_1",
    fallback: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
    caption: "Six day split — strength, power and conditioning",
  },
  {
    imageKey: "athlete_carousel_2",
    fallback: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80",
    caption: "Progressive overload built into every session",
  },
  {
    imageKey: "athlete_carousel_3",
    fallback: "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=800&q=80",
    caption: "Nutrition targets, meal timing and supplement stack included",
  },
  {
    imageKey: "athlete_carousel_4",
    fallback: "https://images.unsplash.com/photo-1581009137042-c552e485697a?w=800&q=80",
    caption: "Recovery protocols — sleep, HRV and morning movement",
  },
];

const ATHLETE_DATA = {
  brand: "Planlete",
  tagline: "Athlete Performance Plan",
  hero: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
  days: [
    { day: "Mon", label: "Lower Power", focus: "Strength + velocity", workouts: [
      { name: "Back Squat", sets: "5×3", load: "87% 1RM", rest: "3min" },
      { name: "Romanian Deadlift", sets: "4×6", load: "75%", rest: "2min" },
      { name: "Leg Press", sets: "3×10", load: "Moderate-heavy", rest: "90s" },
      { name: "Nordic Curl", sets: "3×5", load: "Eccentric", rest: "2min" },
      { name: "Calf Raise", sets: "4×15", load: "Heavy", rest: "60s" },
    ]},
    { day: "Tue", label: "Upper Push", focus: "Horizontal + vertical", workouts: [
      { name: "Bench Press", sets: "5×3", load: "85% 1RM", rest: "3min" },
      { name: "Incline DB Press", sets: "4×8", load: "Moderate", rest: "2min" },
      { name: "Overhead Press", sets: "3×8", load: "70%", rest: "90s" },
      { name: "Cable Fly", sets: "3×12", load: "Light", rest: "60s" },
      { name: "Tricep Pushdown", sets: "3×15", load: "Moderate", rest: "45s" },
    ]},
    { day: "Wed", label: "Upper Pull", focus: "Back + biceps", workouts: [
      { name: "Weighted Pull-up", sets: "5×4", load: "BW+15kg", rest: "3min" },
      { name: "Barbell Row", sets: "4×6", load: "80%", rest: "2min" },
      { name: "Cable Row", sets: "3×10", load: "Moderate", rest: "90s" },
      { name: "Face Pull", sets: "3×15", load: "Light", rest: "45s" },
      { name: "Barbell Curl", sets: "3×12", load: "Moderate", rest: "60s" },
    ]},
    { day: "Thu", label: "Power", focus: "Explosive output", workouts: [
      { name: "Power Clean", sets: "5×3", load: "80% 1RM", rest: "3min" },
      { name: "Box Jump", sets: "4×5", load: "Max height", rest: "2min" },
      { name: "Trap Bar Jump", sets: "4×4", load: "40% 1RM", rest: "2min" },
      { name: "Med Ball Slam", sets: "4×6", load: "Heavy", rest: "90s" },
    ]},
    { day: "Fri", label: "Posterior Chain", focus: "Hinge dominant", workouts: [
      { name: "Deadlift", sets: "5×3", load: "90% 1RM", rest: "4min" },
      { name: "Hip Thrust", sets: "4×8", load: "Heavy", rest: "2min" },
      { name: "Good Morning", sets: "3×10", load: "Light-mod", rest: "90s" },
      { name: "Back Extension", sets: "3×12", load: "BW", rest: "60s" },
      { name: "Pallof Press", sets: "3×10 each", load: "Moderate", rest: "60s" },
    ]},
    { day: "Sat", label: "Conditioning", focus: "Zone 2 + speed", workouts: [
      { name: "Zone 2 Run", sets: "30min", load: "65% HRmax", rest: "—" },
      { name: "Sled Push", sets: "6×20m", load: "Heavy", rest: "2min" },
      { name: "Battle Ropes", sets: "4×30s", load: "Max effort", rest: "90s" },
    ]},
    { day: "Sun", label: "Rest", focus: "Full recovery", workouts: [
      { name: "Walk", sets: "30min", load: "Easy", rest: "—" },
      { name: "Stretch / Yoga", sets: "20min", load: "Light", rest: "—" },
    ]},
  ],
  nutrition: {
    calories: 3400, protein: 210, carbs: 400, fats: 95,
    note: "High protein to support repair. Carb timing around training sessions is priority.",
    meals: [
      { time: "07:00", name: "Breakfast", items: "4 eggs, oats, banana, honey" },
      { time: "10:00", name: "Mid-morning", items: "Greek yogurt, berries, protein shake" },
      { time: "12:30", name: "Lunch", items: "Rice, chicken, salad, olive oil" },
      { time: "15:30", name: "Pre-training", items: "Toast, peanut butter, banana, coffee" },
      { time: "19:00", name: "Post-training", items: "Salmon, sweet potato, greens" },
      { time: "21:30", name: "Before bed", items: "Cottage cheese, casein shake" },
    ],
    supplements: ["Creatine 5g daily", "Vitamin D3 4000IU", "Omega-3 2g", "Magnesium 400mg", "Caffeine pre-session"],
  },
  recovery: {
    sleepTarget: "8–9h",
    hrvTrend: "↑ Optimal",
    protocols: [
      "Cold shower 3min post-training",
      "No screens 60min before sleep",
      "Collagen + Vit C 30min pre-session",
      "Foam roll major muscle groups daily",
      "Deload week every 4–6 weeks",
    ],
  },
  morningRoutine: [
    "Hip flexor stretch — 60s each",
    "Glute bridge — 2×15",
    "Cat-cow — 10 reps",
    "Shoulder circles — 30s",
    "5min walk or light jog",
  ],
};

export default function AthleteApp() {
  const { images } = useImages();
  return (
    <div>
      <PlanCarousel images={images} slides={SLIDES} planLabel="Athlete Performance Plan" />
      <AppShell data={ATHLETE_DATA} />
    </div>
  );
}
