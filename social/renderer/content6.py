D, L = True, False

BATCH6 = [

dict(slug="55_inside_the_app", dark=D, label="the product", slides=[
  dict(kind="cover", eyebrow="what you get", head="What is actually inside your plan"),
  dict(kind="list", eyebrow="tabs", head="Five, and you only see the ones you need", items=[
       "Train: your sessions, week by week",
       "Morning: a routine, if you have one",
       "Fuel: meals and macros, if nutrition is part of it",
       "Recover: sleep and recovery alongside the training",
       "Details: your plan, your name on it"]),
  dict(kind="phone", layout="bleed", eyebrow="today", head="It opens here, on today",
       view="today", data=dict(subtitle="Your plan · Week 2", hero="TODAY · MON", done="0/4 done")),
  dict(kind="statement", head="It opens on your phone at the session you are on. No login, no app store."),
  dict(kind="cta", head="Save it to your home screen", sub="Free sample previews in the bio."),
]),

dict(slug="56_rebuild_feature", dark=D, label="the product", slides=[
  dict(kind="cover", eyebrow="new", head="Something changed? Build your next block from the one you have."),
  dict(kind="list", eyebrow="when people use it", head="The usual reasons", items=[
       "Picked up an injury and need to work around it",
       "Training days changed",
       "Different gym, or away for a fortnight",
       "Finished the four weeks and want the next one"]),
  dict(kind="statement", head="It inherits everything you told us first time. No questionnaire twice."),
  dict(kind="statement", head="Your old plan keeps working. Nothing you logged is lost."),
  dict(kind="cta", head="Built from where you actually got to", sub="Not a restart."),
]),

dict(slug="57_reasoning_field", dark=D, label="the product", slides=[
  dict(kind="cover", eyebrow="the bit we are proudest of", head="Tap any exercise and it tells you why it is there"),
  dict(kind="statement", head="Not a generic description. Why it is in YOUR plan, given what you told us."),
  dict(kind="list", eyebrow="what that gets you", head="Three things", items=[
       "You know what you are actually training",
       "You can swap it sensibly when the rack is taken",
       "You stop quietly skipping the ones you do not understand"]),
  dict(kind="phone", layout="bleed", eyebrow="tap the icon", head="This is what you see",
       view="train", data=dict(subtitle="Strength · Week 3", hero="WEDNESDAY · UPPER + TRUNK",
       focus="Upper + trunk",
       rows=[("Weighted pull-up","4x6","+10kg","3 min"),
             ("Incline dumbbell press","3x8","30kg","2 min"),
             ("Face pull","3x15","20kg","60 sec"),
             ("Farmer's carry","3x40m","32kg","90 sec")],
       reason_on=2,
       reason="You spend nine hours a day rounded forward at a desk. This trains what holds your shoulder blades back, so your pressing does not outpace what supports it.")),
  dict(kind="statement", head="Almost nothing else in this space will show you this."),
  dict(kind="cta", head="See it on a real session", sub="Free sample previews in the bio."),
]),

dict(slug="58_travel_plans", dark=D, label="travelling", slides=[
  dict(kind="cover", eyebrow="going away", head="Every fitness app assumes you are at home"),
  dict(kind="statement", head="Two weeks away and your plan becomes a document about a gym you cannot reach."),
  dict(kind="list", eyebrow="tell it", head="Hotel gym is an option", items=[
       "Built around dumbbells, a bench and a treadmill",
       "Substitutions if it turns out to be more basic",
       "Enough structure to hold what you built",
       "No pretending you can squat 140 in a basement"]),
  dict(kind="cta", head="Pick hotel or travelling", sub="It plans for what is actually there."),
]),

dict(slug="59_goal_calisthenics", dark=D, label="new goal", slides=[
  dict(kind="cover", eyebrow="new", head="Calisthenics, properly programmed"),
  dict(kind="statement", head="Bodyweight training is not the same as skill progression. We built the second one."),
  dict(kind="list", eyebrow="how it works", head="Gated on prerequisites", items=[
       "Skill work first, on a fresh nervous system",
       "Progressions that require you to earn the next step",
       "Straight-arm and elbow prep every single week",
       "Holds prescribed in seconds, with a target"]),
  dict(kind="statement", head="No bar or rings? It says so and builds floor progressions instead."),
  dict(kind="cta", head="Tell it where you are with the skills", sub="Beginner is a normal answer."),
]),

dict(slug="60_goal_powerlifting", dark=D, label="new goal", slides=[
  dict(kind="cover", eyebrow="new", head="Powerlifting, with meet week built in"),
  dict(kind="list", eyebrow="how it is structured", head="What it does differently", items=[
       "Percentages of your estimated max, not fixed weights",
       "Intensity climbs as volume falls",
       "Never heavy squats and heavy deadlifts back to back",
       "Accessories that serve the three lifts, not set counts"]),
  dict(kind="statement", head="Got a meet? Tell it how far out and it peaks you into it."),
  dict(kind="cta", head="Squat, bench, deadlift", sub="Programmed as a sport, not a split."),
]),

dict(slug="61_goal_crossfit", dark=D, label="new goal", slides=[
  dict(kind="cover", eyebrow="new", head="CrossFit, with the safety rails that matter"),
  dict(kind="list", eyebrow="hard rules", head="What it will not do", items=[
       "High-rep olympic lifting under heavy fatigue",
       "Skill work bolted on after the metcon",
       "Heavy barbell and high-volume gymnastics in one session",
       "Kipping volume before strict strength exists"]),
  dict(kind="statement", head="Technical failure under load is how people get hurt. So it is programmed out."),
  dict(kind="cta", head="Comp coming up?", sub="Tell it how far out."),
]),

dict(slug="62_why_i_built_it", dark=L, label="build in public", slides=[
  dict(kind="cover", eyebrow="build in public", head="Why I built a training app nobody asked for"),
  dict(kind="statement", head="I was paying monthly for a plan an app wrote once, in about four seconds."),
  dict(kind="list", eyebrow="the three things", head="That I could not let go of", items=[
       "Charging monthly for a one-time generation",
       "Plans that never explain themselves",
       "Templates dressed up as personalisation"]),
  dict(kind="statement", head="Solo founder, UK, no team. Everything here I built, broke and rebuilt."),
  dict(kind="cta", head="Following along is free", sub="More mistakes to come, presumably."),
]),

dict(slug="63_twelve_to_four", dark=L, label="build in public", slides=[
  dict(kind="cover", eyebrow="build in public", head="I built twelve-week plans first. They were worse."),
  dict(kind="statement", head="The longer the plan ran, the vaguer the output got."),
  dict(kind="list", eyebrow="what happened", head="Weeks nine to twelve", items=[
       "Exercise selection drifted into filler",
       "Progression became 'increase as able'",
       "The reasoning got generic",
       "It was guessing about a person it had never met"]),
  dict(kind="statement", head="Cut it to four weeks and the quality jumped immediately."),
  dict(kind="cta", head="Four weeks, then reassess", sub="Free sample previews in the bio."),
]),

dict(slug="64_the_cycle_bug", dark=L, label="build in public", slides=[
  dict(kind="cover", eyebrow="build in public", head="The bug that quietly deleted people's progress"),
  dict(kind="statement", head="People repeat a four-week block. I had not properly accounted for that."),
  dict(kind="list", eyebrow="what happened", head="Cycle two overwrote cycle one", items=[
       "Same block, second run through",
       "Logged weights keyed by day, not by cycle",
       "So week one of cycle two wrote over week one of cycle one",
       "Meaning the comparison you actually wanted was gone"]),
  dict(kind="statement", head="Took me an embarrassingly long time to spot. Every solo founder ships bugs. Most just do not post about them."),
  dict(kind="cta", head="Fixed, and cycles now stack", sub="Following along is free."),
]),

dict(slug="65_ripped_out_subs", dark=L, label="build in public", slides=[
  dict(kind="cover", eyebrow="build in public", head="I built a subscription, then deleted it"),
  dict(kind="statement", head="Everyone said recurring revenue. So I built recurring revenue."),
  dict(kind="list", eyebrow="then I used it", head="And it felt wrong", items=[
       "The work happens once, at the start",
       "Charging monthly for that is not a service",
       "Cancelling meant losing a plan you had paid for repeatedly",
       "I would not have paid it myself"]),
  dict(kind="statement", head="So it came out. One payment, plan is yours, come back only if you want to."),
  dict(kind="cta", head="Probably a worse business", sub="Definitely a better product."),
]),

dict(slug="66_guardrails", dark=L, label="build in public", slides=[
  dict(kind="cover", eyebrow="build in public", head="Nobody checks the plan before it reaches you. So I had to build the checks."),
  dict(kind="statement", head="That is the uncomfortable bit about generated training plans, and most companies will not say it out loud."),
  dict(kind="list", eyebrow="hard rules", head="Things it simply cannot do", items=[
       "Heavy squats and heavy deadlifts on consecutive days",
       "A max attempt in week one",
       "High-rep olympic lifting under heavy fatigue",
       "A skill progression you have not earned the prerequisites for"]),
  dict(kind="statement", head="Different rules per sport, because the ways people get hurt are different."),
  dict(kind="cta", head="Built to fail safe", sub="Following along is free."),
]),

dict(slug="67_gated_professionals", dark=L, label="build in public", slides=[
  dict(kind="cover", eyebrow="build in public", head="I added friction on purpose, and I would do it again"),
  dict(kind="statement", head="Coaches and physios build plans for other people. That is a different responsibility."),
  dict(kind="list", eyebrow="so", head="The professional route asks for", items=[
       "Your credentials, before you can build for anyone",
       "Acceptance of a disclaimer",
       "Your approval on every plan before it reaches a client"]),
  dict(kind="statement", head="Fewer signups. Better ones. Clinical judgement never leaves the professional."),
  dict(kind="cta", head="Coaches and physios, DM me", sub="I verify people personally."),
]),

dict(slug="68_correction_window", dark=L, label="build in public", slides=[
  dict(kind="cover", eyebrow="build in public", head="What happens when the plan is wrong?"),
  dict(kind="statement", head="Every company avoids this question. Here is our answer."),
  dict(kind="list", eyebrow="48 hours", head="Or until your first logged session", items=[
       "Tell us what is wrong and we fix it",
       "No charge, no argument",
       "After that the plan is fixed",
       "Because by then you are training, not correcting"]),
  dict(kind="statement", head="It is a small window on purpose. Long enough for a mistake, short enough that one payment is not an unlimited rewrite."),
  dict(kind="cta", head="Fair both ways", sub="Following along is free."),
]),

dict(slug="69_qa", dark=L, label="ask me anything", slides=[
  dict(kind="cover", eyebrow="ask me anything", head="Your questions, answered properly"),
  dict(kind="list", eyebrow="ask about", head="Anything really", items=[
       "How the plans are actually built",
       "Why four weeks and not twelve",
       "Building a product on your own",
       "Whatever you are stuck on in your own training"]),
  dict(kind="statement", head="Comments open. I answer all of them, and it is actually me."),
  dict(kind="cta", head="Ask away", sub="No question too basic."),
]),

dict(slug="70_gym_retention", dark=L, label="for gyms", slides=[
  dict(kind="cover", eyebrow="for gyms", head="Most members who quit never had a plan"),
  dict(kind="list", eyebrow="the pattern", head="You have watched this happen", items=[
       "They join in January, full of intent",
       "Wander between machines for three weeks",
       "See nothing change",
       "Stop coming, keep paying, then cancel"]),
  dict(kind="statement", head="A structured first four weeks is the cheapest retention tool you have."),
  dict(kind="statement", head="Branded to your gym, built by your team, on their phone."),
  dict(kind="cta", head="Run a gym? DM me", sub="I would like to hear how you handle onboarding."),
]),

dict(slug="71_deleted_features", dark=L, label="build in public", slides=[
  dict(kind="cover", eyebrow="build in public", head="Most of building this was deleting things I was proud of"),
  dict(kind="list", eyebrow="gone", head="Things that did not survive", items=[
       "Twelve-week plans",
       "The subscription",
       "Condition-specific health protocols: too much risk, not enough certainty",
       "A standalone travel product, before it had earned its place"]),
  dict(kind="statement", head="Every one of those took real work and none of them are in the product."),
  dict(kind="statement", head="Building is mostly deciding what not to ship."),
  dict(kind="cta", head="Following along is free", sub="More deletions to come."),
]),

dict(slug="72_ask_for_features", dark=L, label="build in public", slides=[
  dict(kind="cover", eyebrow="build in public", head="Tell me what to build next"),
  dict(kind="statement", head="Genuinely. That is how the last three features got prioritised."),
  dict(kind="list", eyebrow="already asked for", head="On the list because someone said so", items=[
       "Training around fixed club sessions",
       "Rebuilding a plan when something changes",
       "Hotel and travel training",
       "Calisthenics as a proper skill progression"]),
  dict(kind="statement", head="Small company, so the person reading your comment is the person building it."),
  dict(kind="cta", head="Comments open", sub="What is missing?"),
]),
]
