#!/usr/bin/env python3
"""Draw WebCom architecture diagrams as PNG for PDF embed."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1] / "docs" / "pdf-assets"
FONT_PATH = "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_PATH, size)


def rounded_box(draw, xy, fill, outline, radius=10, width=2):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def center_text(draw, box, text, fnt, fill=(20, 28, 40)):
    x0, y0, x1, y1 = box
    lines = text.split("\n")
    line_hs = []
    for ln in lines:
        bbox = draw.textbbox((0, 0), ln, font=fnt)
        w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
        line_hs.append((ln, w, h))
    total_h = sum(h for _, _, h in line_hs) + (len(lines) - 1) * 3
    cy = y0 + (y1 - y0 - total_h) / 2
    for ln, w, h in line_hs:
        draw.text((x0 + (x1 - x0 - w) / 2, cy), ln, font=fnt, fill=fill)
        cy += h + 3


def arrow(draw, x1, y1, x2, y2, color=(11, 20, 32), dashed=False, label=None):
    if dashed:
        length = math.hypot(x2 - x1, y2 - y1) or 1
        dx, dy = (x2 - x1) / length, (y2 - y1) / length
        pos, on = 0.0, True
        while pos < length - 12:
            seg = 8 if on else 6
            nx = min(length - 12, pos + seg)
            if on:
                draw.line(
                    (x1 + dx * pos, y1 + dy * pos, x1 + dx * nx, y1 + dy * nx),
                    fill=color,
                    width=2,
                )
            on = not on
            pos = nx
    else:
        draw.line((x1, y1, x2, y2), fill=color, width=2)
    ang = math.atan2(y2 - y1, x2 - x1)
    for a in (ang + 2.6, ang - 2.6):
        draw.line(
            (x2, y2, x2 + 9 * math.cos(a), y2 + 9 * math.sin(a)),
            fill=color,
            width=2,
        )
    if label:
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2 - 8
        f = font(11)
        bbox = draw.textbbox((0, 0), label, font=f)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        pad = 3
        draw.rectangle(
            (mx - tw / 2 - pad, my - th / 2 - pad, mx + tw / 2 + pad, my + th / 2 + pad),
            fill=(255, 255, 255),
        )
        draw.text((mx - tw / 2, my - th / 2), label, font=f, fill=(255, 92, 26))


def draw_domain() -> Path:
    W, H = 1400, 1020
    img = Image.new("RGB", (W, H), (255, 255, 255))
    d = ImageDraw.Draw(img)
    d.text((40, 24), "2.1 · Domain & dịch vụ (production)", font=font(22), fill=(11, 20, 32))
    d.line((40, 56, 420, 56), fill=(255, 92, 26), width=3)

    # DNS
    rounded_box(d, (40, 80, 1360, 200), (243, 245, 247), (213, 219, 227))
    d.text((56, 92), "DNS · HTTPS", font=font(14), fill=(100, 110, 120))
    apex = (80, 120, 680, 180)
    themes = (720, 120, 1320, 180)
    rounded_box(d, apex, (11, 20, 32), (11, 20, 32))
    center_text(d, apex, "webecom.ngoinhahomnay.vn", font(18), fill=(255, 255, 255))
    rounded_box(d, themes, (11, 20, 32), (11, 20, 32))
    center_text(d, themes, "themes.ngoinhahomnay.vn", font(18), fill=(255, 255, 255))
    arrow(d, 680, 150, 720, 150, dashed=True, label="redirect /products…")

    # Nginx
    rounded_box(d, (40, 230, 1360, 500), (255, 250, 246), (255, 180, 140))
    d.text((56, 242), "Nginx reverse proxy", font=font(14), fill=(180, 80, 40))

    loc_api = (90, 280, 410, 340)
    loc_con = (90, 360, 410, 420)
    loc_corp = (90, 440, 410, 490)
    loc_sf_api = (780, 310, 1100, 370)
    loc_sf = (780, 410, 1100, 470)
    for box, label in [
        (loc_api, "/api → :3101"),
        (loc_con, "/console → :3100"),
        (loc_corp, "/ → :3103"),
        (loc_sf_api, "/api → :3101"),
        (loc_sf, "/ → :3102"),
    ]:
        rounded_box(d, box, (255, 255, 255), (11, 20, 32))
        center_text(d, box, label, font(15))

    arrow(d, 380, 180, 250, 280)
    arrow(d, 380, 180, 250, 360)
    arrow(d, 380, 180, 250, 440)
    arrow(d, 1020, 180, 940, 310)
    arrow(d, 1020, 180, 940, 410)

    # Apps
    rounded_box(d, (40, 540, 1360, 760), (240, 248, 255), (160, 190, 220))
    d.text((56, 552), "Processes trên VPS", font=font(14), fill=(50, 90, 130))
    apps = [
        ((80, 600, 370, 730), "admin-api\n:3101"),
        ((400, 600, 700, 730), "admin-web\n:3100\nbasePath=/console"),
        ((730, 600, 1030, 730), "corporate-web\n:3103"),
        ((1060, 600, 1320, 730), "storefront-web\n:3102"),
    ]
    for xy, label in apps:
        rounded_box(d, xy, (255, 255, 255), (11, 20, 32))
        center_text(d, xy, label, font(14))

    arrow(d, 250, 490, 225, 600)  # / → corp? actually /api→api, /console→adm, /→corp
    arrow(d, 250, 340, 225, 600)  # api
    arrow(d, 250, 420, 550, 600)  # console → admin-web
    arrow(d, 250, 490, 880, 600)  # / → corporate
    arrow(d, 940, 370, 225, 600)  # themes /api → api
    arrow(d, 940, 470, 1190, 600)  # themes / → storefront

    # Data stores
    pg = (400, 820, 680, 920)
    rd = (720, 820, 1000, 920)
    rounded_box(d, pg, (232, 245, 238), (13, 143, 107), radius=28)
    rounded_box(d, rd, (232, 245, 238), (13, 143, 107), radius=28)
    center_text(d, pg, "PostgreSQL", font(16))
    center_text(d, rd, "Redis", font(16))
    arrow(d, 225, 730, 540, 820)
    arrow(d, 225, 730, 860, 820)

    d.text(
        (40, 960),
        "Apex = Platform GTM · themes = Storefront sandbox · /api dùng chung admin-api",
        font=font(13),
        fill=(100, 110, 120),
    )

    path = OUT / "diagram-domain.png"
    img.save(path, "PNG")
    return path


def draw_flow() -> Path:
    W, H = 1500, 820
    img = Image.new("RGB", (W, H), (255, 255, 255))
    d = ImageDraw.Draw(img)
    d.text((40, 24), "2.2 · Luồng nghiệp vụ giữa các site", font=font(22), fill=(11, 20, 32))
    d.line((40, 56, 460, 56), fill=(255, 92, 26), width=3)

    cols = [
        (40, 80, 480, 470, "Khách tiềm năng", (255, 246, 240), (255, 160, 100)),
        (520, 80, 960, 470, "Sandbox", (240, 248, 255), (100, 150, 200)),
        (1000, 80, 1460, 470, "Đội vận hành", (243, 245, 247), (120, 130, 140)),
    ]
    for x0, y0, x1, y1, lab, fill, outline in cols:
        rounded_box(d, (x0, y0, x1, y1), fill, outline)
        d.text((x0 + 16, y0 + 12), lab, font=font(15), fill=outline)

    nodes = {
        "H": (70, 120, 450, 175),
        "T": (70, 200, 450, 255),
        "TR": (70, 280, 450, 335),
        "D": (70, 360, 450, 415),
        "SF": (550, 130, 930, 195),
        "PDP": (550, 230, 930, 295),
        "CART": (550, 330, 930, 395),
        "CC": (1030, 120, 1430, 175),
        "GL": (1030, 205, 1430, 260),
        "CMS": (1030, 290, 1430, 345),
        "AN": (1030, 375, 1430, 430),
    }
    labels = {
        "H": "/  Home GTM",
        "T": "/templates",
        "TR": "/trial",
        "D": "#demo  Lead form",
        "SF": "themes…/?demo=code",
        "PDP": "/products/…",
        "CART": "/cart → /checkout",
        "CC": "/console  Command Center",
        "GL": "/console/website/golive",
        "CMS": "/console/platform/pages",
        "AN": "/console/website/analytics",
    }
    for k, box in nodes.items():
        rounded_box(d, box, (255, 255, 255), (11, 20, 32))
        center_text(d, box, labels[k], font(14))

    api = (560, 540, 940, 640)
    rounded_box(d, api, (11, 20, 32), (11, 20, 32), radius=16)
    center_text(d, api, "admin-api", font(22), fill=(255, 255, 255))

    # Column internal
    arrow(d, 260, 175, 260, 200)
    arrow(d, 260, 255, 260, 280)
    arrow(d, 740, 195, 740, 230)
    arrow(d, 740, 295, 740, 330)

    # Cross flows
    arrow(d, 450, 147, 450, 360)  # visual clutter - use side path for H→D
    # Better: H right-edge down to D
    arrow(d, 430, 175, 430, 360, label="Đặt demo")
    arrow(d, 450, 227, 550, 162, label="Demo live")
    arrow(d, 450, 307, 1030, 147, label="Onboarding")
    arrow(d, 260, 415, 650, 540, label="Lead API")
    arrow(d, 1030, 317, 450, 147, color=(13, 143, 107), label="Publish")
    arrow(d, 1030, 232, 930, 162, label="Gate publish")
    arrow(d, 1030, 402, 930, 362, label="Funnel / CWV")
    arrow(d, 1230, 175, 850, 540, label="Đơn · tồn · CRM")

    d.text(
        (40, 680),
        "Funnel: Home GTM → Templates → Demo themes → Trial/Console → Go-live → Analytics",
        font=font(14),
        fill=(100, 110, 120),
    )
    d.text(
        (40, 710),
        "Lead & publish đi qua admin-api · Platform CMS chỉnh trang corporate",
        font=font(14),
        fill=(100, 110, 120),
    )

    path = OUT / "diagram-flow.png"
    img.save(path, "PNG")
    return path


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    print(draw_domain())
    print(draw_flow())


if __name__ == "__main__":
    main()
