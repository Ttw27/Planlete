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
    "p06_season": ("Train for the season you're in. Off-season, pre-season or in-season, your plan changes with it. planlete.co.uk", "photo"),
}

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
            v = export_video(slug)
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
