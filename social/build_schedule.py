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
    "p01_follow_the_plan": ("The plan you follow beats the perfect plan you don't. Four weeks, built around your week, your gym and your body. planlete.co.uk", "photo"),
    "p02_week_four": ("Week four is lighter on purpose. That's where the work from weeks one to three turns into progress. Every Planlete block has a deload built in. planlete.co.uk", "photo"),
    "p03_rest_is_training": ("Rest is part of the programme. Sleep, recovery days and rest periods are planned, not left to chance. planlete.co.uk", "photo"),
}

# date, slug. Sat 19:00, Sun 19:00, Mon 20:00, Wed 14:00 (US slot), Fri 19:30.
SCHEDULE = [
    ("2026-10-17", "planlete-athlete-tuesday"), ("2026-10-18", "38_cardio_myth"), ("2026-10-19", "planlete-how-it-works"),
    ("2026-10-21", "planlete-hyrox-monday"), ("2026-10-23", "planlete-sprint-monday"),
    ("2026-10-24", "planlete-football-tuesday"), ("2026-10-25", "p01_follow_the_plan"), ("2026-10-26", "planlete-inside-the-app"),
    ("2026-10-28", "planlete-sprint-wednesday"), ("2026-10-30", "37_rest_times"),
    ("2026-10-31", "planlete-2026-so-far"), ("2026-11-01", "46_women_lifting"), ("2026-11-02", "planlete-muscle-week"),
    ("2026-11-04", "planlete-run-week"), ("2026-11-06", "p02_week_four"),
    ("2026-11-07", "planlete-sprint-the-plan-said-v2"), ("2026-11-08", "48_consistency"), ("2026-11-09", "102_deload_week"),
    ("2026-11-11", "45_over_40"), ("2026-11-13", "p03_rest_is_training"),
]
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


def main():
    old = old_carousel_rows()
    rows = []
    for date, slug in SCHEDULE:
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

    def write(path, rs):
        with open(path, "w", encoding="utf-8-sig", newline="") as fh:
            csv.writer(fh, lineterminator="\r\n").writerows(rs)

    out = os.path.join(HERE, "schedules", "socialpilot-reels-17oct-13nov-2026.csv")
    write(out, rows)
    # Test file: one video post on all three accounts, two days out so nothing goes live by surprise.
    test_rows = [list(r) for r in rows[:3]]
    for r, delta in zip(test_rows, (0, 30, 90)):
        r[2] = (datetime(2026, 10, 12, 21, 0) + timedelta(minutes=delta)).strftime("%b %d, %Y %H:%M")
    write(os.path.join(HERE, "schedules", "socialpilot-TEST-3-rows.csv"), test_rows)
    print(f"{len(rows)} rows -> {out}")


if __name__ == "__main__":
    main()
