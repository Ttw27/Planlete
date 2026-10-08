D, L = True, False   # dark = B2C, light/chalk = B2B

CAROUSELS = [

# ---------------------------------------------------------------- 1
dict(slug="01_subscription_maths", dark=D, label="pricing", slides=[
  dict(kind="cover", eyebrow="do the maths",
       head="£9.99 a month. For a plan it wrote once.",
       sub="Go and check what your fitness app is actually costing you."),
  dict(kind="stat", eyebrow="that is", num="£120",
       sub="a year, for something generated one time, in four seconds."),
  dict(kind="statement", head="Cancel, and you lose the plan you already paid for. Twelve times over."),
  dict(kind="list", eyebrow="planlete", head="One payment. You get:", items=[
       "A full four-week block, periodised",
       "Progressive overload built into the structure",
       "Every exercise explains why it is there",
       "Weight and rep logging on your phone",
       "The plan, permanently. Screenshot it, print it, keep it"]),
  dict(kind="statement", head="No renewal button. Because there is nothing to renew."),
  dict(kind="cta", head="Read a full plan before you spend anything",
       sub="Three free sample plans. No card, no email wall."),
]),

# ---------------------------------------------------------------- 2
dict(slug="02_why_this_exercise", dark=D, label="programming", slides=[
  dict(kind="cover", eyebrow="ask your app",
       head="Your plan told you to do Bulgarian split squats. Did it say why?"),
  dict(kind="statement", head="If you do not know why it is in there, you cannot tell whether it is working."),
  dict(kind="list", eyebrow="four exercises", head="What they are actually for", items=[
       "Romanian deadlift: loading the hamstring at length",
       "Split squat: exposing the side hiding behind the strong one",
       "Face pull: the tax on nine hours at a desk",
       "Loaded carry: trunk stiffness you can actually use"]),
  dict(kind="statement", head="You also cannot swap it sensibly when the rack is busy."),
  dict(kind="statement", head="Every exercise in a Planlete plan carries its own reasoning. Tap it, and it tells you.",
       sub="Doing the work is easier when you understand the work."),
  dict(kind="cta", head="See it on a real plan",
       sub="Free samples: football, sprints, longevity."),
]),

# ---------------------------------------------------------------- 3
dict(slug="03_coach_hours", dark=L, label="for coaches", slides=[
  dict(kind="cover", eyebrow="for coaches",
       head="How long does one four-week block take you to write?",
       sub="Be honest. Nobody is marking this."),
  dict(kind="statement", head="Ninety minutes. Then the client messages about a shoulder, and can now only train three days."),
  dict(kind="statement", head="You did not get into coaching to sit in a spreadsheet at eleven at night."),
  dict(kind="list", eyebrow="how it works", head="Planlete does the first draft", items=[
       "You enter the client's details, injuries and schedule",
       "It builds the four-week block, periodised",
       "You review it and change whatever you want",
       "It goes out under your name"]),
  dict(kind="statement", head="You stay the coach. It just stops being admin."),
  dict(kind="cta", head="Coaches, DM me for a walkthrough",
       sub="It is a one-person company, so it will be me on the other end."),
]),

# ---------------------------------------------------------------- 4
dict(slug="04_four_weeks", dark=D, label="education", slides=[
  dict(kind="cover", eyebrow="unpopular opinion",
       head="The twelve-week programme is a marketing format, not a training format."),
  dict(kind="statement", head="Nobody's life stays the same for twelve weeks."),
  dict(kind="list", eyebrow="what actually happens", head="Somewhere around week five", items=[
       "You get ill",
       "Work goes sideways",
       "You go away for a fortnight",
       "Your shoulder starts complaining"]),
  dict(kind="statement", head="A twelve-week plan written on day one is a guess about week eleven."),
  dict(kind="statement", head="Four weeks is long enough to progress. Short enough to still fit your life at the end of it.",
       sub="Then you reassess and build the next block on where you actually got to."),
  dict(kind="cta", head="Four weeks, built around your actual week",
       sub="Free sample plans in the bio."),
]),

# ---------------------------------------------------------------- 5
dict(slug="05_coach_unbilled", dark=L, label="for coaches", slides=[
  dict(kind="cover", eyebrow="the hidden cost",
       head="What an evening of programming actually costs you"),
  dict(kind="stat", eyebrow="per client block", num="90", sub="minutes, if nothing goes wrong."),
  dict(kind="stat", eyebrow="twelve clients", num="18hrs", sub="a month. Unbilled, every month."),
  dict(kind="statement", head="That is eighteen hours you were not selling, not resting, and not at home."),
  dict(kind="list", eyebrow="the swap", head="First draft in three minutes", items=[
       "You still review every single block",
       "You still change whatever you disagree with",
       "Your judgement is still on it",
       "You just did not build the scaffolding by hand"]),
  dict(kind="cta", head="Work out your own number this month",
       sub="It is usually worse than you think. DM me if you want a look."),
]),

# ---------------------------------------------------------------- 6
dict(slug="06_overload_levers", dark=D, label="education", slides=[
  dict(kind="cover", eyebrow="programming",
       head="Progressive overload is not just adding weight every week"),
  dict(kind="statement", head="Adding 2.5kg a week works for about six weeks. Then it stops."),
  dict(kind="list", eyebrow="six levers", head="You can also progress by", items=[
       "Load: the obvious one",
       "Reps at the same load",
       "Sets, adding volume",
       "Tempo, slowing the lowering",
       "Range, taking the movement further",
       "Proximity to failure"]),
  dict(kind="statement", head="Most plans only ever touch the first one."),
  dict(kind="statement", head="A block should know which lever to pull, and when.",
       sub="That is the difference between periodisation and a spreadsheet that adds numbers."),
  dict(kind="cta", head="See how a real block progresses",
       sub="Free sample plans, week one to week four."),
]),

# ---------------------------------------------------------------- 7
dict(slug="07_week_three", dark=L, label="for coaches", slides=[
  dict(kind="cover", eyebrow="retention",
       head="The reason clients go quiet is not the programme. It is week three."),
  dict(kind="list", eyebrow="the pattern", head="Every coach knows this arc", items=[
       "Week one: buzzing, messages you daily",
       "Week two: fine, still turning up",
       "Week three: novelty gone, no visible progress",
       "Week four: stops opening the PDF"]),
  dict(kind="statement", head="Adherence is a design problem, not a motivation problem."),
  dict(kind="list", eyebrow="two fixes", head="What actually holds them", items=[
       "They can see the plan progressing: logged weights, week three heavier than week one",
       "They know why each exercise is in there"]),
  dict(kind="statement", head="Planlete plans do both by default."),
  dict(kind="cta", head="What is your week-three trick?",
       sub="Genuinely asking. Comments open."),
]),

# ---------------------------------------------------------------- 8
dict(slug="08_physio_pdf", dark=L, label="for physios", slides=[
  dict(kind="cover", eyebrow="for physios",
       head="Your rehab plan lives in a PDF the patient opened once. In the car park."),
  dict(kind="statement", head="Paper loses. You already know this."),
  dict(kind="list", eyebrow="instead", head="Same programme, on their phone", items=[
       "Reasoning attached to every exercise",
       "They log what they actually did",
       "You can see adherence before they walk in",
       "It goes out under your name"]),
  dict(kind="statement", head="You build it. You approve it. Clinical judgement stays entirely with you.",
       sub="This is structure around your advice, never a substitute for assessment."),
  dict(kind="cta", head="Physios, DM me for a look",
       sub="Happy to walk you through it properly."),
]),

# ---------------------------------------------------------------- 9
dict(slug="09_no_cancel_page", dark=D, label="pricing", slides=[
  dict(kind="cover", eyebrow="shortest post we will make",
       head="Let me show you our cancellation page."),
  dict(kind="statement", head="There isn't one."),
  dict(kind="statement", head="You bought a plan. It is yours. That is the end of the transaction."),
  dict(kind="statement", head="Turns out you can just do that.",
       sub="Every investor's least favourite pricing model."),
  dict(kind="cta", head="Pay once. Keep the plan.",
       sub="Come back for the next block only if you want to."),
]),

# ---------------------------------------------------------------- 10
dict(slug="10_founder", dark=L, label="build in public", slides=[
  dict(kind="cover", eyebrow="build in public",
       head="Things I got wrong building a training app"),
  dict(kind="list", eyebrow="one", head="Twelve-week plans", items=[
       "The output got worse the longer the plan ran",
       "Cut back to four weeks. Better every time."]),
  dict(kind="list", eyebrow="two", head="A subscription", items=[
       "Built it first because everyone said to",
       "Hated it. Ripped the whole thing out."]),
  dict(kind="list", eyebrow="three", head="Repeat blocks", items=[
       "Forgot people run the same block twice",
       "Cycle two quietly overwrote cycle one's logged weights",
       "Took me an embarrassingly long time to spot"]),
  dict(kind="statement", head="Solo founder. No team. Everything here I built, broke, and rebuilt."),
  dict(kind="cta", head="Following along is free",
       sub="More mistakes to come, presumably."),
]),
]
