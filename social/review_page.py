#!/usr/bin/env python3
"""
Writes social/upload/review.html: every scheduled post in date order with its video/images and captions,
so Tim can check the schedule before importing. Videos and photos load from the local upload folder;
reused carousels load from R2.

    python3 social/review_page.py
"""
import csv, glob, html, os, re
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
CSVS = sorted(glob.glob(os.path.join(HERE, "schedules", "socialpilot-reels-*.csv")), key=lambda f: datetime.strptime(next(csv.reader(open(f, encoding="utf-8-sig")))[2], "%b %d, %Y %H:%M"))
R2 = "https://pub-3ad74abe28dc4a4e90f5065bb7df55a6.r2.dev/"
NAMES = {"2642874": "Instagram", "2642875": "Facebook", "2642876": "TikTok"}

rows = [r for f in CSVS for r in csv.reader(open(f, encoding="utf-8-sig", newline=""))]
posts = []
for i in range(0, len(rows), 3):
    ig, fb, tt = rows[i], rows[i + 1], rows[i + 2]
    media = ig[1].split("; ")
    local = lambda u: u.replace(R2, "") if "/reels/" in u or "/photo/" in u else u
    kind = "Reel" if media[0].endswith(".mp4") else "Photo" if "/photo/" in media[0] else f"Carousel ({len(media)} slides)"
    posts.append(dict(when=datetime.strptime(ig[2], "%b %d, %Y %H:%M"), kind=kind, media=[local(u) for u in media],
                      caption=ig[0], tags=ig[4], times=[(NAMES[r[3]], r[2][-5:]) for r in (ig, fb, tt)],
                      slug=re.search(r"/(?:reels|photo|ig)/([^/]+)/", media[0]).group(1)))

def card(p):
    if p["kind"] == "Reel":
        m = f'<video src="{p["media"][0]}" controls preload="metadata" playsinline></video>'
    else:
        m = '<div class="strip">' + "".join(f'<img src="{u}" loading="lazy">' for u in p["media"]) + "</div>"
    times = " · ".join(f"{n} {t}" for n, t in p["times"])
    return f"""<article><header><b>{p['when']:%a %d %b}</b><span class="k">{p['kind']}</span><span class="s">{html.escape(p['slug'])}</span></header>
{m}<p>{html.escape(p['caption'])}</p><p class="tags">{html.escape(p['tags'])}</p><p class="t">{times}</p></article>"""

page = f"""<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Planlete schedule review</title>
<style>
:root{{--bg:#050505;--fg:#FAFAFA;--volt:#D4FF00;--card:#121212;--dim:#A3A3A3;--border:#2E2E2E}}
body{{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 -apple-system,system-ui,sans-serif}}
main{{max-width:1100px;margin:0 auto;padding:24px 16px}}
h1{{font-size:28px;margin:0 0 4px}} .sub{{color:var(--dim);margin:0 0 24px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}}
article{{background:var(--card);border:1px solid var(--border);padding:14px}}
header{{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;margin-bottom:10px}}
.k{{color:var(--bg);background:var(--volt);font-size:11px;padding:2px 6px;text-transform:uppercase;letter-spacing:.08em}}
.s{{color:var(--dim);font:12px ui-monospace,monospace}}
video{{width:100%;aspect-ratio:9/16;background:#000}}
.strip{{display:flex;gap:4px;overflow-x:auto}} .strip img{{height:340px}}
.tags{{color:var(--dim);font-size:12px}} .t{{color:var(--volt);font:12px ui-monospace,monospace}}
</style>
<main><h1>Planlete schedule review</h1>
<p class="sub">{len(posts)} posts, {posts[0]['when']:%d %b} to {posts[-1]['when']:%d %b %Y}. Same post goes to Instagram, Facebook (+30 min) and TikTok (+90 min).</p>
<div class="grid">{''.join(card(p) for p in posts)}</div></main>"""
out = os.path.join(HERE, "upload", "review.html")
open(out, "w", encoding="utf-8").write(page)
print(out, len(posts), "posts")
