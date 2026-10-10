#!/usr/bin/env python3
"""
Builds the reels-first schedule from 17 Oct 2026: the SocialPilot CSV, a 3-row test CSV, and an upload
folder laid out exactly like R2 (drag social/upload/posts into the bucket root).

Format matches the known-good socialpilot-MM files byte for byte: UTF-8 BOM, CRLF, six columns,
zero-padded "Oct 17, 2026 19:00" dates, media semicolon-space separated, no newlines in captions.
Instagram at the slot time, Facebook +30 min, TikTok +90 min with hashtags in the caption.

    python3 social/build_schedule.py
"""
import csv, os, re, subprocess, glob
from datetime import datetime, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
R2 = "https://pub-3ad74abe28dc4a4e90f5065bb7df55a6.r2.dev"
IG, FB, TT = "2642874", "2642875", "2642876"
REELS = os.path.expanduser("~/Clips/output/2026-10-10-planlete-plan-reels")
OLD_REEL = os.path.expanduser("~/Clips/output/2026-10-08-planlete-sprint/planlete-sprint-the-plan-said-v2.mp4")
UPLOAD = os.path.join(HERE, "upload")
FF = "/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg"

UK = "#trainingplan #fitnessuk #gymuk #strengthtraining #workoutplan"
TAGS = {
    "speed": "#speedtraining #sprinttraining #athletics #trackandfield #acceleration #ukathletics #athletedevelopment #strengthandconditioning #trainingplan #plyometrics",
    "speed_us": "#speedtraining #sprinttraining #trackandfield #sprinter #speedandagility #athletetraining #strengthandconditioning #trainingplan",
    "football": "#footballtraining #soccertraining #agilitytraining #speedtraining #footballfitness #grassrootsfootball #footballdrills #trainingplan #ukfootball #changeofdirection",
    "hyrox_us": "#hyrox #hyroxtraining #sledpush #hybridathlete #hybridtraining #functionalfitness #trainingplan #racetraining",
    "app": "#trainingplan #workoutplan #gymapp #fitnessapp #personalisedtraining #gymuk #fitnessuk #strengthtraining #musclebuilding #nosubscription",
    "running_us": "#running #5k #10k #runningtraining #runnersofinstagram #strengthforrunners #trainingplan #runningplan",
    "journey": "#trainingjourney #athletedevelopment #speedtraining #footballtraining #sprinttraining #youthsport #trainingplan #consistency #ukathletics #grassrootsfootball",
    "photo": "#gymmotivation #trainingplan #gymuk #fitnessuk #strengthtraining #consistency #workoutplan #progressiveoverload #deload #fitnesstips",
}

# kind, slug, caption, tag set. Video files come from REELS/<slug>.mp4 (or OLD_REEL).
POSTS = {
    "planlete-athlete-tuesday": ("Tuesday on the athlete plan. A-skips, high knees, 10m sprints, depth jumps, broad jumps. Every one of them is in the session, and every one comes with a reason it's there. Build yours at planlete.co.uk. One payment, no subscription.", "speed"),
    "planlete-how-it-works": ("How it works. Answer a few questions, get four weeks built around you, open it on your phone and train. No PDF, no subscription. planlete.co.uk", "app"),
    "planlete-hyrox-monday": ("HYROX plan, Monday. Sled day. Low shin angle, short choppy steps, legs not arms. It's all written in the plan, right next to the sets. Build yours around your race at planlete.co.uk", "hyrox_us"),
    "planlete-sprint-monday": ("Monday is acceleration day. Starts first while you're fresh, then 30m sprints with full recovery. The plan tells you why it's first, how to do it and what to watch for. planlete.co.uk", "speed"),
    "planlete-football-tuesday": ("Football plan, Tuesday. Brake, cut, sprint, repeat. Deceleration work and repeated 30m sprints, because a match is stop-start, not steady. Your plan, built around your fixtures. planlete.co.uk", "football"),
    "planlete-inside-the-app": ("Inside the app. Today, Train, Morning, Fuel and Recover, all in one place on your phone. Built for you, yours to keep. planlete.co.uk", "app"),
    "planlete-sprint-wednesday": ("Wednesday is top speed. Wall drills, then flying sprints: build up, hit the zone, relax into it. The plan even tells you what to watch for. planlete.co.uk", "speed_us"),
    "planlete-2026-so-far": ("2026 so far. Gym in January, indoor track in February, pitch all summer, track again in October. Nine months and still going. Every session planned at planlete.co.uk", "journey"),
    "planlete-muscle-week": ("A muscle building week, start to finish. Every session, every set, every rest period, and why each exercise is there. planlete.co.uk", "app"),
    "planlete-run-week": ("A 5k and 10k week, planned. Easy runs, intervals, a long run, and the strength work that keeps you running. planlete.co.uk", "running_us"),
    "planlete-sprint-the-plan-said-v2": ("Monday said acceleration. 6 x 15m, full recovery between every rep. The plan tells you what, and it tells you why. Free sprint sample plan at planlete.co.uk, no card, no sign up.", "speed"),
    "planlete-why-i-built-it": ("Why I built Planlete. Pen and paper round the gym, a different sheet for every workout, print-outs, screenshots on my phone, and progressive overload that was impossible to track. So I built an app, custom made for me, with exercises I didn't know would help. Now it's yours too. planlete.co.uk", "app"),
    "p01_follow_the_plan": ("The plan you follow beats the perfect plan you don't. Four weeks, built around your week, your gym and your body. planlete.co.uk", "photo"),
    "p02_week_four": ("Week four is lighter on purpose. That's where the work from weeks one to three turns into progress. Every Planlete block has a deload built in. planlete.co.uk", "photo"),
    "p03_rest_is_training": ("Rest is part of the programme. Sleep, recovery days and rest periods are planned, not left to chance. planlete.co.uk", "photo"),
    "planlete-football-friday": ("Football plan, Friday. Pre-match sharpening: close control, small touches, head up, then quick passing. Low cost, high touch, ready for Saturday. planlete.co.uk", "football"),
    "planlete-same-app-any-sport": ("Same app, any sport. Football, sprint, athlete, HYROX, muscle building, 5k and 10k. Every week built around your sport and your schedule. planlete.co.uk", "app"),
    "planlete-sprint-with-a-mate": ("Sprint plan, Monday. Acceleration day. Stay low out of the start, then race it. Better with a mate. planlete.co.uk", "speed"),
    "planlete-every-exercise-explained": ("Every exercise explained. Why it's in, how to do it, what to watch for, plus an easier and a harder option. Depth jumps to dribble weaves, it's all in the plan. planlete.co.uk", "app"),
    "planlete-football-club-night": ("Got club tonight? Your Planlete football plan knows. Thursday is club training, so nothing gets added on top. Your sessions fit round your club, not the other way round. planlete.co.uk", "football"),
    "planlete-same-drill-eight-months": ("Same work. February, August, October. Eight months of starts and sprints, still going. Every session planned. planlete.co.uk", "speed_us"),
    "planlete-gym-night": ("Gym night. Sled first, then the rest. Gym, pitch or track, four weeks built around you. One payment, no subscription. planlete.co.uk", "photo"),
    "planlete-same-cross-every-time": ("Same cross. Every time. Reps build players. Plans built around your sport at planlete.co.uk", "football"),
    "p04_need_a_plan": ("You don't need more motivation. You need a plan. Four weeks, built around your week, your gym and your body. planlete.co.uk", "photo"),
    "p05_next_four": ("Four weeks. Then the next four. Each block builds on what you logged in the last one. planlete.co.uk", "photo"),
    "planlete-muscle-monday": ("Muscle building plan, Monday. Push day: bench press first, then pressing and shoulders. Every exercise has a reason, and the plan tells you what it is. planlete.co.uk", "app"),
    "planlete-muscle-tuesday": ("Muscle building plan, Tuesday. Leg day: leg press, jump lunges, then accessories. Four weeks of it, built around your gym. planlete.co.uk", "app"),
    "planlete-muscle-wednesday": ("Muscle building plan, Wednesday. Pull day. Rows, slow on the way down, then back work. The plan explains why the lowering matters. planlete.co.uk", "app"),
    "planlete-muscle-friday": ("Muscle building plan, Friday. Hinge day: Romanian deadlifts, then explosive split squat jumps. planlete.co.uk", "app"),
    "planlete-muscle-saturday": ("Muscle building plan, Saturday. Arms and delts: overhead press for the shoulders, then arms to finish. planlete.co.uk", "app"),
    "planlete-every-exercise-explained-muscle": ("Every exercise explained, muscle building edition. Bench press, leg press, rows, split squats, overhead triceps: why each one is in your plan and how to do it. planlete.co.uk", "app"),
    "planlete-gym-jan-to-mar": ("January to March in the gym. Every session planned, every set logged. planlete.co.uk", "app"),
    "planlete-indoor-speed": ("Dark nights, still training. Speed work moves indoors, the plan moves with it. planlete.co.uk", "speed"),
    "planlete-track-day": ("Track day at Loughborough. Every rep planned. planlete.co.uk", "speed"),
    "planlete-new-year-new-plan": ("New year, new plan. Two minutes of questions, four weeks built around you, on your phone. One payment, no subscription. planlete.co.uk", "app"),
    "planlete-new-year-fuel": ("Train for it, eat for it. Your plan's Fuel tab puts meals and macros right next to the training they're fuelling. planlete.co.uk", "app"),
    "p07_christmas": ("Christmas week. Train if you want, rest if you need. The plan picks up when you do. planlete.co.uk", "photo"),
    "p08_next_block": ("January isn't a reset. It's the next block. Build yours from what you've already done at planlete.co.uk", "photo"),
    "p06_season": ("Train for the season you're in. Off-season, pre-season or in-season, your plan changes with it. planlete.co.uk", "photo"),
}

RERUNS = {
    "planlete-how-it-works~rerun": "January plan? Here's how it works. Answer a few questions, get four weeks built around you, open it and train. planlete.co.uk",
    "planlete-athlete-tuesday~rerun": "The plan said react. A-skips, high knees, sprints, depth jumps and broad jumps, every one with a reason. planlete.co.uk",
    "planlete-why-i-built-it~rerun": "Why Planlete exists: pen and paper, print-outs and screenshots weren't cutting it. So I built an app. Now it's yours too. planlete.co.uk",
    "planlete-hyrox-monday~rerun": "HYROX season is coming. Sled day: low shin angle, short steps, legs not arms. Build your race plan at planlete.co.uk",
    "planlete-inside-the-app~rerun": "Everything in one place: Today, Train, Morning, Fuel and Recover. Your plan, on your phone. planlete.co.uk",
    "planlete-same-app-any-sport~rerun": "Football, sprint, athlete, HYROX, muscle, running. Same app, any sport, built around you. planlete.co.uk",
    "planlete-football-tuesday~rerun": "Second half of the season. Brake hard, cut, sprint, repeat. Football plans built round your fixtures at planlete.co.uk",
    "planlete-sprint-wednesday~rerun": "Top speed Wednesday. Wall drills, then flying sprints: build up and relax into it. planlete.co.uk",
    "planlete-football-friday~rerun": "Friday before a match: close control and quick passing, nothing heavy. planlete.co.uk",
}
TAG_FOR = {"planlete-how-it-works": "app", "planlete-athlete-tuesday": "speed", "planlete-why-i-built-it": "app", "planlete-hyrox-monday": "hyrox_us",
           "planlete-inside-the-app": "app", "planlete-same-app-any-sport": "app", "planlete-football-tuesday": "football",
           "planlete-sprint-wednesday": "speed_us", "planlete-football-friday": "football"}
for k, v in RERUNS.items():
    POSTS[k] = (v, TAG_FOR[k.split("~")[0]])

# file -> [(date, slug)]. Sat 19:00, Sun 19:00, Mon 20:00, Wed 14:00 (US slot), Fri 19:30.
SCHEDULES = {
    "socialpilot-reels-17oct-13nov-2026.csv": [
        ("2026-10-17", "planlete-athlete-tuesday"), ("2026-10-18", "38_cardio_myth"), ("2026-10-19", "planlete-how-it-works"),
        ("2026-10-21", "planlete-hyrox-monday"), ("2026-10-23", "planlete-sprint-monday"),
        ("2026-10-24", "planlete-football-tuesday"), ("2026-10-25", "planlete-why-i-built-it"), ("2026-10-26", "planlete-inside-the-app"),
        ("2026-10-28", "planlete-sprint-wednesday"), ("2026-10-30", "37_rest_times"),
        ("2026-10-31", "planlete-2026-so-far"), ("2026-11-01", "46_women_lifting"), ("2026-11-02", "planlete-muscle-week"),
        ("2026-11-04", "planlete-run-week"), ("2026-11-06", "p02_week_four"),
        ("2026-11-07", "planlete-sprint-the-plan-said-v2"), ("2026-11-08", "48_consistency"), ("2026-11-09", "102_deload_week"),
        ("2026-11-11", "45_over_40"), ("2026-11-13", "p03_rest_is_training"),
    ],
    "socialpilot-reels-14nov-11dec-2026.csv": [
        ("2026-11-14", "planlete-football-friday"), ("2026-11-15", "39_soreness"), ("2026-11-16", "p04_need_a_plan"),
        ("2026-11-18", "planlete-same-app-any-sport"), ("2026-11-20", "40_warm_ups"),
        ("2026-11-21", "planlete-sprint-with-a-mate"), ("2026-11-22", "43_beginner_mistakes"), ("2026-11-23", "44_plateau"),
        ("2026-11-25", "planlete-every-exercise-explained"), ("2026-11-27", "p05_next_four"),
        ("2026-11-28", "planlete-football-club-night"), ("2026-11-29", "47_run_and_lift"), ("2026-11-30", "49_machines_vs_free"),
        ("2026-12-02", "planlete-same-drill-eight-months"), ("2026-12-04", "51_more_isnt_better"),
        ("2026-12-05", "planlete-gym-night"), ("2026-12-06", "41_sleep"), ("2026-12-07", "p06_season"),
        ("2026-12-09", "planlete-same-cross-every-time"), ("2026-12-11", "101_week_one_vs_three"),
    ],
    "socialpilot-reels-12dec-08jan-2027.csv": [
        ("2026-12-12", "planlete-muscle-monday"), ("2026-12-13", "98_tab_fuel"), ("2026-12-14", "97_tab_morning"),
        ("2026-12-16", "planlete-indoor-speed"), ("2026-12-18", "100_app_timer_running"),
        ("2026-12-19", "planlete-muscle-tuesday"), ("2026-12-20", "58_travel_plans"), ("2026-12-21", "107_hotel_fuel"),
        ("2026-12-23", "planlete-every-exercise-explained-muscle"), ("2026-12-25", "p07_christmas"),
        ("2026-12-26", "planlete-gym-jan-to-mar"), ("2026-12-27", "54_supplements"), ("2026-12-28", "planlete-how-it-works~rerun"),
        ("2026-12-30", "planlete-new-year-new-plan"), ("2027-01-01", "p08_next_block"),
        ("2027-01-02", "planlete-muscle-wednesday"), ("2027-01-03", "108_whole_block"), ("2027-01-04", "planlete-new-year-fuel"),
        ("2027-01-06", "planlete-athlete-tuesday~rerun"), ("2027-01-08", "96_sess_three_day"),
    ],
    "socialpilot-reels-09jan-31jan-2027.csv": [
        ("2027-01-09", "planlete-muscle-friday"), ("2027-01-10", "42_training_age"), ("2027-01-11", "planlete-why-i-built-it~rerun"),
        ("2027-01-13", "planlete-hyrox-monday~rerun"), ("2027-01-15", "p01_follow_the_plan"),
        ("2027-01-16", "planlete-muscle-saturday"), ("2027-01-17", "53_genetics"), ("2027-01-18", "planlete-inside-the-app~rerun"),
        ("2027-01-20", "planlete-same-app-any-sport~rerun"), ("2027-01-22", "103_upper_vs_lower"),
        ("2027-01-23", "planlete-track-day"), ("2027-01-24", "50_fasted_training"), ("2027-01-25", "planlete-football-tuesday~rerun"),
        ("2027-01-27", "planlete-sprint-wednesday~rerun"), ("2027-01-29", "52_perfect_form"),
        ("2027-01-30", "planlete-football-friday~rerun"), ("2027-01-31", "56_rebuild_feature"),
    ],
}
TIMES = {"Sat": "19:00", "Sun": "19:00", "Mon": "20:00", "Wed": "14:00", "Fri": "19:30"}


def old_carousel_rows():
    rows = {}
    for f in sorted(glob.glob(os.path.join(HERE, "schedules", "socialpilot-*.csv"))):
        for r in csv.reader(open(f, encoding="utf-8-sig", newline="")):
            m = re.search(r"posts/(?:ig|tt)/([^/]+)/", r[1])
            if m: rows.setdefault(m.group(1), {})[r[3]] = r
    return rows


def export_video(slug):
    src = OLD_REEL if slug.endswith("-v2") else os.path.join(REELS, slug + ".mp4")
    dst = os.path.join(UPLOAD, "posts", "reels", slug, slug + ".mp4")
    if not os.path.exists(dst):
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        subprocess.run([FF, "-v", "error", "-y", "-i", src, "-c:v", "libx264", "-preset", "slow", "-crf", "21",
                        "-maxrate", "10M", "-bufsize", "20M", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", dst], check=True)
    return f"{R2}/posts/reels/{slug}/{slug}.mp4"


def export_photo(slug):
    out = {}
    for suffix in ("", "_tt"):
        src = os.path.join(HERE, "out", "photo", slug, f"{slug}{suffix}.jpg")
        dst = os.path.join(UPLOAD, "posts", "photo", slug, f"{slug}{suffix}.jpg")
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        subprocess.run(["cp", "-c", src, dst], check=True)
        out[suffix] = f"{R2}/posts/photo/{slug}/{slug}{suffix}.jpg"
    return out


def one_line(s):
    return re.sub(r"\s+", " ", s).strip()


def build_rows(schedule, old):
    rows = []
    for date, slug in schedule:
        d = datetime.strptime(date, "%Y-%m-%d")
        at = datetime.strptime(f"{date} {TIMES[d.strftime('%a')]}", "%Y-%m-%d %H:%M")
        stamp = lambda t: t.strftime("%b %d, %Y %H:%M")
        if slug in old:  # existing carousel: reuse the known-good rows, new dates
            for acc, delta in ((IG, 0), (FB, 30), (TT, 90)):
                r = list(old[slug][acc]); r[2] = stamp(at + timedelta(minutes=delta)); rows.append(r)
            continue
        caption, tagset = POSTS[slug]
        caption, tags = one_line(caption), TAGS[tagset]
        assert "—" not in caption, slug
        if slug.startswith("p0"):
            u = export_photo(slug)
            media = {IG: u[""], FB: u[""], TT: u["_tt"]}
        else:
            v = export_video(slug.split("~")[0])
            media = {IG: v, FB: v, TT: v}
        rows.append([caption, media[IG], stamp(at), IG, tags, ""])
        rows.append([caption, media[FB], stamp(at + timedelta(minutes=30)), FB, tags, ""])
        rows.append([caption + " " + tags, media[TT], stamp(at + timedelta(minutes=90)), TT, "", ""])
    return rows


def main():
    old = old_carousel_rows()

    def write(path, rs):
        # SocialPilot silently mis-schedules "Nov 3": every date must be "Nov 03, 2026 19:00".
        for r in rs:
            assert re.fullmatch(r"[A-Z][a-z]{2} \d{2}, \d{4} \d{2}:\d{2}", r[2]), f"bad date {r[2]!r} in {path}"
            assert len(r) == 6 and "\n" not in r[0], f"bad row in {path}"
        with open(path, "w", encoding="utf-8-sig", newline="") as fh:
            csv.writer(fh, lineterminator="\r\n").writerows(rs)

    first = None
    for name, schedule in SCHEDULES.items():
        rows = build_rows(schedule, old)
        write(os.path.join(HERE, "schedules", name), rows)
        print(f"{len(rows)} rows -> {name}")
        first = first or rows
    rows = first
    # Test file: one video post on all three accounts, two days out so nothing goes live by surprise.
    test_rows = [list(r) for r in rows[:3]]
    for r, delta in zip(test_rows, (0, 30, 90)):
        r[2] = (datetime(2026, 10, 12, 21, 0) + timedelta(minutes=delta)).strftime("%b %d, %Y %H:%M")
    write(os.path.join(HERE, "schedules", "socialpilot-TEST-3-rows.csv"), test_rows)


if __name__ == "__main__":
    main()
