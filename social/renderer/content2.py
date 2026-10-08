D, L = True, False

MORE = [

# ---------------------------------------------------------------- 11 LAUNCH
dict(slug="11_launch", dark=D, label="hello", slides=[
  dict(kind="cover", eyebrow="new",
       head="A proper four-week training block, built around you."),
  dict(kind="statement", head="I got sick of paying a fitness app every month for a plan it wrote once."),
  dict(kind="list", eyebrow="what it asks", head="Real questions, not a vibe check", items=[
       "How many days you can actually train",
       "What equipment you genuinely have access to",
       "What your body is currently complaining about",
       "What you are training for, if anything"]),
  dict(kind="list", eyebrow="what you get", head="Four weeks, periodised", items=[
       "Progressive overload built into the structure",
       "Every exercise explains why it is in there",
       "Weight and rep logging on your phone",
       "The plan is yours, permanently"]),
  dict(kind="statement", head="One payment. No subscription, no renewal, no expired trial."),
  dict(kind="cta", head="Read a full plan before you spend a penny",
       sub="Four free sample plans. No card, no email wall."),
]),

# ---------------------------------------------------------------- 12 COACH 3 MIN
dict(slug="12_coach_three_min", dark=L, label="for coaches", slides=[
  dict(kind="cover", eyebrow="for coaches",
       head="A four-week block for a new client, in three minutes"),
  dict(kind="list", eyebrow="the brief", head="Say the client is", items=[
       "34, desk job, three days a week",
       "Left knee that does not like deep loading",
       "Wants to get meaningfully stronger",
       "Trains at a commercial gym, evenings"]),
  dict(kind="statement", head="In it goes. Out comes the block, periodised, and knee-aware from week one."),
  dict(kind="list", eyebrow="then the real work", head="You edit it", items=[
       "Swap the accessory you do not rate",
       "Add your own coaching notes",
       "Change the split if you disagree with it",
       "Approve, and send"]),
  dict(kind="statement", head="That used to be your evening. It is now the bit before your evening."),
  dict(kind="cta", head="DM me and I will walk you through it",
       sub="One-person company, so it will actually be me."),
]),

# ---------------------------------------------------------------- 13 PAYMENT ROUTES
dict(slug="13_coach_payment_routes", dark=L, label="for coaches", slides=[
  dict(kind="cover", eyebrow="the bit people miss",
       head="You do not have to front the cost for your clients"),
  dict(kind="list", eyebrow="route one", head="Client pays direct", items=[
       "You build the plan and send them a link",
       "They pay for it themselves",
       "You never handle the money",
       "You never chase an invoice for someone who went quiet"]),
  dict(kind="list", eyebrow="route two", head="You pay per client", items=[
       "Bundle it into your existing package",
       "Client never sees a separate charge",
       "Simpler if you are already on a retainer model"]),
  dict(kind="statement", head="Either way, the plan goes out with your review on it."),
  dict(kind="cta", head="Which one suits how you already work?",
       sub="DM me and I will set it up with you."),
]),

# ---------------------------------------------------------------- 14 ADHERENCE
dict(slug="14_adherence", dark=D, label="training", slides=[
  dict(kind="cover", eyebrow="hot take",
       head="The best exercise is the one you will still be doing in week four"),
  dict(kind="statement", head="People hunt for the optimal exercise like there is a correct list. There isn't."),
  dict(kind="list", eyebrow="what decides it", head="Whether you keep doing it", items=[
       "Do you understand what it is for",
       "Can you actually get to the kit",
       "Does it fit the time you have",
       "Does it aggravate anything"]),
  dict(kind="statement", head="A perfect plan you abandon is worse than a decent plan you finish."),
  dict(kind="statement", head="Which is why the questions are about your gym, your week and your body, not just your goal."),
  dict(kind="cta", head="Built around your actual week",
       sub="Free sample plans in the bio."),
]),

# ---------------------------------------------------------------- 15 SAMPLE: FOOTBALL
dict(slug="15_sample_football", dark=D, label="sample plan", slides=[
  dict(kind="cover", eyebrow="sample plan",
       head="Semi-pro footballer. Match Saturday. Here is the week."),
  dict(kind="list", eyebrow="the brief", head="What it was told", items=[
       "Club training Tuesday and Thursday",
       "Match every Saturday",
       "Wants to get stronger without turning up cooked",
       "Full gym access"]),
  dict(kind="plan", eyebrow="week one", head="How it laid the week out", items=[
       ("mon", "Lower strength", "Heaviest day, furthest from the match"),
       ("tue", "Club training", "No gym load added"),
       ("wed", "Upper + trunk", "Low leg involvement"),
       ("thu", "Club training", "No gym load added"),
       ("fri", "Primer only", "Short, sharp, nothing fatiguing"),
       ("sat", "Match", ""),
       ("sun", "Off", "")]),
  dict(kind="phone", layout="bleed", eyebrow="monday", head="Inside the Monday session",
       view="train", data=dict(subtitle="Football · Week 2", hero="MONDAY · LOWER STRENGTH",
       focus="Lower strength",
       rows=[("Back squat","4x5","82.5kg","3 min"),
             ("Romanian deadlift","3x8","70kg","2 min"),
             ("Nordic curl","3x6","bodyweight","90 sec"),
             ("Lateral bound","3x6 each","bodyweight","90 sec")],
       reason_on=2,
       reason="Hamstring strain is the most common injury in football and it happens at high speed, under length. This trains the hamstring exactly there.")),
  dict(kind="statement", head="No heavy lower body the day before a match. That is the whole point.",
       sub="A template cannot do that, because a template does not know when you play."),
  dict(kind="statement", head="Then weeks two and three build, and week four backs off.",
       sub="That is periodisation, not just adding 2.5kg."),
  dict(kind="cta", head="The full plan is free to read",
       sub="Every session, every exercise, all four weeks."),
]),

# ---------------------------------------------------------------- 16 SAMPLE: REHAB
dict(slug="16_sample_rehab", dark=L, label="for physios", slides=[
  dict(kind="cover", eyebrow="for physios",
       head="Structure your rehab by phase, not by weekday."),
  dict(kind="statement", head="There is rarely a plan. There is just 'take it easy', and then one day you don't."),
  dict(kind="list", eyebrow="the shape", head="Progressing by stage, not by weekday", items=[
       "Phase 1: tolerance. Low load, high control",
       "Phase 2: capacity. Volume climbs, load steady",
       "Phase 3: load. Intensity introduced carefully",
       "Phase 4: consolidate. Back off and reassess"]),
  dict(kind="statement", head="Every step says what it is doing and why, so you know whether to hold or move on."),
  dict(kind="statement", head="This does not replace your physio.",
       sub="Get assessed first. This is the structure that goes around professional advice, never instead of it."),
  dict(kind="cta", head="Physios, DM me for a look",
       sub="Days or phases, your call. You build it, you approve it."),
]),

# ---------------------------------------------------------------- 17 SAMPLE: LONGEVITY
dict(slug="17_sample_longevity", dark=D, label="sample plan", slides=[
  dict(kind="cover", eyebrow="sample plan",
       head="A training plan for people who are not training for anything"),
  dict(kind="statement", head="Most plans assume a race, a comp, or a number on a bar."),
  dict(kind="statement", head="Plenty of people just want to still get off the floor unaided at seventy-five.",
       sub="That is a real goal, and almost nobody programmes for it."),
  dict(kind="list", eyebrow="what it prioritises", head="Beyond just lifting", items=[
       "Strength, because it underwrites everything else",
       "Loaded carries and grip",
       "Balance and single-leg control",
       "Getting up and down off the floor, deliberately trained"]),
  dict(kind="phone", layout="bleed", eyebrow="a full session", head="What a session looks like",
       view="train", data=dict(subtitle="Longevity · Week 3", hero="TUESDAY · FULL BODY",
       focus="Full body + carries",
       rows=[("Goblet squat","3x10","24kg","90 sec"),
             ("Single-leg stand","3x30s each","bodyweight","60 sec"),
             ("Farmer's carry","4x40m","24kg each","90 sec"),
             ("Get-up to standing","3x5","bodyweight","90 sec")],
       reason_on=3,
       reason="Getting off the floor unaided predicts independence later on. Almost nobody trains it deliberately, so it is here as its own exercise.")),
  dict(kind="statement", head="Boring on paper. Enormous over thirty years."),
  dict(kind="cta", head="Read the longevity sample free",
       sub="All four weeks, no card needed."),
]),

# ---------------------------------------------------------------- 18 SAMPLE: SPRINT
dict(slug="18_sample_sprint", dark=D, label="sample plan", slides=[
  dict(kind="cover", eyebrow="sample plan",
       head="If your gym work is leaving you flat on the track, it is a scheduling problem"),
  dict(kind="statement", head="A bodybuilding split bolted onto sprint training works against you. Every time."),
  dict(kind="plan", eyebrow="week one", head="Lifting built around the running", items=[
       ("mon", "Speed + lift", "Lift follows the track work, same day"),
       ("tue", "Easy / mobility", "Deliberately low"),
       ("wed", "Speed endurance", "No lifting"),
       ("thu", "Lift", "Strength focus, fresh legs"),
       ("fri", "Off", ""),
       ("sat", "Track", "Quality session"),
       ("sun", "Off", "")]),
  dict(kind="phone", layout="bleed", eyebrow="monday", head="The lift that follows the track",
       view="train", data=dict(subtitle="Sprints · Week 2", hero="MONDAY · SPEED + LIFT",
       focus="Speed + lift",
       rows=[("Trap bar deadlift","4x3","140kg","4 min"),
             ("Split squat","3x6 each","24kg DB","2 min"),
             ("Hip thrust","3x8","100kg","2 min"),
             ("Calf pogo","3x12","bodyweight","60 sec")],
       reason_on=0,
       reason="Low reps, heavy, well short of failure. You already did the hard work on the track. This builds force, not fatigue.")),
  dict(kind="statement", head="Hard days stay hard. Easy days stay genuinely easy.",
       sub="Volume in the wrong place quietly kills the quality of your track sessions."),
  dict(kind="cta", head="Full sprint sample, free to read",
       sub="Four weeks, every session."),
]),
]
