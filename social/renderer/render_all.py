#!/usr/bin/env python3
"""
Render the carousel bank into social/out/.

    python3 social/renderer/render_all.py                 # every post
    python3 social/renderer/render_all.py 19_not_a_pdf    # one or more slugs
    python3 social/renderer/render_all.py --list          # slugs only

Instagram slides are drawn at 1080x1350. TikTok slides are the same image centred on a
1080x1920 canvas of the slide's own ground colour, which is how the bank in R2 was made.
"""
import os, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from render import build
import content, content2, content3, content4, content5, content6, content7, content8, content9

OUT = os.path.join(HERE, "..", "out")
IG = os.path.join(OUT, "instagram_1080x1350")
TT = os.path.join(OUT, "tiktok_1080x1920")


def all_specs():
    specs = (content.CAROUSELS + content2.MORE + content3.EXTRA + content4.MORE2 +
             content5.BATCH5 + content6.BATCH6 + content7.BATCH7 + content8.BATCH8 +
             content9.BATCH9)
    return sorted(specs, key=lambda s: int(s["slug"].split("_", 1)[0]))


def to_tiktok(src, dst):
    im = Image.open(src).convert("RGB")
    # Ground colour from the median of the top row, so grain does not skew it.
    row = sorted(im.getpixel((x, 0)) for x in range(0, im.width, 8))
    canvas = Image.new("RGB", (1080, 1920), row[len(row) // 2])
    canvas.paste(im, (0, (1920 - im.height) // 2))
    canvas.save(dst, optimize=True)


def main(args):
    specs = all_specs()
    if "--list" in args:
        print("\n".join(s["slug"] for s in specs))
        return
    if args:
        specs = [s for s in specs if s["slug"] in args]
        missing = set(args) - {s["slug"] for s in specs}
        if missing:
            sys.exit(f"Unknown slug(s): {', '.join(sorted(missing))}")
    slides = 0
    for spec in specs:
        paths = build(spec, os.path.join(IG, spec["slug"]))
        os.makedirs(os.path.join(TT, spec["slug"]), exist_ok=True)
        for p in paths:
            to_tiktok(p, os.path.join(TT, spec["slug"], os.path.basename(p)))
        slides += len(paths)
        print(f"{spec['slug']}: {len(paths)} slides")
    print(f"\n{len(specs)} posts, {slides} slides, {slides * 2} images -> {os.path.normpath(OUT)}")


if __name__ == "__main__":
    main(sys.argv[1:])
