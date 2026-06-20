// Sample app data — used by the three free sample training apps and the build flow preview.

export const ATHLETE_APP = {
  brand: "Athlete Performance",
  tagline: "Elite training, every day.",
  hero: "https://images.pexels.com/photos/9944894/pexels-photo-9944894.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  accent: "#D4FF00",
  days: [
    {
      day: "MON",
      label: "Push",
      focus: "Chest · Shoulders · Triceps",
      workouts: [
        { name: "Barbell Bench Press", sets: "5 × 5", load: "85% 1RM", rest: "180s" },
        { name: "Standing OHP", sets: "4 × 6", load: "RPE 8", rest: "150s" },
        { name: "Incline DB Press", sets: "3 × 8", load: "Heavy", rest: "120s" },
        { name: "Weighted Dips", sets: "3 × 8", load: "+20kg", rest: "120s" },
        { name: "Cable Tricep Push", sets: "3 × 12", load: "Drop set", rest: "60s" },
      ],
    },
    {
      day: "TUE",
      label: "Pull",
      focus: "Back · Biceps · Rear Delts",
      workouts: [
        { name: "Deadlift", sets: "5 × 3", load: "87% 1RM", rest: "180s" },
        { name: "Weighted Pull-Up", sets: "4 × 6", load: "+15kg", rest: "150s" },
        { name: "Barbell Row", sets: "4 × 8", load: "RPE 8", rest: "120s" },
        { name: "Face Pull", sets: "3 × 15", load: "Light", rest: "60s" },
        { name: "Hammer Curl", sets: "3 × 10", load: "Heavy", rest: "60s" },
      ],
    },
    {
      day: "WED",
      label: "Legs",
      focus: "Squat · Quads · Glutes",
      workouts: [
        { name: "Back Squat", sets: "5 × 5", load: "85% 1RM", rest: "180s" },
        { name: "Romanian Deadlift", sets: "4 × 8", load: "RPE 8", rest: "120s" },
        { name: "Walking Lunge", sets: "3 × 20", load: "DB 20kg", rest: "90s" },
        { name: "Leg Curl", sets: "3 × 12", load: "Heavy", rest: "60s" },
        { name: "Standing Calf", sets: "4 × 15", load: "Heavy", rest: "60s" },
      ],
    },
    {
      day: "THU",
      label: "Power",
      focus: "Explosive · CNS",
      workouts: [
        { name: "Power Clean", sets: "6 × 2", load: "75% 1RM", rest: "180s" },
        { name: "Box Jump", sets: "5 × 3", load: "Max height", rest: "120s" },
        { name: "Med Ball Slam", sets: "4 × 5", load: "8kg", rest: "90s" },
        { name: "Broad Jump", sets: "4 × 3", load: "Max", rest: "120s" },
      ],
    },
    {
      day: "FRI",
      label: "Posterior",
      focus: "Hinge · Hamstrings",
      workouts: [
        { name: "Sumo Deadlift", sets: "4 × 5", load: "RPE 8", rest: "180s" },
        { name: "Good Morning", sets: "3 × 8", load: "Moderate", rest: "120s" },
        { name: "Glute Ham Raise", sets: "3 × 10", load: "BW", rest: "90s" },
        { name: "Reverse Hyper", sets: "3 × 15", load: "Moderate", rest: "60s" },
      ],
    },
    {
      day: "SAT",
      label: "Conditioning",
      focus: "VO2 · Engine",
      workouts: [
        { name: "Assault Bike Intervals", sets: "8 × 60s", load: "Max", rest: "60s" },
        { name: "Sled Push", sets: "5 × 20m", load: "Heavy", rest: "90s" },
        { name: "Zone 2 Row", sets: "20 min", load: "HR 130-140", rest: "—" },
      ],
    },
    { day: "SUN", label: "Recovery", focus: "Mobility · Walk", workouts: [
      { name: "Morning Movement Flow", sets: "20 min", load: "Easy", rest: "—" },
      { name: "Zone 1 Walk", sets: "45 min", load: "HR < 120", rest: "—" },
    ] },
  ],
  nutrition: {
    calories: 3200,
    protein: 210,
    carbs: 380,
    fats: 95,
    meals: [
      { time: "07:00", name: "Pre-Train", items: "Oats, banana, whey, espresso" },
      { time: "11:30", name: "Post-Train", items: "Chicken, rice, broccoli, olive oil" },
      { time: "15:00", name: "Lunch", items: "Salmon, sweet potato, greens" },
      { time: "19:30", name: "Dinner", items: "Beef mince, pasta, tomato, parmesan" },
      { time: "22:00", name: "Pre-Sleep", items: "Casein, almonds, blueberries" },
    ],
    supplements: ["Creatine 5g", "Whey 40g", "Vit D3 4000 IU", "Omega 3 2g", "Magnesium 400mg"],
  },
  recovery: {
    sleepTarget: "8h 00m",
    hrvTrend: "Elevated",
    protocols: [
      "Sauna 20 min × 3/week",
      "Cold plunge 2 min post-train",
      "Massage gun lower body",
      "Sunlight 10 min AM",
    ],
  },
  morningRoutine: [
    "Cat-cow ×10",
    "World's greatest stretch ×6",
    "90/90 hip switch ×8",
    "Wall slides ×10",
    "Dead-hang 30s",
  ],
};

export const LONGEVITY_APP = {
  brand: "Longevity & Fitness",
  tagline: "Look good. Feel great. For decades.",
  hero: "https://images.pexels.com/photos/6922129/pexels-photo-6922129.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  accent: "#D4FF00",
  days: [
    {
      day: "MON",
      label: "Strength A",
      focus: "Full body · joints first",
      workouts: [
        { name: "Goblet Squat", sets: "3 × 10", load: "Moderate", rest: "90s" },
        { name: "Incline DB Press", sets: "3 × 10", load: "Moderate", rest: "90s" },
        { name: "Seated Row", sets: "3 × 12", load: "Controlled", rest: "60s" },
        { name: "Glute Bridge", sets: "3 × 12", load: "BW + band", rest: "60s" },
        { name: "Farmer Carry", sets: "3 × 30m", load: "Heavy", rest: "90s" },
      ],
    },
    {
      day: "WED",
      label: "Mobility & Z2",
      focus: "Joints · heart",
      workouts: [
        { name: "Full body mobility flow", sets: "20 min", load: "Easy", rest: "—" },
        { name: "Zone 2 cycle", sets: "40 min", load: "HR 120-135", rest: "—" },
      ],
    },
    {
      day: "FRI",
      label: "Strength B",
      focus: "Posture · pull",
      workouts: [
        { name: "Trap Bar Deadlift", sets: "3 × 6", load: "Moderate", rest: "120s" },
        { name: "Lat Pulldown", sets: "3 × 10", load: "Controlled", rest: "60s" },
        { name: "DB Shoulder Press", sets: "3 × 10", load: "Light/mod", rest: "60s" },
        { name: "Single Leg RDL", sets: "3 × 8", load: "Light DBs", rest: "60s" },
        { name: "Plank", sets: "3 × 45s", load: "BW", rest: "45s" },
      ],
    },
    {
      day: "SUN",
      label: "Walk & Stretch",
      focus: "Recovery",
      workouts: [
        { name: "Outdoor walk", sets: "60 min", load: "Brisk", rest: "—" },
        { name: "Hip & T-spine flow", sets: "15 min", load: "Easy", rest: "—" },
      ],
    },
  ],
  nutrition: {
    calories: 2200,
    protein: 140,
    carbs: 220,
    fats: 75,
    meals: [
      { time: "08:00", name: "Breakfast", items: "Greek yogurt, berries, walnuts, honey" },
      { time: "13:00", name: "Lunch", items: "Salmon, quinoa, rocket, olive oil" },
      { time: "16:30", name: "Snack", items: "Apple, almonds, dark chocolate" },
      { time: "19:30", name: "Dinner", items: "Chicken, lentils, roasted veg" },
    ],
    supplements: ["Vit D3 2000 IU", "Omega 3 2g", "Magnesium 300mg", "Creatine 5g"],
  },
  recovery: {
    sleepTarget: "7h 30m",
    hrvTrend: "Stable",
    protocols: [
      "10k steps daily",
      "Sunlight 10 min AM",
      "No screens 60 min pre-bed",
      "Resistance training 2× weekly minimum",
    ],
  },
  morningRoutine: [
    "Box breath 2 min",
    "Hip openers ×8",
    "Thoracic rotations ×10",
    "Wall slides ×10",
  ],
};

const FOOTBALL_MODES = {
  off: {
    label: "Off Season",
    focus: "Rebuild base · strength foundation",
    days: [
      {
        day: "MON",
        label: "Lower Strength",
        focus: "Quads · glutes",
        workouts: [
          { name: "Back Squat", sets: "5 × 5", load: "RPE 8", rest: "180s" },
          { name: "Bulgarian Split Squat", sets: "3 × 8", load: "DB", rest: "90s" },
          { name: "Nordic Curl", sets: "3 × 6", load: "BW", rest: "90s" },
          { name: "Standing Calf", sets: "4 × 12", load: "Heavy", rest: "60s" },
        ],
      },
      { day: "TUE", label: "Upper Strength", focus: "Push & pull", workouts: [
        { name: "Bench Press", sets: "4 × 6", load: "RPE 8", rest: "150s" },
        { name: "Weighted Pull-Up", sets: "4 × 6", load: "+10kg", rest: "150s" },
        { name: "DB Row", sets: "3 × 10", load: "Heavy", rest: "90s" },
        { name: "Face Pull", sets: "3 × 15", load: "Light", rest: "60s" },
      ] },
      { day: "WED", label: "Z2 Engine", focus: "Aerobic base", workouts: [
        { name: "Zone 2 run", sets: "45 min", load: "HR 130-145", rest: "—" },
      ] },
      { day: "THU", label: "Power", focus: "Explosive", workouts: [
        { name: "Hang Clean", sets: "5 × 3", load: "70%", rest: "180s" },
        { name: "Box Jump", sets: "4 × 4", load: "Max", rest: "120s" },
        { name: "Med Ball Slam", sets: "4 × 6", load: "8kg", rest: "60s" },
      ] },
      { day: "SAT", label: "Light Ball", focus: "Touch retention", workouts: [
        { name: "Rondos", sets: "20 min", load: "Easy", rest: "—" },
        { name: "Passing drills", sets: "15 min", load: "Easy", rest: "—" },
      ] },
    ],
    nutrition: {
      calories: 2900, protein: 180, carbs: 320, fats: 95,
      note: "Lean recomp. Protein high, carbs around training only.",
    },
  },
  pre: {
    label: "Pre Season",
    focus: "Football-specific conditioning",
    days: [
      { day: "MON", label: "Speed Endurance", focus: "Pitch · RSA", workouts: [
        { name: "RSA: 6 × 40m sprints / 30s rest", sets: "3 sets", load: "Max", rest: "3 min" },
        { name: "Yo-Yo IR1 prep", sets: "10 min", load: "Build", rest: "—" },
      ] },
      { day: "TUE", label: "Strength Maintain", focus: "Gym short", workouts: [
        { name: "Trap Bar Deadlift", sets: "4 × 4", load: "Heavy", rest: "150s" },
        { name: "Bench Press", sets: "3 × 5", load: "RPE 7", rest: "120s" },
        { name: "Chin-Up", sets: "3 × 6", load: "Heavy", rest: "120s" },
      ] },
      { day: "WED", label: "Ball + Agility", focus: "Pitch session", workouts: [
        { name: "Possession game", sets: "25 min", load: "High", rest: "—" },
        { name: "Cone agility ladder", sets: "10 min", load: "Sharp", rest: "—" },
      ] },
      { day: "THU", label: "Recovery", focus: "Mobility · pool", workouts: [
        { name: "Pool walk + flow", sets: "30 min", load: "Easy", rest: "—" },
      ] },
      { day: "FRI", label: "Tactical + Set Pieces", focus: "Pitch", workouts: [
        { name: "11v11 phases", sets: "40 min", load: "Match pace", rest: "—" },
      ] },
      { day: "SAT", label: "Friendly", focus: "Test fitness", workouts: [
        { name: "Pre-season fixture", sets: "60-90 min", load: "Match", rest: "—" },
      ] },
    ],
    nutrition: {
      calories: 3100, protein: 180, carbs: 400, fats: 85,
      note: "Carbs up around double sessions. Hydration + electrolytes critical.",
    },
  },
  in: {
    label: "In Season",
    focus: "Maintain · MD-1 / MD / MD+1",
    days: [
      { day: "MON (MD+1)", label: "Recovery", focus: "Flush + mobility", workouts: [
        { name: "Pool / bike flush", sets: "20 min", load: "Easy", rest: "—" },
        { name: "Soft tissue + stretch", sets: "20 min", load: "—", rest: "—" },
      ] },
      { day: "TUE", label: "Gym Maintain", focus: "Heavy & short", workouts: [
        { name: "Trap Bar Deadlift", sets: "3 × 3", load: "RPE 7", rest: "150s" },
        { name: "Bench Press", sets: "3 × 4", load: "RPE 7", rest: "120s" },
        { name: "Chin-Up", sets: "3 × 5", load: "Heavy", rest: "120s" },
      ] },
      { day: "WED", label: "Tactical", focus: "Pitch — units", workouts: [
        { name: "Possession + transitions", sets: "30 min", load: "Match-pace", rest: "—" },
      ] },
      { day: "THU", label: "Speed (MD-2)", focus: "Sharpness", workouts: [
        { name: "Sprints 6 × 20m", sets: "2 sets", load: "Max", rest: "Full" },
        { name: "Reactive plyo", sets: "10 min", load: "Sharp", rest: "—" },
      ] },
      { day: "FRI (MD-1)", label: "Activation", focus: "Set pieces", workouts: [
        { name: "Tactical walk-through", sets: "30 min", load: "Light", rest: "—" },
      ] },
      { day: "SAT (MD)", label: "Match Day", focus: "Compete", workouts: [
        { name: "Warm-up protocol", sets: "25 min", load: "Build", rest: "—" },
        { name: "Match", sets: "90 min", load: "Max", rest: "—" },
      ] },
    ],
    nutrition: {
      calories: 2800, protein: 170, carbs: 360, fats: 80,
      note: "Carb-load MD-1 evening. Protein + carbs within 60 min post-match.",
    },
  },
};

export const FOOTBALL_APP = {
  brand: "Football Player",
  tagline: "Built around the calendar.",
  hero: "https://images.pexels.com/photos/6409107/pexels-photo-6409107.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  accent: "#D4FF00",
  modes: FOOTBALL_MODES,
};

export const SPRINTER_APP = {
  brand: "Sprinter",
  tagline: "Faster. Sharper. Sub-second decisions.",
  hero: "https://images.pexels.com/photos/2526878/pexels-photo-2526878.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  accent: "#D4FF00",
  days: [
    {
      day: "MON",
      label: "Acceleration",
      focus: "0–30m · block starts",
      workouts: [
        { name: "Block starts", sets: "8 × 20m", load: "Max effort", rest: "Full 3 min" },
        { name: "Resisted sprints (sled)", sets: "6 × 20m", load: "10% BW", rest: "2-3 min" },
        { name: "Wall drives", sets: "4 × 10s", load: "Sharp", rest: "60s" },
        { name: "A-skips · B-skips", sets: "3 × 20m each", load: "Crisp", rest: "60s" },
      ],
    },
    {
      day: "TUE",
      label: "Power Lift",
      focus: "CNS · explosive strength",
      workouts: [
        { name: "Power Clean", sets: "5 × 3", load: "75-85% 1RM", rest: "180s" },
        { name: "Back Squat", sets: "4 × 4", load: "RPE 8", rest: "180s" },
        { name: "Romanian Deadlift", sets: "3 × 6", load: "Heavy", rest: "150s" },
        { name: "Depth Jump", sets: "4 × 4", load: "Reactive", rest: "120s" },
        { name: "Standing Calf", sets: "4 × 8", load: "Heavy", rest: "60s" },
      ],
    },
    {
      day: "WED",
      label: "Tempo",
      focus: "Recovery · technique",
      workouts: [
        { name: "Tempo runs 100m", sets: "10 × 100m", load: "70%", rest: "100m walk" },
        { name: "Pogo hops", sets: "4 × 20", load: "Stiff", rest: "60s" },
        { name: "Core circuit", sets: "3 rounds", load: "Anti-rotation", rest: "60s" },
      ],
    },
    {
      day: "THU",
      label: "Max Velocity",
      focus: "30–60m · top end",
      workouts: [
        { name: "Flying 30s", sets: "6 × 30m", load: "Max", rest: "Full 4 min" },
        { name: "Ins & outs 60m", sets: "4 × 60m", load: "Max top end", rest: "Full" },
        { name: "Bounding", sets: "4 × 20m", load: "Long contacts", rest: "120s" },
        { name: "Single leg hops", sets: "3 × 10m each", load: "Reactive", rest: "90s" },
      ],
    },
    {
      day: "FRI",
      label: "Posterior Power",
      focus: "Hamstrings · glutes",
      workouts: [
        { name: "Trap Bar Deadlift", sets: "5 × 3", load: "RPE 8", rest: "180s" },
        { name: "Nordic Curl", sets: "4 × 5", load: "Slow eccentric", rest: "120s" },
        { name: "Hip Thrust", sets: "4 × 6", load: "Heavy", rest: "120s" },
        { name: "Reverse Hyper", sets: "3 × 12", load: "Moderate", rest: "60s" },
      ],
    },
    {
      day: "SAT",
      label: "Speed Endurance",
      focus: "150–300m race prep",
      workouts: [
        { name: "150m repeats", sets: "5 × 150m", load: "90%", rest: "Full 5 min" },
        { name: "Sled push 20m", sets: "4 × 20m", load: "Heavy", rest: "120s" },
      ],
    },
    {
      day: "SUN",
      label: "Recovery",
      focus: "Soft tissue · pool",
      workouts: [
        { name: "Pool walk + flush", sets: "30 min", load: "Easy", rest: "—" },
        { name: "Sauna + cold contrast", sets: "20 min", load: "—", rest: "—" },
        { name: "Mobility flow", sets: "20 min", load: "Easy", rest: "—" },
      ],
    },
  ],
  nutrition: {
    calories: 3000,
    protein: 200,
    carbs: 350,
    fats: 85,
    meals: [
      { time: "06:30", name: "Pre-Train", items: "Oats, banana, whey, espresso, beetroot juice" },
      { time: "10:30", name: "Post-Train", items: "Chicken, jasmine rice, kimchi, olive oil" },
      { time: "14:00", name: "Lunch", items: "Steak, sweet potato, spinach" },
      { time: "17:30", name: "Pre-Lift", items: "Whey + dextrose, rice cake, honey" },
      { time: "20:30", name: "Dinner", items: "Salmon, pasta, tomato, parmesan, rocket" },
      { time: "22:30", name: "Pre-Sleep", items: "Casein, walnuts, tart cherry juice" },
    ],
    supplements: [
      "Creatine 5g",
      "Beta-alanine 4g",
      "Whey 40g",
      "Beetroot juice (pre-session)",
      "Omega 3 2g",
      "Magnesium 400mg",
      "Vit D3 4000 IU",
    ],
  },
  recovery: {
    sleepTarget: "9h 00m",
    hrvTrend: "Watch CNS",
    protocols: [
      "Cold plunge 2 min post-session (not before)",
      "Sauna 20 min × 3/week (off-day)",
      "Soft tissue (hamstrings, hips) 4×/week",
      "10 min sun + walk AM — circadian",
      "Sleep 9h minimum during heavy blocks",
    ],
  },
  morningRoutine: [
    "Ankle pulses ×20",
    "Hip 90/90 switch ×8",
    "Pogo hops ×20",
    "A-skip ×20m",
    "Wall drive ×10s",
    "Cobra to downward dog ×8",
  ],
};
