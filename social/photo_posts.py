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
]


def render(slug, stock_prefix, overline, head):
    src = next(f for f in sorted(os.listdir(STOCK)) if f.startswith(stock_prefix))
    img = ImageOps.fit(Image.open(os.path.join(STOCK, src)).convert("RGB"), (W, H))
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
