#!/usr/bin/env python3
"""
Single-image photo posts: a gym photo with one line in the carousel house style.
Writes social/out/photo/<slug>/<slug>.jpg (1080x1350, IG/FB) and <slug>_tt.jpg (1080x1920, TikTok).

    python3 social/photo_posts.py
"""
import os, sys
from PIL import Image, ImageDraw, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "renderer"))
from render import BRAND, font, tracked, wrap_tracked, DISP, MONOB, TRACK_DISPLAY, TRACK_OVERLINE, LH_DISPLAY

STOCK = os.path.join(HERE, "stock", "unsplash")
OUT = os.path.join(HERE, "out", "photo")
W, H, M = 1080, 1350, 84

POSTS = [
    # slug, stock file prefix, overline, headline
    ("p01_follow_the_plan", "01_", "the honest truth", "The plan you follow beats the perfect plan you don't."),
    ("p02_week_four", "13_", "deload week", "Week four is lighter on purpose."),
    ("p03_rest_is_training", "04_", "recovery", "Rest is part of the programme."),
    ("p04_need_a_plan", "26_", "be honest", "You don't need more motivation. You need a plan."),
    ("p05_next_four", "25_", "how it works", "Four weeks. Then the next four."),
    ("p06_season", "33_", "in season or off", "Train for the season you're in."),
    ("p07_christmas", "21_", "christmas week", "Train if you want. Rest if you need."),
    ("p08_next_block", "23_", "january", "Not a reset. The next block."),
    # Tim's own photos (~/Clips/planlete/photos). Lines, not exercise names. Optional 5th item: crop centre (x, y).
    ("p09_show_up", "~IMG_1968.jpeg", "consistency", "Show up. Log it. Repeat.", (0.5, 0.4)),
    ("p10_built_for_me", "~IMG_2216.jpeg", "why planlete", "Built for me first. Now it's yours.", (0.45, 0.5)),
    ("p11_strong_for_everyone", "~IMG_2612.jpeg", "for everyone", "Strong is for everyone.", (0.4, 0.5)),
    ("p12_every_set_a_reason", "~IMG_4036.JPG", "every exercise explained", "Every set has a reason.", (0.5, 0.45)),
    ("p13_week_three", "~IMG_4151.jpeg", "progressive overload", "Week three. Heavier than week one.", (0.5, 0.45)),
    ("p14_built_around_you", "~IMG_4967.jpeg", "four weeks", "Built around you. Not a template.", (0.5, 0.35)),
    ("p15_logged", "~IMG_5076.jpeg", "every rep tracked", "Logged. Not guessed.", (0.5, 0.4)),
]
OWN = os.path.expanduser("~/Clips/planlete/photos")


def render(slug, stock_prefix, overline, head, centre=(0.5, 0.5)):
    if stock_prefix.startswith("~"):  # one of Tim's own photos
        src = stock_prefix[1:]
        raw = ImageOps.exif_transpose(Image.open(os.path.join(OWN, src)))
    else:
        src = next(f for f in sorted(os.listdir(STOCK)) if f.startswith(stock_prefix))
        raw = Image.open(os.path.join(STOCK, src))
    img = ImageOps.fit(raw.convert("RGB"), (W, H), centering=centre)
    # darken towards the bottom so the type always reads
    shade = Image.new("L", (1, H))
    for y in range(H):
        shade.putpixel((0, y), int(235 * max(0, (y - H * 0.35) / (H * 0.65)) ** 1.3))
    img = Image.composite(Image.new("RGB", (W, H), BRAND["bg"]), img, shade.resize((W, H)))
    d = ImageDraw.Draw(img)
    fh = font(DISP, 96)
    lines = wrap_tracked(d, head.upper(), fh, W - 2 * M, TRACK_DISPLAY)
    step = int(96 * LH_DISPLAY)
    y = H - 200 - step * len(lines)
    tracked(d, (M, y - 64), overline.upper(), font(MONOB, 28), BRAND["volt"], TRACK_OVERLINE)
    for ln in lines:
        tracked(d, (M, y), ln, fh, BRAND["fg"], TRACK_DISPLAY); y += step
    d.line([(M, H - 120), (W - M, H - 120)], fill=BRAND["border"], width=2)
    tracked(d, (M, H - 92), BRAND["url"].upper(), font(MONOB, 26), BRAND["volt"], 0.08)
    hw = d.textlength(BRAND["handle"], font=font(MONOB, 26))
    d.text((W - M - hw, H - 92), BRAND["handle"], font=font(MONOB, 26), fill=BRAND["dim"])

    os.makedirs(os.path.join(OUT, slug), exist_ok=True)
    img.save(os.path.join(OUT, slug, slug + ".jpg"), quality=92)
    tt = Image.new("RGB", (1080, 1920), BRAND["bg"]); tt.paste(img, (0, (1920 - H) // 2))
    tt.save(os.path.join(OUT, slug, slug + "_tt.jpg"), quality=92)
    print(slug, "<-", src)


if __name__ == "__main__":
    for p in POSTS:
        render(*p)
