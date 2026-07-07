import AppShell from "../components/AppShell";

const SPRINTER_DATA = {
  brand: "Planlete",
  tagline: "Sprint Training Plan",
  hero: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80",
  days: [
    { day: "Mon", label: "Acceleration", focus: "0–30m", workouts: [
      { name: "Wall Drills", sets: "3×10", load: "Bodyweight", rest: "60s" },
      { name: "Falling Start 10m", sets: "6×1", load: "95%", rest: "2min" },
      { name: "Block Start 20m", sets: "6×1", load: "Max", rest: "3min" },
      { name: "Flying 30m", sets: "4×1", load: "Max", rest: "4min" },
    ]},
    { day: "Tue", label: "Gym — Power", focus: "Strength transfer", workouts: [
      { name: "Power Clean", sets: "5×3", load: "80%", rest: "3min" },
      { name: "Back Squat", sets: "4×4", load: "85%", rest: "3min" },
      { name: "Hip Thrust", sets: "4×6", load: "Heavy", rest: "2min" },
      { name: "Box Jump", sets: "4×5", load: "Max height", rest: "2min" },
      { name: "Nordic Curl", sets: "3×5", load: "Eccentric", rest: "2min" },
    ]},
    { day: "Wed", label: "Speed Endurance", focus: "30–60m", workouts: [
      { name: "Tempo Runs 60m", sets: "6×1", load: "75%", rest: "3min" },
      { name: "Sprint 40m", sets: "4×1", load: "95%", rest: "5min" },
      { name: "Wicket Runs", sets: "4×30m", load: "Rhythm", rest: "3min" },
    ]},
    { day: "Thu", label: "Rest / Mobility", focus: "Recovery", workouts: [
      { name: "Hip flexor stretch", sets: "3×60s", load: "Bodyweight", rest: "30s" },
      { name: "Hamstring stretch", sets: "3×45s", load: "Bodyweight", rest: "30s" },
      { name: "Glute activation", sets: "2×15", load: "Band", rest: "30s" },
      { name: "Foam roll", sets: "10min", load: "Moderate", rest: "—" },
    ]},
    { day: "Fri", label: "Max Velocity", focus: "Top speed", workouts: [
      { name: "Flying 20m", sets: "6×1", load: "Max", rest: "4min" },
      { name: "Flying 40m", sets: "4×1", load: "Max", rest: "5min" },
      { name: "Sprint Bounds", sets: "4×20m", load: "Explosive", rest: "3min" },
    ]},
    { day: "Sat", label: "Gym — Strength", focus: "Support work", workouts: [
      { name: "Deadlift", sets: "4×3", load: "88%", rest: "4min" },
      { name: "Single Leg Press", sets: "3×8 each", load: "Moderate", rest: "90s" },
      { name: "Pull-up", sets: "3×8", load: "BW", rest: "2min" },
      { name: "Pallof Press", sets: "3×10", load: "Moderate", rest: "60s" },
    ]},
    { day: "Sun", label: "Full Rest", focus: "Recovery priority", workouts: [
      { name: "Sleep 8–9hrs", sets: "1", load: "Priority", rest: "—" },
      { name: "Walk", sets: "20–30min", load: "Easy", rest: "—" },
    ]},
  ],
  nutrition: {
    calories: 3200, protein: 195, carbs: 380, fats: 90,
    note: "Carb timing is critical. High carbs around sessions, lower on rest days.",
    meals: [
      { time: "07:00", name: "Breakfast", items: "Oats, protein shake, banana, eggs" },
      { time: "10:00", name: "Pre-session", items: "Rice cakes, honey, espresso" },
      { time: "12:30", name: "Post-session", items: "Chicken, white rice, electrolytes" },
      { time: "15:30", name: "Lunch", items: "Salmon, pasta, salad, olive oil" },
      { time: "19:00", name: "Dinner", items: "Lean beef or chicken, vegetables, potato" },
      { time: "21:30", name: "Before bed", items: "Casein shake or cottage cheese" },
    ],
    supplements: ["Creatine 5g", "Caffeine pre-session", "Vitamin D3 4000IU", "Omega-3 2g", "Collagen + Vit C", "Magnesium 400mg"],
  },
  recovery: {
    sleepTarget: "8–9h",
    hrvTrend: "↑ High",
    protocols: [
      "Ice bath 10min post track session",
      "Hamstring specific stretching daily",
      "No max velocity work two days in a row",
      "Collagen + Vit C 30min pre-session",
      "Deload week every 4 weeks",
    ],
  },
  morningRoutine: [
    "Hip flexor activation — 60s each",
    "Glute bridge — 2×15",
    "A-skip drills — 2×20m",
    "Ankle stiffness drills — 30s",
    "Light jog 5min",
  ],
};

export default function SprinterApp() {
  return <AppShell data={SPRINTER_DATA} />;
}
