import { useState } from "react";
import AppShell from "../components/AppShell";
import PlanCarousel from "../components/PlanCarousel";
import { useImages } from "../hooks/useImages";

const SLIDES = [
  {
    imageKey: "football_carousel_1",
    fallback: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80",
    caption: "Off-season — rebuild base fitness and strength",
  },
  {
    imageKey: "football_carousel_2",
    fallback: "https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=800&q=80",
    caption: "Pre-season — football-specific conditioning and pitch work",
  },
  {
    imageKey: "football_carousel_3",
    fallback: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&q=80",
    caption: "In-season — maintain without fatigue. MD-1, MD, MD+1 structure",
  },
  {
    imageKey: "football_carousel_4",
    fallback: "https://images.unsplash.com/photo-1580748141549-71748dbe0bdc?w=800&q=80",
    caption: "Recovery nutrition and sleep priority — built into every phase",
  },
];

const MODES = ["off-season", "pre-season", "in-season"];

const FOOTBALL_DATA = {
  brand: "Planlete",
  tagline: "Football Player Plan",
  hero: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80",
  modes: {
    "off-season": {
      days: [
        { day: "Mon", label: "Lower Power", focus: "Strength base", workouts: [
          { name: "Back Squat", sets: "4×5", load: "85% 1RM", rest: "3min" },
          { name: "Romanian Deadlift", sets: "3×8", load: "70% 1RM", rest: "2min" },
          { name: "Bulgarian Split Squat", sets: "3×10", load: "60%", rest: "90s" },
          { name: "Hamstring Curl", sets: "3×12", load: "Moderate", rest: "60s" },
          { name: "Calf Raise", sets: "4×15", load: "Heavy", rest: "45s" },
        ]},
        { day: "Tue", label: "Upper Power", focus: "Push + pull", workouts: [
          { name: "Bench Press", sets: "4×5", load: "80% 1RM", rest: "3min" },
          { name: "Weighted Pull-up", sets: "4×6", load: "BW+10kg", rest: "2min" },
          { name: "DB Shoulder Press", sets: "3×10", load: "Moderate", rest: "90s" },
          { name: "Cable Row", sets: "3×12", load: "Moderate", rest: "60s" },
          { name: "Face Pull", sets: "3×15", load: "Light", rest: "45s" },
        ]},
        { day: "Wed", label: "Speed & Agility", focus: "Sprint base", workouts: [
          { name: "10m Accelerations", sets: "8×1", load: "95% max", rest: "90s" },
          { name: "Lateral Shuffle", sets: "5×10m", load: "Max effort", rest: "60s" },
          { name: "T-Drill", sets: "6 reps", load: "Max speed", rest: "90s" },
          { name: "Box Jump", sets: "4×5", load: "Explosive", rest: "2min" },
        ]},
        { day: "Thu", label: "Rest / Mobility", focus: "Recovery", workouts: [
          { name: "Hip Flexor Stretch", sets: "3×60s", load: "Bodyweight", rest: "30s" },
          { name: "Thoracic Rotation", sets: "3×10 each", load: "Bodyweight", rest: "30s" },
          { name: "Foam Roll — Quads", sets: "2min", load: "Moderate", rest: "—" },
          { name: "Foam Roll — ITB", sets: "2min", load: "Moderate", rest: "—" },
        ]},
        { day: "Fri", label: "Full Body", focus: "Compound", workouts: [
          { name: "Deadlift", sets: "4×4", load: "87% 1RM", rest: "3min" },
          { name: "Incline Press", sets: "3×8", load: "75%", rest: "2min" },
          { name: "Chin-up", sets: "3×8", load: "BW", rest: "90s" },
          { name: "DB Lunge", sets: "3×10 each", load: "Moderate", rest: "60s" },
        ]},
        { day: "Sat", label: "Conditioning", focus: "Aerobic base", workouts: [
          { name: "Zone 2 Run", sets: "45min", load: "65% HRmax", rest: "—" },
          { name: "Small Sided Game", sets: "4×8min", load: "High intensity", rest: "2min" },
        ]},
        { day: "Sun", label: "Rest", focus: "Full recovery", workouts: [
          { name: "Walk", sets: "30min", load: "Easy", rest: "—" },
          { name: "Yoga / Stretch", sets: "20min", load: "Light", rest: "—" },
        ]},
      ],
      nutrition: {
        calories: 3100, protein: 185, carbs: 360, fats: 90,
        note: "Off-season: prioritise body composition. Slightly higher fats, moderate carbs.",
        meals: [
          { time: "07:30", name: "Breakfast", items: "Oats, banana, protein shake, eggs" },
          { time: "10:30", name: "Mid-morning", items: "Greek yogurt, berries, handful almonds" },
          { time: "13:00", name: "Lunch", items: "Rice, chicken breast, salad, olive oil" },
          { time: "16:00", name: "Pre-training", items: "Toast, peanut butter, banana" },
          { time: "19:30", name: "Post-training", items: "Salmon, sweet potato, greens" },
          { time: "21:30", name: "Evening", items: "Cottage cheese, casein if needed" },
        ],
        supplements: ["Creatine 5g", "Vitamin D3 4000IU", "Omega-3 2g", "Magnesium 400mg"],
      },
    },
    "pre-season": {
      days: [
        { day: "Mon", label: "Gym + Pitch", focus: "Power transfer", workouts: [
          { name: "Power Clean", sets: "4×3", load: "80% 1RM", rest: "3min" },
          { name: "Squat Jump", sets: "4×5", load: "BW+20kg", rest: "2min" },
          { name: "45min Pitch Session", sets: "1", load: "Tactical", rest: "—" },
        ]},
        { day: "Tue", label: "Conditioning", focus: "High intensity", workouts: [
          { name: "Repeated Sprints", sets: "10×30m", load: "95%", rest: "30s" },
          { name: "High-low Runs", sets: "5×200m", load: "85%", rest: "90s" },
          { name: "Agility Circuit", sets: "3 rounds", load: "Max", rest: "2min" },
        ]},
        { day: "Wed", label: "Team Session", focus: "Ball work", workouts: [
          { name: "Rondo", sets: "4×8min", load: "High press", rest: "2min" },
          { name: "SSG 6v6", sets: "4×10min", load: "Competitive", rest: "2min" },
          { name: "Set Pieces", sets: "20min", load: "Technical", rest: "—" },
        ]},
        { day: "Thu", label: "Gym", focus: "Maintain strength", workouts: [
          { name: "Back Squat", sets: "3×5", load: "80%", rest: "3min" },
          { name: "Bench Press", sets: "3×5", load: "80%", rest: "3min" },
          { name: "Pull-up", sets: "3×8", load: "BW", rest: "2min" },
        ]},
        { day: "Fri", label: "Activation", focus: "MD-1 prep", workouts: [
          { name: "Activation Circuit", sets: "2 rounds", load: "Light", rest: "60s" },
          { name: "Short Sprints", sets: "5×10m", load: "95%", rest: "90s" },
          { name: "Mobility", sets: "15min", load: "Light", rest: "—" },
        ]},
        { day: "Sat", label: "Match / Friendly", focus: "Game day", workouts: [
          { name: "Pre-match warm-up", sets: "15min", load: "Protocol", rest: "—" },
          { name: "Match", sets: "90min", load: "Competitive", rest: "—" },
        ]},
        { day: "Sun", label: "Recovery", focus: "MD+1", workouts: [
          { name: "Pool Recovery", sets: "20min", load: "Easy", rest: "—" },
          { name: "Mobility & Stretch", sets: "20min", load: "Light", rest: "—" },
        ]},
      ],
      nutrition: {
        calories: 3400, protein: 200, carbs: 420, fats: 85,
        note: "Pre-season: higher carbs to fuel double sessions and match intensity.",
        meals: [
          { time: "07:00", name: "Breakfast", items: "Porridge, honey, banana, 3 eggs" },
          { time: "10:00", name: "Snack", items: "Rice cakes, peanut butter, protein shake" },
          { time: "12:30", name: "Lunch", items: "Pasta, chicken, tomato sauce, salad" },
          { time: "15:30", name: "Pre-session", items: "Energy bar, banana, electrolytes" },
          { time: "19:00", name: "Post-session", items: "Lean beef, rice, vegetables" },
          { time: "21:30", name: "Evening", items: "Milk, casein or cottage cheese" },
        ],
        supplements: ["Creatine 5g", "Caffeine pre-session", "Vitamin D3 4000IU", "Omega-3 2g", "Electrolytes"],
      },
    },
    "in-season": {
      days: [
        { day: "MD-2", label: "Gym", focus: "Maintain", workouts: [
          { name: "Squat", sets: "3×4", load: "80%", rest: "3min" },
          { name: "Bench", sets: "3×4", load: "80%", rest: "3min" },
          { name: "Hip Thrust", sets: "3×6", load: "Heavy", rest: "2min" },
          { name: "Nordic Curl", sets: "3×5", load: "Eccentric", rest: "2min" },
        ]},
        { day: "MD-1", label: "Activation", focus: "Game prep", workouts: [
          { name: "Acceleration Runs", sets: "6×10m", load: "95%", rest: "90s" },
          { name: "Activation Circuit", sets: "2 rounds", load: "Light-mod", rest: "60s" },
          { name: "Mobility", sets: "15min", load: "Light", rest: "—" },
        ]},
        { day: "MD", label: "Match Day", focus: "Perform", workouts: [
          { name: "Pre-match warm-up", sets: "Protocol", load: "15min", rest: "—" },
          { name: "Match", sets: "90min", load: "Max effort", rest: "—" },
          { name: "Cool-down", sets: "10min", load: "Light", rest: "—" },
        ]},
        { day: "MD+1", label: "Recovery", focus: "Flush & repair", workouts: [
          { name: "Walk or Cycle", sets: "20min", load: "Very easy", rest: "—" },
          { name: "Contrast Shower", sets: "3 cycles", load: "Hot/cold", rest: "—" },
          { name: "Full Body Stretch", sets: "20min", load: "Light", rest: "—" },
        ]},
        { day: "MD+2", label: "Light Training", focus: "Ball work", workouts: [
          { name: "Rondo", sets: "3×6min", load: "Low intensity", rest: "2min" },
          { name: "Technical Drills", sets: "20min", load: "Skill focus", rest: "—" },
        ]},
        { day: "MD+3", label: "Gym", focus: "Strength maintain", workouts: [
          { name: "Deadlift", sets: "3×4", load: "78%", rest: "3min" },
          { name: "Pull-up", sets: "3×6", load: "BW+5kg", rest: "2min" },
          { name: "Single Leg Press", sets: "3×8", load: "Moderate", rest: "90s" },
        ]},
        { day: "Rest", label: "Full Rest", focus: "Recovery", workouts: [
          { name: "Sleep 8-9hrs", sets: "1", load: "Priority", rest: "—" },
          { name: "Light walk", sets: "Optional", load: "Easy", rest: "—" },
        ]},
      ],
      nutrition: {
        calories: 3000, protein: 190, carbs: 350, fats: 85,
        note: "In-season: optimise recovery. Carb timing around match day is critical.",
        meals: [
          { time: "07:30", name: "Breakfast", items: "Eggs, sourdough toast, avocado, OJ" },
          { time: "11:00", name: "Snack", items: "Fruit, nuts, protein shake" },
          { time: "13:00", name: "Lunch", items: "Rice, salmon, greens, olive oil" },
          { time: "17:00", name: "Pre-match/training", items: "Pasta, banana, electrolytes" },
          { time: "20:00", name: "Post", items: "Chicken, sweet potato, vegetables" },
          { time: "22:00", name: "Before bed", items: "Cottage cheese or casein" },
        ],
        supplements: ["Creatine 5g", "Vitamin D3", "Omega-3 2g", "Magnesium 400mg", "Collagen + Vit C"],
      },
    },
  },
  recovery: {
    sleepTarget: "8–9h",
    hrvTrend: "↑ Good",
    protocols: [
      "Ice bath 10min post-match",
      "Contrast shower MD+1",
      "Compression garments overnight",
      "No alcohol in-season",
      "Collagen + Vit C 30min pre-training",
    ],
  },
  morningRoutine: [
    "Hip flexor activation — 2×60s each",
    "Glute bridges — 2×15",
    "Thoracic rotations — 2×10",
    "Ankle circles — 30s each",
    "Light jog or walk — 5min",
  ],
};

export default function FootballApp() {
  const [mode, setMode] = useState("in-season");
  const { images } = useImages();

  const modeToggle = (
    <div className="flex border-b border-white/10">
      {MODES.map((m) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors ${
            mode === m
              ? "bg-[#D4FF00] text-black"
              : "text-zinc-500 hover:text-white"
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      <PlanCarousel
        images={images}
        slides={SLIDES}
        planLabel="Football Player Plan"
      />
      <AppShell data={FOOTBALL_DATA} mode={mode} modeToggle={modeToggle} />
    </div>
  );
}
