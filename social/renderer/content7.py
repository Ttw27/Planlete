D, L = True, False

# Shared session data so the mockups stay consistent post to post.
LOWER = [("Back squat","4x5","82.5kg","3 min"),
         ("Romanian deadlift","3x8","70kg","2 min"),
         ("Bulgarian split squat","3x10","20kg DB","90 sec"),
         ("Standing calf raise","3x12","40kg","60 sec")]
UPPER = [("Weighted pull-up","4x6","+10kg","3 min"),
         ("Incline dumbbell press","3x8","30kg","2 min"),
         ("Face pull","3x15","20kg","60 sec"),
         ("Farmer's carry","3x40m","32kg","90 sec")]

BATCH7 = [

dict(slug="73_app_rest_timer", dark=D, label="the app", slides=[
  dict(kind="cover", eyebrow="feature", head="A timer on every exercise, set to the right rest"),
  dict(kind="phone", layout="bleed", eyebrow="train", head="Rest is prescribed, not guessed",
       view="train", data=dict(subtitle="Strength · Week 2", hero="MONDAY · LOWER STRENGTH",
       focus="Lower strength", rows=LOWER)),
  dict(kind="statement", head="Three minutes on a heavy squat. Sixty seconds on calves. The plan knows the difference.",
       sub="Tap the timer and it counts you down. No phone stopwatch, no guessing."),
  dict(kind="cta", head="Rest that matches the work", sub="Free sample previews in the bio."),
]),

dict(slug="74_app_reasoning", dark=D, label="the app", slides=[
  dict(kind="cover", eyebrow="feature", head="Every exercise tells you why it is in your plan"),
  dict(kind="phone", layout="bleed", eyebrow="tap the icon", head="This is what you see",
       view="train", data=dict(subtitle="Strength · Week 3", hero="WEDNESDAY · UPPER + TRUNK",
       focus="Upper + trunk", rows=UPPER, reason_on=2,
       reason="You spend nine hours a day rounded forward at a desk. This trains what holds your shoulder blades back, so your pressing does not outpace what supports it.")),
  dict(kind="statement", head="Not a generic description. Why it is in YOUR plan, given what you told us."),
  dict(kind="cta", head="Doing the work is easier when you understand it", sub="Free sample previews in the bio."),
]),

dict(slug="75_app_logging", dark=D, label="the app", slides=[
  dict(kind="cover", eyebrow="feature", head="Log what you lifted, where the plan already is"),
  dict(kind="phone", layout="bleed", eyebrow="train", head="Tick it off as you go",
       view="train", data=dict(subtitle="Strength · Week 2", hero="MONDAY · LOWER STRENGTH",
       focus="Lower strength", rows=LOWER)),
  dict(kind="statement", head="Not a second app you will stop opening by Thursday."),
  dict(kind="statement", head="And week three shows you exactly what week one looked like.",
       sub="Which is the only honest way to know it is working."),
  dict(kind="cta", head="Two minutes a session", sub="Free sample previews in the bio."),
]),

dict(slug="76_app_today_view", dark=D, label="the app", slides=[
  dict(kind="cover", eyebrow="feature", head="It opens on today. Not a contents page."),
  dict(kind="phone", layout="bleed", eyebrow="today", head="Straight to the session you are on",
       view="today", data=dict(subtitle="Football · Week 2", hero="TODAY · MON", done="0/4 done")),
  dict(kind="statement", head="No scrolling through weeks you already did. No hunting for the right day."),
  dict(kind="cta", head="Save it to your home screen", sub="Then it is just there, like any other app."),
]),

dict(slug="77_app_five_tabs", dark=D, label="the app", slides=[
  dict(kind="cover", eyebrow="feature", head="Five tabs, and you only get the ones you need"),
  dict(kind="phone", layout="offset", eyebrow="jump to", head="Train. Morning. Fuel. Recover.",
       view="today", data=dict(subtitle="Longevity · Week 1", hero="TODAY · TUE", done="0/4 done")),
  dict(kind="list", eyebrow="what each does", head="Only what applies to you", items=[
       "Train: your sessions, week by week",
       "Morning: a routine, if you have one",
       "Fuel: meals and macros, if nutrition is part of it",
       "Recover: sleep and protocols alongside the training"]),
  dict(kind="statement", head="No nutrition in your plan? The Fuel tab simply is not there."),
  dict(kind="cta", head="Built to what you asked for", sub="Free sample previews in the bio."),
]),

dict(slug="78_app_progression", dark=D, label="the app", slides=[
  dict(kind="cover", eyebrow="feature", head="It sets your next target from your own numbers"),
  dict(kind="phone", layout="bleed", eyebrow="week 3", head="Built on what you actually lifted",
       view="train", data=dict(subtitle="Strength · Week 3", hero="MONDAY · LOWER STRENGTH",
       focus="Lower strength",
       rows=[("Back squat","4x5","87.5kg","3 min"),
             ("Romanian deadlift","3x8","75kg","2 min"),
             ("Bulgarian split squat","3x10","22.5kg DB","90 sec"),
             ("Standing calf raise","3x12","45kg","60 sec")])),
  dict(kind="statement", head="Not a percentage of a number you guessed on day one."),
  dict(kind="cta", head="Progressive overload, actually applied", sub="Free sample previews in the bio."),
]),

dict(slug="79_app_no_login", dark=D, label="the app", slides=[
  dict(kind="cover", eyebrow="feature", head="No app store. No login. No password to forget."),
  dict(kind="phone", layout="bleed", eyebrow="your plan", head="A link, and it is yours",
       view="today", data=dict(subtitle="Your plan · Week 1", hero="TODAY · WED", done="0/5 done")),
  dict(kind="list", eyebrow="what that means", head="Three fewer things to go wrong", items=[
       "Nothing to download",
       "Nothing to sign into every time",
       "Save it to your home screen and it opens like any app"]),
  dict(kind="statement", head="Lost the link? One page, your email, and we send it back."),
  dict(kind="cta", head="It just opens", sub="Free sample previews in the bio."),
]),

dict(slug="80_app_cycles", dark=D, label="the app", slides=[
  dict(kind="cover", eyebrow="feature", head="Run the block twice and it keeps both"),
  dict(kind="phone", layout="bleed", eyebrow="cycle 2", head="Cycle two, week one",
       view="train", data=dict(subtitle="Strength · Cycle 2 · Week 1", hero="MONDAY · LOWER STRENGTH",
       focus="Lower strength",
       rows=[("Back squat","4x5","90kg","3 min"),
             ("Romanian deadlift","3x8","77.5kg","2 min"),
             ("Bulgarian split squat","3x10","24kg DB","90 sec"),
             ("Standing calf raise","3x12","47.5kg","60 sec")])),
  dict(kind="statement", head="Your cycle one numbers are still there. Cycle two starts above them."),
  dict(kind="statement", head="This took me an embarrassingly long time to get right.",
       sub="The first version quietly overwrote your old logs. It does not now."),
  dict(kind="cta", head="Finish it, then run it again", sub="Free, either way."),
]),

dict(slug="81_app_holds", dark=D, label="the app", slides=[
  dict(kind="cover", eyebrow="feature", head="It times the hold, not just the rest"),
  dict(kind="phone", layout="bleed", eyebrow="train", head="Prescribed in seconds",
       view="train", data=dict(subtitle="Calisthenics · Week 2", hero="TUESDAY · SKILLS",
       focus="Skill work",
       rows=[("Tuck front lever hold","4x12s","bodyweight","2 min"),
             ("Ring support hold","3x20s","bodyweight","90 sec"),
             ("Hollow body hold","3x30s","bodyweight","60 sec"),
             ("Scapular pull-up","3x8","bodyweight","60 sec")],
       reason_on=0,
       reason="Twelve seconds, not 'as long as possible'. Holding to failure trains failure. Holding to a target trains the position.")),
  dict(kind="statement", head="Static work needs a number to beat, same as anything else."),
  dict(kind="cta", head="Skills, properly programmed", sub="Free sample previews in the bio."),
]),

dict(slug="82_app_swap", dark=D, label="the app", slides=[
  dict(kind="cover", eyebrow="feature", head="Rack taken? Now you can swap it sensibly."),
  dict(kind="phone", layout="offset", eyebrow="tap the icon", head="Know what it is for and you know what replaces it",
       view="train", data=dict(subtitle="Strength · Week 2", hero="MONDAY · LOWER STRENGTH",
       focus="Lower strength", rows=LOWER, reason_on=1,
       reason="Loading the hamstring at length is the point here. Anything that does that under control will do: a good morning, a single-leg version, or a machine curl if the bar is gone.")),
  dict(kind="statement", head="A plan that explains itself survives contact with a busy gym."),
  dict(kind="cta", head="Every exercise carries its reasoning", sub="Free sample previews in the bio."),
]),

dict(slug="83_app_week_view", dark=D, label="the app", slides=[
  dict(kind="cover", eyebrow="feature", head="Four weeks, and you can see all of them"),
  dict(kind="phone", layout="bleed", eyebrow="today", head="Week two of four",
       view="today", data=dict(subtitle="Football · Week 2 of 4", hero="TODAY · MON", done="0/4 done")),
  dict(kind="statement", head="Look ahead if you want to. Most people do not, and that is fine."),
  dict(kind="statement", head="Week four backs off on purpose. That is where the adaptation lands."),
  dict(kind="cta", head="A block, not a list", sub="Free sample previews in the bio."),
]),

dict(slug="84_app_coach_branded", dark=L, label="for coaches", slides=[
  dict(kind="cover", eyebrow="for coaches", head="It goes out looking like yours, not ours"),
  dict(kind="phone", layout="bleed", eyebrow="your client's view", head="Your programme, your name",
       view="train", data=dict(subtitle="Sarah · Block 1 · Week 2", hero="TUESDAY · UPPER",
       focus="Upper body", rows=UPPER, reason_on=0,
       reason="Your note here. Whatever you would have told her in the gym, attached to the exercise so she reads it at the point she needs it.")),
  dict(kind="statement", head="You wrote it. You reviewed it. You changed what you disagreed with."),
  dict(kind="cta", head="Coaches, DM me for a look", sub="Five minutes, no pitch."),
]),
]
