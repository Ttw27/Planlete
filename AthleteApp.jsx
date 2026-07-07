import AppShell from "../components/AppShell";
import { useImages } from "../hooks/useImages";

const ATHLETE_DATA = {
  brand: "Planlete",
  tagline: "Athlete Performance Plan",
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
      { name: "Face Pull", sets: "3×15", load: "Light", rest: "60s" },
      { name: "Barbell Curl", sets: "3×8", load: "Moderate\", rest: "90s\" },
    ]},
    { day: "Thu", label: "Lower Strength", focus: "Quads + hamstrings", workouts: [
      { name: "Front Squat", sets: "5×3", load: "85% 1RM", rest: "3min" },
      { name: "Trap Bar Deadlift", sets: "4×5", load: "80%", rest: "3min" },
      { name: "Leg Curl", sets: "3×8", load: "Moderate", rest: "2min" },
      { name: "Belt Squat", sets: "3×10", load: "Moderate", rest: "90s" },
      { name: "Seated Leg Extension", sets: "3×12", load: "Light", rest: "60s" },
    ]},
    { day: "Fri", label: "Full Body Conditioning", focus: "Work capacity", workouts: [
      { name: "Sled Push", sets: "6×20m", load: "Heavy", rest: "2min" },
      { name: "Battle Ropes", sets: "4×30s", load: "Max effort", rest: "90s" },
    ]},
    { day: "Sat", label: "Active Recovery", focus: "Mobility + parasympathetic", workouts: [
      { name: "Walk", sets: "60min", load: "Easy", rest: "—" },
      { name: "Yoga or Mobility", sets: "30min", load: "Light", rest: "—" },
      { name: "Breathwork", sets: "10min", load: "Diaphragmatic", rest: "—" },
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
  return <AppShell data={ATHLETE_DATA} />;
}
