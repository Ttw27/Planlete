#!/usr/bin/env python3
"""
Planlete social carousel renderer.
Tokens below are lifted directly from src/index.css and tailwind.config.js.
"""
from PIL import Image, ImageDraw, ImageFont, ImageChops
import functools, os, random

F = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts") + os.sep

# ============================================================
# BRAND — from index.css :root and @layer base
# ============================================================
BRAND = {
    "bg":      "#050505",   # --brand-bg
    "fg":      "#FAFAFA",   # body color
    "volt":    "#D4FF00",   # --accent / --primary (72 100% 50%)
    "card":    "#121212",   # --card   0 0% 7%
    "muted":   "#1F1F1F",   # --muted  0 0% 12%
    "border":  "#2E2E2E",   # --border 0 0% 18%
    "dim":     "#A3A3A3",   # --muted-foreground / .text-overline
    "name":    "PLANLETE",
    "handle":  "@planlete",
    "url":     "planlete.co.uk",
}
RADIUS = 0               # --radius: 0rem
GRAIN_OPACITY = 0.06     # .grain::before
TRACK_DISPLAY = -0.04    # .font-display letter-spacing
TRACK_OVERLINE = 0.22    # .text-overline letter-spacing
LH_DISPLAY = 0.92        # .font-display line-height

W, H = 1080, 1350
M = 84

# Cabinet Grotesk is Fontshare-only and unreachable from this environment.
# index.css declares Manrope as its fallback, so that is what we use.
DISP = "Manrope-800.ttf"
BODY = "Manrope-400.ttf"
BODYM = "Manrope-500.ttf"
BODYB = "Manrope-700.ttf"
MONO = "JBMono-Medium.ttf"
MONOB = "JBMono-Bold.ttf"


# The original static weights lived in the chat sandbox. Locally we use the Google Fonts
# variable files and pin the weight axis, so the names above still resolve.
VARIABLE = {
    "Manrope-800.ttf": ("Manrope.ttf", 800),
    "Manrope-400.ttf": ("Manrope.ttf", 400),
    "Manrope-500.ttf": ("Manrope.ttf", 500),
    "Manrope-700.ttf": ("Manrope.ttf", 700),
    "JBMono-Medium.ttf": ("JetBrainsMono.ttf", 500),
    "JBMono-Bold.ttf": ("JetBrainsMono.ttf", 700),
}


@functools.lru_cache(maxsize=None)
def font(name, size):
    path, weight = VARIABLE[name]
    f = ImageFont.truetype(F + path, size)
    f.set_variation_by_axes([weight])
    return f


def tracked(draw, xy, text, fnt, fill, track):
    """Draw text with letter-spacing (Pillow has none natively)."""
    x, y = xy
    sp = fnt.size * track
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += draw.textlength(ch, font=fnt) + sp
    return x


def tracked_width(draw, text, fnt, track):
    return sum(draw.textlength(c, font=fnt) + fnt.size * track for c in text)


def wrap_tracked(draw, text, fnt, max_w, track):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if tracked_width(draw, t, fnt, track) <= max_w:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def wrap(draw, text, fnt, max_w):
    return wrap_tracked(draw, text, fnt, max_w, 0)


def fit_display(draw, text, max_w, max_h, start, min_size=44):
    """Uppercase, tight-tracked, 0.92 leading — per .font-display."""
    text = text.upper()
    size = start
    while size > min_size:
        fnt = font(DISP, size)
        lines = wrap_tracked(draw, text, fnt, max_w, TRACK_DISPLAY)
        if len(lines) * size * LH_DISPLAY <= max_h:
            return fnt, lines, size * LH_DISPLAY
        size -= 3
    fnt = font(DISP, min_size)
    return fnt, wrap_tracked(draw, text, fnt, max_w, TRACK_DISPLAY), min_size * LH_DISPLAY


def grain(img, opacity=GRAIN_OPACITY):
    """Noise overlay, blended the way .grain::before does."""
    rnd = random.Random(7)
    small = Image.new("L", (W // 3, H // 3))
    small.putdata([rnd.randint(0, 255) for _ in range(small.width * small.height)])
    n = small.resize((W, H), Image.BILINEAR).convert("RGB")
    return Image.blend(img, ImageChops.overlay(img, n), opacity)


class Slide:
    def __init__(self, volt_ground=False):
        self.volt = volt_ground
        self.bg = BRAND["volt"] if volt_ground else BRAND["bg"]
        self.fg = BRAND["bg"] if volt_ground else BRAND["fg"]
        self.sec = BRAND["bg"] if volt_ground else BRAND["dim"]
        self.acc = BRAND["bg"] if volt_ground else BRAND["volt"]
        self.rule = BRAND["bg"] if volt_ground else BRAND["border"]
        self.img = Image.new("RGB", (W, H), self.bg)
        self.d = ImageDraw.Draw(self.img)

    def overline(self, text, y=104):
        tracked(self.d, (M, y), text.upper(), font(MONO, 25), self.acc, TRACK_OVERLINE)

    def headline(self, text, top=214, size=126, box_h=560):
        fnt, lines, lh = fit_display(self.d, text, W - 2 * M, box_h, size)
        y = top
        for ln in lines:
            tracked(self.d, (M, y), ln, fnt, self.fg, TRACK_DISPLAY)
            y += lh
        return y

    def para(self, text, y, size=38, colour=None, fname=BODY, gap=1.5):
        fnt = font(fname, size)
        for ln in wrap(self.d, text, fnt, W - 2 * M):
            self.d.text((M, y), ln, font=fnt, fill=colour or self.sec)
            y += size * gap
        return y

    def bignum(self, text, y, size=260):
        fnt = font(DISP, size)
        tracked(self.d, (M, y), text.upper(), fnt, self.acc, TRACK_DISPLAY)
        return y + size * LH_DISPLAY

    def rows(self, items, y, size=40):
        fm = font(MONOB, 26)
        fb = font(BODYM, size)
        for i, it in enumerate(items, 1):
            tracked(self.d, (M, y + 8), f"{i:02d}", fm, self.acc, TRACK_OVERLINE)
            yy = y
            for ln in wrap(self.d, it, fb, W - 2 * M - 92):
                self.d.text((M + 92, yy), ln, font=fb, fill=self.fg)
                yy += size * 1.3
            y = yy + 28
        return y

    def plan(self, items, y):
        fd = font(MONOB, 27)
        fs = font(BODYB, 40)
        fn = font(BODY, 29)
        for day, sess, note in items:
            self.d.line([(M, y), (W - M, y)], fill=self.rule, width=2)
            tracked(self.d, (M, y + 26), day.upper(), fd, self.acc, TRACK_OVERLINE)
            self.d.text((M + 240, y + 20), sess, font=fs, fill=self.fg)
            if note:
                self.d.text((M + 240, y + 70), note, font=fn, fill=self.sec)
            y += 114 if note else 84
        self.d.line([(M, y), (W - M, y)], fill=self.rule, width=2)
        return y

    def shot(self, path, y_top=250, caption=None, label=None):
        """Place a real app screenshot. Hard-edged volt rule, per --radius: 0."""
        im = Image.open(path).convert("RGB")
        ar = im.height / im.width
        if ar > 1.6:
            # tall phone capture — sits right, text runs down the left gutter
            h = 900
            w = int(h / ar)
            x = W - M - w
            im = im.resize((w, h), Image.LANCZOS)
            self.img.paste(im, (x, y_top))
            self.d.rectangle([x - 2, y_top - 2, x + w + 1, y_top + h + 1],
                             outline=self.acc, width=3)
            if label:
                tracked(self.d, (M, y_top + 4), label.upper(),
                        font(MONO, 23), self.acc, TRACK_OVERLINE)
            if caption:
                fnt = font(BODYM, 36)
                yy = y_top + 60
                for ln in wrap(self.d, caption, fnt, x - M - 50):
                    self.d.text((M, yy), ln, font=fnt, fill=self.fg)
                    yy += 36 * 1.35
        else:
            # cropped detail band — full width
            w = W - 2 * M
            h = int(w * ar)
            im = im.resize((w, h), Image.LANCZOS)
            self.img.paste(im, (M, y_top))
            self.d.rectangle([M - 2, y_top - 2, M + w + 1, y_top + h + 1],
                             outline=self.acc, width=3)
            if caption:
                self.para(caption, y_top + h + 44, size=38, colour=self.fg,
                          fname=BODYM)
        return self

    def app_mock(self, y, day_label, focus, rows, reason_on=None, reason_text=""):
        """
        A representation of the plan app, matched to AppShell's exercise row:
        checkbox, name, sets in volt mono on the right, then load · rest
        underneath with the info icon. Not a literal screenshot — a rendering
        of the same layout at poster scale so it is legible in a feed.
        """
        pad = 26
        x0, x1 = M, W - M
        # Day header
        self.d.rectangle([x0, y, x1, y + 92], fill=BRAND["card"])
        tracked(self.d, (x0 + pad, y + 22), day_label.upper(), font(MONOB, 24),
                BRAND["volt"], TRACK_OVERLINE)
        self.d.text((x0 + pad, y + 54), focus, font=font(BODYM, 30), fill=BRAND["fg"])
        y += 92

        for i, (name, sets, load, rest) in enumerate(rows):
            h = 108
            self.d.rectangle([x0, y, x1, y + h], fill=BRAND["bg"])
            self.d.line([(x0, y), (x1, y)], fill=BRAND["border"], width=2)
            # checkbox
            bx, by = x0 + pad, y + 26
            done = i == 0
            self.d.rectangle([bx, by, bx + 22, by + 22],
                             fill=BRAND["volt"] if done else None,
                             outline=BRAND["volt"] if done else "#4A4A4A", width=2)
            if done:
                self.d.line([(bx + 5, by + 11), (bx + 9, by + 16)], fill=BRAND["bg"], width=3)
                self.d.line([(bx + 9, by + 16), (bx + 17, by + 6)], fill=BRAND["bg"], width=3)
            # name + sets
            self.d.text((bx + 40, y + 22), name, font=font(BODYM, 30),
                        fill="#6A6A6A" if done else BRAND["fg"])
            sw = self.d.textlength(sets, font=font(MONOB, 28))
            self.d.text((x1 - pad - sw, y + 24), sets, font=font(MONOB, 28), fill=BRAND["volt"])
            # load · rest
            self.d.text((bx + 40, y + 62), f"{load} · rest {rest}",
                        font=font(BODY, 24), fill=BRAND["dim"])
            # info dot
            cx, cy = x1 - pad - 14, y + 74
            active = (reason_on == i)
            self.d.ellipse([cx - 15, cy - 15, cx + 15, cy + 15],
                           fill=BRAND["volt"] if active else None,
                           outline=None if active else "#4A4A4A", width=2)
            self.d.text((cx, cy), "i", font=font(MONOB, 22),
                        fill=BRAND["bg"] if active else "#8A8A8A", anchor="mm")
            y += h

            if active and reason_text:
                fnt = font(BODY, 25)
                lines = wrap(self.d, reason_text, fnt, x1 - x0 - pad * 2 - 40)
                bh = len(lines) * 36 + 40
                self.d.rectangle([x0, y, x1, y + bh], fill="#101403")
                self.d.line([(x0, y), (x0, y + bh)], fill=BRAND["volt"], width=6)
                yy = y + 20
                for ln in lines:
                    self.d.text((x0 + pad + 20, yy), ln, font=fnt, fill="#E8F5B0")
                    yy += 36
                y += bh
        self.d.line([(x0, y), (x1, y)], fill=BRAND["border"], width=2)
        return y

    def _icon(self, kind, cx, cy, col, sz=1.0):
        """Simplified glyphs approximating the app's tab icons."""
        d, s = self.d, sz
        if kind == "home":
            d.polygon([(cx, cy-11*s), (cx-12*s, cy+1*s), (cx+12*s, cy+1*s)], outline=col, width=2)
            d.rectangle([cx-8*s, cy+1*s, cx+8*s, cy+11*s], outline=col, width=2)
        elif kind == "train":
            d.rectangle([cx-13*s, cy-4*s, cx-8*s, cy+4*s], outline=col, width=2)
            d.rectangle([cx+8*s, cy-4*s, cx+13*s, cy+4*s], outline=col, width=2)
            d.line([(cx-8*s, cy), (cx+8*s, cy)], fill=col, width=2)
        elif kind == "morning":
            d.arc([cx-11*s, cy-8*s, cx+11*s, cy+12*s], 180, 360, fill=col, width=2)
            d.line([(cx-14*s, cy+6*s), (cx+14*s, cy+6*s)], fill=col, width=2)
            d.line([(cx, cy-14*s), (cx, cy-9*s)], fill=col, width=2)
        elif kind == "fuel":
            d.arc([cx-12*s, cy-8*s, cx+12*s, cy+10*s], 0, 180, fill=col, width=2)
            d.line([(cx-13*s, cy-1*s), (cx+13*s, cy-1*s)], fill=col, width=2)
        elif kind == "recover":
            d.arc([cx-10*s, cy-11*s, cx+12*s, cy+11*s], 40, 300, fill=col, width=2)

    def phone(self, top=286, ph_w=600, ph_h=868, view="today", data=None,
              left=None, bleed=False):
        """
        The plan app in a phone frame, matched to the live UI: volt wordmark
        bar, header, hero, content, and the five-tab bar along the bottom.
        """
        data = data or {}
        x0 = (W - ph_w) // 2 if left is None else left
        x1, y1 = x0 + ph_w, top + ph_h
        r = 46
        # bezel
        self.d.rounded_rectangle([x0-9, top-9, x1+9, y1+9], radius=r+9,
                                 fill="#0C0C0C", outline="#2A2A2A", width=2)
        self.d.rounded_rectangle([x0, top, x1, y1], radius=r, fill=BRAND["bg"])
        y = top + 16

        # PLANLETE bar
        tw = tracked_width(self.d, "PLANLETE", font(MONOB, 21), TRACK_OVERLINE)
        tracked(self.d, (x0 + (ph_w - tw) / 2, y + 10), "PLANLETE",
                font(MONOB, 21), BRAND["volt"], TRACK_OVERLINE)
        y += 52

        # header
        hw = tracked_width(self.d, "YOUR APP", font(MONO, 20), TRACK_OVERLINE)
        tracked(self.d, (x0 + (ph_w - hw) / 2, y + 6), "YOUR APP",
                font(MONO, 20), BRAND["dim"], TRACK_OVERLINE)
        self.d.text((x0 + ph_w / 2, y + 38), data.get("subtitle", "Your plan"),
                    font=font(BODY, 24), fill=BRAND["fg"], anchor="ma")
        self.d.text((x0 + 26, y + 18), "<", font=font(BODY, 26), fill=BRAND["fg"])
        y += 78

        # hero strip
        hh = 196 if view == "today" else 118
        for i in range(hh):
            g = int(26 + 22 * (i / hh))
            self.d.line([(x0, y + i), (x1, y + i)], fill=(g, g, g + 2))
        tracked(self.d, (x0 + 26, y + hh - 46), data.get("hero", "TODAY · SAT"),
                font(MONO, 21), BRAND["fg"], TRACK_OVERLINE)
        y += hh

        if view == "today":
            self.d.line([(x0, y), (x1, y)], fill=BRAND["border"], width=2)
            tracked(self.d, (x0 + 26, y + 26), "TODAY'S SESSION",
                    font(MONO, 20), BRAND["dim"], TRACK_OVERLINE)
            self.d.text((x1 - 26, y + 26), data.get("done", "2/4 done"),
                        font=font(MONO, 19), fill=BRAND["dim"], anchor="ra")
            y += 76
            self.d.line([(x0, y), (x1, y)], fill=BRAND["border"], width=2)
            # macro tiles
            tiles = data.get("macros", [("2450","CAL"),("185g","PROTEIN"),("260g","CARBS"),("78g","FATS")])
            tw_ = (ph_w - 52 - 3 * 12) / 4
            for i, (val, lab) in enumerate(tiles):
                tx = x0 + 26 + i * (tw_ + 12)
                self.d.rectangle([tx, y + 18, tx + tw_, y + 112], outline="#262626", width=2)
                self.d.text((tx + tw_ / 2, y + 42), val, font=font(DISP, 30),
                            fill=BRAND["volt"], anchor="ma")
                lw = tracked_width(self.d, lab, font(MONO, 15), TRACK_OVERLINE)
                tracked(self.d, (tx + (tw_ - lw) / 2, y + 82), lab,
                        font(MONO, 15), BRAND["dim"], TRACK_OVERLINE)
            y += 134
            self.d.line([(x0, y), (x1, y)], fill=BRAND["border"], width=2)
            tracked(self.d, (x0 + 26, y + 24), "JUMP TO",
                    font(MONO, 20), BRAND["dim"], TRACK_OVERLINE)
            y += 66
            for i, (ic, lab) in enumerate([("train","TRAIN"),("morning","MORNING"),
                                           ("fuel","FUEL"),("recover","RECOVER")]):
                tx = x0 + 26 + i * (tw_ + 12)
                self.d.rectangle([tx, y, tx + tw_, y + 96], outline="#262626", width=2)
                self._icon(ic, tx + tw_ / 2, y + 34, BRAND["fg"], 1.0)
                lw = tracked_width(self.d, lab, font(MONO, 15), TRACK_OVERLINE)
                tracked(self.d, (tx + (tw_ - lw) / 2, y + 66), lab,
                        font(MONO, 15), BRAND["dim"], TRACK_OVERLINE)

        elif view == "timer":
            rows = data.get("rows", [])
            self.d.line([(x0, y), (x1, y)], fill=BRAND["border"], width=2)
            tracked(self.d, (x0 + 26, y + 22), data.get("focus", "").upper(),
                    font(MONOB, 20), BRAND["volt"], TRACK_OVERLINE)
            y += 64
            for i, (nm, sets, load, rest) in enumerate(rows[:2]):
                self.d.line([(x0, y), (x1, y)], fill=BRAND["border"], width=2)
                done = i == 0
                bx, by = x0 + 26, y + 20
                self.d.rectangle([bx, by, bx + 17, by + 17],
                                 fill=BRAND["volt"] if done else None,
                                 outline=BRAND["volt"] if done else "#4A4A4A", width=2)
                self.d.text((bx + 32, y + 15), nm, font=font(BODYM, 24),
                            fill="#5E5E5E" if done else BRAND["fg"])
                sw = self.d.textlength(sets, font=font(MONOB, 22))
                self.d.text((x1 - 26 - sw, y + 16), sets, font=font(MONOB, 22), fill=BRAND["volt"])
                self.d.text((bx + 32, y + 48), f"{load} · rest {rest}",
                            font=font(BODY, 19), fill=BRAND["dim"])
                y += 84
            # the running timer card
            self.d.line([(x0, y), (x1, y)], fill=BRAND["border"], width=2)
            ch = 300
            self.d.rectangle([x0, y, x1, y + ch], fill=BRAND["card"])
            lab = data.get("timer_label", "REST")
            lw = tracked_width(self.d, lab, font(MONO, 20), TRACK_OVERLINE)
            tracked(self.d, (x0 + (ph_w - lw) / 2, y + 40), lab,
                    font(MONO, 20), BRAND["dim"], TRACK_OVERLINE)
            self.d.text((x0 + ph_w / 2, y + 88), data.get("timer", "2:14"),
                        font=font(DISP, 130), fill=BRAND["volt"], anchor="ma")
            # progress bar
            frac = data.get("timer_frac", 0.62)
            bw = ph_w - 104
            self.d.rectangle([x0 + 52, y + 244, x0 + 52 + bw, y + 254], fill="#242424")
            self.d.rectangle([x0 + 52, y + 244, x0 + 52 + bw * frac, y + 254], fill=BRAND["volt"])
            y += ch

        elif view in ("morning", "fuel", "recover", "phases"):
            hdr = data.get("header", "")
            if hdr:
                self.d.line([(x0, y), (x1, y)], fill=BRAND["border"], width=2)
                tracked(self.d, (x0 + 26, y + 22), hdr.upper(),
                        font(MONOB, 20), BRAND["volt"], TRACK_OVERLINE)
                y += 64
            limit = (H + 60) if bleed else (y1 - 104)
            for item in data.get("items", []):
                title, right, sub = (list(item) + ["", ""])[:3]
                lines = wrap(self.d, sub, font(BODY, 19), ph_w - 76) if sub else []
                need = 58 + len(lines) * 26
                if y + need > limit:
                    break
                self.d.line([(x0, y), (x1, y)], fill=BRAND["border"], width=2)
                self.d.text((x0 + 26, y + 15), title, font=font(BODYM, 24), fill=BRAND["fg"])
                if right:
                    rw = self.d.textlength(right, font=font(MONOB, 21))
                    self.d.text((x1 - 26 - rw, y + 17), right,
                                font=font(MONOB, 21), fill=BRAND["volt"])
                yy = y + 46
                for ln in lines:
                    self.d.text((x0 + 26, yy), ln, font=font(BODY, 19), fill=BRAND["dim"])
                    yy += 26
                y = yy + 14

        else:  # train view
            rows = data.get("rows", [])
            reason_on = data.get("reason_on")
            reason = data.get("reason", "")
            self.d.line([(x0, y), (x1, y)], fill=BRAND["border"], width=2)
            tracked(self.d, (x0 + 26, y + 22), data.get("focus", "LOWER STRENGTH").upper(),
                    font(MONOB, 20), BRAND["volt"], TRACK_OVERLINE)
            y += 64
            limit = (H + 60) if bleed else (y1 - 104)
            for i, (nm, sets, load, rest) in enumerate(rows):
                needed = 84
                if reason_on == i and reason:
                    needed += len(wrap(self.d, reason, font(BODY, 20), ph_w - 96)) * 29 + 32
                if y + needed > limit:
                    self.d.text((x0 + 26, y + 16), f"+{len(rows) - i} more",
                                font=font(BODY, 20), fill=BRAND["dim"])
                    break
                self.d.line([(x0, y), (x1, y)], fill=BRAND["border"], width=2)
                done = i == 0
                bx, by = x0 + 26, y + 20
                self.d.rectangle([bx, by, bx + 17, by + 17],
                                 fill=BRAND["volt"] if done else None,
                                 outline=BRAND["volt"] if done else "#4A4A4A", width=2)
                self.d.text((bx + 32, y + 15), nm, font=font(BODYM, 24),
                            fill="#5E5E5E" if done else BRAND["fg"])
                sw = self.d.textlength(sets, font=font(MONOB, 22))
                self.d.text((x1 - 26 - sw, y + 16), sets, font=font(MONOB, 22), fill=BRAND["volt"])
                self.d.text((bx + 32, y + 48), f"{load} · rest {rest}",
                            font=font(BODY, 19), fill=BRAND["dim"])
                cx, cy = x1 - 40, y + 56
                act = (reason_on == i)
                self.d.ellipse([cx-12, cy-12, cx+12, cy+12],
                               fill=BRAND["volt"] if act else None,
                               outline=None if act else "#4A4A4A", width=2)
                self.d.text((cx, cy), "i", font=font(MONOB, 18),
                            fill=BRAND["bg"] if act else "#7A7A7A", anchor="mm")
                y += 84
                if act and reason:
                    fnt = font(BODY, 20)
                    lines = wrap(self.d, reason, fnt, ph_w - 96)
                    bh = len(lines) * 29 + 32
                    self.d.rectangle([x0, y, x1, y + bh], fill="#101403")
                    self.d.line([(x0, y), (x0, y + bh)], fill=BRAND["volt"], width=5)
                    yy = y + 16
                    for ln in lines:
                        self.d.text((x0 + 44, yy), ln, font=fnt, fill="#E8F5B0")
                        yy += 29
                    y += bh

        # bottom tab bar — skipped when the phone runs off the canvas
        if bleed:
            return
        by0 = y1 - 96
        self.d.line([(x0, by0), (x1, by0)], fill=BRAND["border"], width=2)
        tabs = [("home","TODAY"),("train","TRAIN"),("morning","MORNING"),
                ("fuel","FUEL"),("recover","RECOVER")]
        active = {"today": 0, "train": 1, "timer": 1, "phases": 1,
                  "morning": 2, "fuel": 3, "recover": 4}.get(view, 0)
        seg = ph_w / 5
        for i, (ic, lab) in enumerate(tabs):
            cx = x0 + seg * i + seg / 2
            col = BRAND["volt"] if i == active else "#6A6A6A"
            if i == active:
                self.d.rectangle([x0 + seg*i + 6, by0 + 6, x0 + seg*(i+1) - 6, y1 - 8],
                                 outline=BRAND["volt"], width=2)
            self._icon(ic, cx, by0 + 34, col, 0.95)
            lw = tracked_width(self.d, lab, font(MONO, 14), TRACK_OVERLINE)
            tracked(self.d, (cx - lw/2, by0 + 58), lab, font(MONO, 14), col, TRACK_OVERLINE)

    def lockup(self, y):
        end = tracked(self.d, (M, y), BRAND["name"], font(DISP, 54),
                      self.fg, TRACK_DISPLAY)
        tracked(self.d, (end + 26, y + 18), "BUILT FOR YOU",
                font(MONO, 24), self.sec, TRACK_OVERLINE)

    def footer_top(self, idx, total, label=""):
        """Counter at the top when the artwork bleeds over the usual footer."""
        f = font(MONO, 25)
        self.d.text((W - M, 106), f"{idx:02d}/{total:02d}  {BRAND['handle']}",
                    font=f, fill=self.sec, anchor="ra")

    def footer(self, idx, total, label=""):
        y = H - 114
        self.d.line([(M, y), (W - M, y)], fill=self.rule, width=2)
        f = font(MONO, 25)
        self.d.text((M, y + 32), f"{idx:02d}/{total:02d}", font=f, fill=self.sec)
        x0, x1 = M + 128, W - M - 250
        step = (x1 - x0) / max(total - 1, 1)
        for i in range(total):
            x = x0 + step * i
            on = (i + 1) == idx
            h = 20 if on else 10
            self.d.line([(x, y + 44 - h / 2), (x, y + 44 + h / 2)],
                        fill=self.acc if on else self.rule, width=5 if on else 3)
        self.d.text((W - M, y + 32), BRAND["handle"], font=f, fill=self.sec, anchor="ra")
        if label:
            tracked(self.d, (M, y - 52), label.upper(), font(MONO, 23),
                    self.sec, TRACK_OVERLINE)

    def save(self, path):
        (self.img if self.volt else grain(self.img)).save(path, "PNG")


def build(spec, outdir):
    os.makedirs(outdir, exist_ok=True)
    total = len(spec["slides"])
    b2b = not spec.get("dark", True)     # the old "chalk" flag now means coach/physio
    paths = []
    for i, s in enumerate(spec["slides"], 1):
        kind = s["kind"]
        # B2B covers and CTAs run on a volt field — the cover is what shows in the grid.
        volt = b2b and kind in ("cover", "cta")
        sl = Slide(volt_ground=volt)

        if kind == "cover":
            sl.overline(s.get("eyebrow", spec.get("label", "")))
            y = sl.headline(s["head"], top=228, size=132, box_h=640)
            if s.get("sub"):
                sl.para(s["sub"], y + 52, size=38)

        elif kind == "stat":
            sl.overline(s.get("eyebrow", ""))
            y = sl.bignum(s["num"], 320)
            sl.para(s["sub"], y + 40, size=46, colour=sl.fg, fname=BODYM)

        elif kind == "statement":
            fnt, lines, lh = fit_display(sl.d, s["head"], W - 2 * M, 740, 116)
            y = (H - len(lines) * lh) / 2 - 70
            for ln in lines:
                tracked(sl.d, (M, y), ln, fnt, sl.fg, TRACK_DISPLAY)
                y += lh
            if s.get("sub"):
                sl.para(s["sub"], y + 46, size=36)

        elif kind == "list":
            sl.overline(s.get("eyebrow", ""))
            y = sl.headline(s["head"], top=210, size=96, box_h=280)
            sl.rows(s["items"], y + 66)

        elif kind == "plan":
            sl.overline(s.get("eyebrow", ""))
            y = sl.headline(s["head"], top=210, size=80, box_h=190)
            sl.plan(s["items"], y + 40)

        elif kind == "shot":
            sl.overline(s.get("eyebrow", ""))
            if s.get("head"):
                y = sl.headline(s["head"], top=200, size=76, box_h=150)
            else:
                y = 200
            sl.shot(s["path"], y_top=int(y + 40),
                    caption=s.get("caption"), label=s.get("label"))

        elif kind == "app":
            sl.overline(s.get("eyebrow", ""))
            y = sl.headline(s["head"], top=206, size=74, box_h=180)
            sl.app_mock(y + 34, s["day"], s["focus"], s["rows"],
                        s.get("reason_on"), s.get("reason", ""))

        elif kind == "phone":
            sl.overline(s.get("eyebrow", ""))
            lay = s.get("layout", "fit")
            if lay == "fit":
                sl.headline(s["head"], top=172, size=58, box_h=104)
                sl.phone(view=s.get("view", "today"), data=s.get("data", {}))
            elif lay == "bleed":
                sl.headline(s["head"], top=176, size=72, box_h=160)
                sl.phone(top=386, ph_w=780, ph_h=1180,
                         view=s.get("view", "today"), data=s.get("data", {}), bleed=True)
            elif lay == "offset":
                sl.headline(s["head"], top=200, size=76, box_h=300)
                sl.phone(top=470, ph_w=740, ph_h=1150, left=300,
                         view=s.get("view", "today"), data=s.get("data", {}), bleed=True)

        elif kind == "cta":
            sl.overline(s.get("eyebrow", "start here"))
            y = sl.headline(s["head"], top=252, size=118, box_h=470)
            if s.get("sub"):
                sl.para(s["sub"], y + 46, size=38)
            sl.lockup(H - 296)
            sl.d.text((M, H - 218), BRAND["url"], font=font(MONO, 30), fill=sl.acc)

        if kind == "phone" and s.get("layout", "fit") in ("bleed", "offset"):
            sl.footer_top(i, total)
        else:
            sl.footer(i, total, "" if kind == "cta" else spec.get("label", ""))
        p = os.path.join(outdir, f"{spec['slug']}_{i:02d}.png")
        sl.save(p)
        paths.append(p)
    return paths
