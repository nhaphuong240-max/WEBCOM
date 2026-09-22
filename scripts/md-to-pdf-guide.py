#!/usr/bin/env python3
"""Convert WebCom user guide Markdown → PDF (Vietnamese-capable)."""
from __future__ import annotations

import re
import sys
from pathlib import Path

from fpdf import FPDF

ROOT = Path(__file__).resolve().parents[1]
MD = ROOT / "docs" / "05_Huong_dan_Su_dung_WebCom_v1.md"
OUT = ROOT / "docs" / "05_Huong_dan_Su_dung_WebCom_v1.pdf"
FONT = "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
# Arial Bold may lack VN glyphs — fall back to Unicode for all weights if needed
if not Path(FONT).exists():
    FONT = "/Library/Fonts/Arial Unicode.ttf"


class GuidePDF(FPDF):
    def header(self) -> None:
        if self.page_no() == 1:
            return
        self.set_font("Body", size=8)
        self.set_text_color(100, 100, 110)
        self.cell(0, 6, "PTT WebCom — Hướng dẫn sử dụng v1.0", align="L")
        self.ln(8)
        self.set_draw_color(213, 219, 227)
        self.line(14, self.get_y(), 196, self.get_y())
        self.ln(4)

    def footer(self) -> None:
        self.set_y(-14)
        self.set_font("Body", size=8)
        self.set_text_color(120, 120, 130)
        self.cell(0, 8, f"Trang {self.page_no()}/{{nb}}", align="C")


def clean_inline(text: str) -> str:
    text = re.sub(r"!\[[^\]]*\]\([^)]+\)", "", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = text.replace("**", "").replace("__", "").replace("`", "")
    text = text.replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")
    return text.strip()


def parse_table(lines: list[str], start: int) -> tuple[list[list[str]], int]:
    rows: list[list[str]] = []
    i = start
    while i < len(lines) and lines[i].strip().startswith("|"):
        raw = lines[i].strip()
        if re.match(r"^\|[\s\-:|]+\|$", raw):
            i += 1
            continue
        cells = [c.strip() for c in raw.strip("|").split("|")]
        rows.append([clean_inline(c) for c in cells])
        i += 1
    return rows, i


def write_table(pdf: GuidePDF, rows: list[list[str]]) -> None:
    if not rows:
        return
    cols = max(len(r) for r in rows)
    usable = 182.0
    if cols == 2:
        widths = [58.0, 124.0]
    elif cols == 3:
        widths = [50.0, 50.0, 82.0]
    elif cols == 4:
        widths = [44.0, 36.0, 34.0, 68.0]
    else:
        w = usable / cols
        widths = [w] * cols

    line_h = 4.0
    for ri, row in enumerate(rows):
        while len(row) < cols:
            row.append("")
        # compute height from wrapped text
        heights = []
        for ci, cell in enumerate(row[:cols]):
            pdf.set_font("Body", size=7.5)
            # fpdf multi_cell height estimate
            nlines = max(1, pdf.get_string_width(cell or " ") // max(1, widths[ci] - 2) + 1)
            heights.append(min(24, line_h * nlines + 1.5))
        row_h = max(heights)
        if pdf.get_y() + row_h > 275:
            pdf.add_page()
        x0 = 14.0
        y0 = pdf.get_y()
        for ci, cell in enumerate(row[:cols]):
            if ri == 0:
                pdf.set_fill_color(11, 20, 32)
                pdf.set_text_color(255, 255, 255)
            elif ri % 2 == 0:
                pdf.set_fill_color(243, 245, 247)
                pdf.set_text_color(20, 20, 28)
            else:
                pdf.set_fill_color(255, 255, 255)
                pdf.set_text_color(20, 20, 28)
            pdf.rect(x0 + sum(widths[:ci]), y0, widths[ci], row_h, style="F")
            pdf.set_xy(x0 + sum(widths[:ci]) + 1, y0 + 1)
            pdf.set_font("Body", size=7.5)
            pdf.multi_cell(widths[ci] - 2, line_h, cell or " ")
        pdf.set_y(y0 + row_h)
        pdf.set_draw_color(213, 219, 227)
        pdf.line(14, pdf.get_y(), 196, pdf.get_y())
    pdf.ln(3)
    pdf.set_text_color(20, 20, 28)


def main() -> int:
    if not MD.exists():
        print(f"Missing {MD}", file=sys.stderr)
        return 1
    if not Path(FONT).exists():
        print(f"Missing font {FONT}", file=sys.stderr)
        return 1

    text = MD.read_text(encoding="utf-8")
    lines = text.splitlines()

    pdf = GuidePDF(format="A4", unit="mm")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.set_margins(14, 16, 14)
    pdf.add_font("Body", "", FONT)
    pdf.add_font("BodyBold", "", FONT)
    pdf.add_page()

    # Cover
    pdf.set_fill_color(11, 20, 32)
    pdf.rect(0, 0, 210, 70, "F")
    pdf.set_text_color(255, 92, 26)
    pdf.set_font("BodyBold", size=14)
    pdf.set_xy(14, 22)
    pdf.cell(0, 8, "PTT Commerce Intelligence OS")
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("BodyBold", size=22)
    pdf.set_xy(14, 34)
    pdf.multi_cell(180, 10, "Hướng dẫn sử dụng WebCom")
    pdf.set_font("Body", size=11)
    pdf.set_text_color(200, 205, 215)
    pdf.set_xy(14, 56)
    pdf.cell(0, 6, "Phiên bản 1.0 · 2026-09-20 · Platform · Storefront · Admin Console")
    pdf.ln(28)
    pdf.set_text_color(20, 20, 28)

    i = 0
    in_code = False
    code_buf: list[str] = []
    code_lang = ""
    mermaid_images = [
        ROOT / "docs" / "pdf-assets" / "diagram-domain.png",
        ROOT / "docs" / "pdf-assets" / "diagram-flow.png",
    ]
    mermaid_idx = 0

    while i < len(lines):
        line = lines[i]

        # Skip YAML-ish front nothing

        if line.startswith("```"):
            if not in_code:
                in_code = True
                code_lang = line[3:].strip()
                code_buf = []
            else:
                in_code = False
                if code_lang.lower() == "mermaid":
                    img_path = (
                        mermaid_images[mermaid_idx]
                        if mermaid_idx < len(mermaid_images)
                        else None
                    )
                    mermaid_idx += 1
                    if img_path and img_path.exists():
                        if pdf.get_y() > 160:
                            pdf.add_page()
                        # Fit to page width ~182mm, keep aspect
                        max_w = 182
                        # fpdf needs image size; use h proportional
                        pdf.image(str(img_path), x=14, w=max_w)
                        pdf.ln(4)
                    else:
                        pdf.set_font("Body", size=9)
                        pdf.set_text_color(200, 80, 40)
                        pdf.multi_cell(182, 5, "[Thiếu file sơ đồ — chạy scripts/draw-guide-diagrams.py]")
                        pdf.set_text_color(20, 20, 28)
                        pdf.ln(2)
                else:
                    pdf.set_fill_color(243, 245, 247)
                    pdf.set_font("Body", size=7.5)
                    pdf.set_text_color(40, 45, 55)
                    for cl in code_buf:
                        if pdf.get_y() > 270:
                            pdf.add_page()
                        pdf.multi_cell(182, 3.8, cl if cl else " ", fill=True)
                    pdf.set_text_color(20, 20, 28)
                    pdf.ln(3)
                code_buf = []
                code_lang = ""
            i += 1
            continue

        if in_code:
            code_buf.append(line)
            i += 1
            continue

        if not line.strip():
            pdf.ln(2)
            i += 1
            continue

        if line.strip() == "---":
            pdf.ln(2)
            pdf.set_draw_color(213, 219, 227)
            pdf.line(14, pdf.get_y(), 196, pdf.get_y())
            pdf.ln(4)
            i += 1
            continue

        # Table
        if line.strip().startswith("|") and i + 1 < len(lines) and lines[i + 1].strip().startswith("|"):
            rows, i = parse_table(lines, i)
            write_table(pdf, rows)
            continue

        # Headings
        m = re.match(r"^(#{1,4})\s+(.*)$", line)
        if m:
            level = len(m.group(1))
            title = clean_inline(m.group(2))
            if pdf.get_y() > 250:
                pdf.add_page()
            if level == 1:
                pdf.ln(4)
                pdf.set_font("BodyBold", size=16)
                pdf.set_text_color(11, 20, 32)
            elif level == 2:
                pdf.ln(5)
                pdf.set_font("BodyBold", size=13)
                pdf.set_text_color(11, 20, 32)
            elif level == 3:
                pdf.ln(3)
                pdf.set_font("BodyBold", size=11)
                pdf.set_text_color(26, 40, 56)
            else:
                pdf.ln(2)
                pdf.set_font("BodyBold", size=10)
                pdf.set_text_color(40, 50, 65)
            pdf.multi_cell(182, 7, title)
            if level <= 2:
                pdf.set_draw_color(255, 92, 26)
                y = pdf.get_y()
                pdf.line(14, y, 50 if level == 1 else 36, y)
                pdf.ln(3)
            pdf.set_text_color(20, 20, 28)
            i += 1
            continue

        # Blockquote
        if line.startswith(">"):
            quote = clean_inline(line.lstrip("> ").strip())
            pdf.set_fill_color(255, 246, 240)
            pdf.set_font("Body", size=9)
            pdf.set_text_color(80, 50, 30)
            pdf.multi_cell(182, 5, quote, fill=True)
            pdf.set_text_color(20, 20, 28)
            pdf.ln(2)
            i += 1
            continue

        # List
        if re.match(r"^[-*]\s+", line) or re.match(r"^\d+\.\s+", line):
            item = clean_inline(re.sub(r"^([-*]|\d+\.)\s+", "", line))
            pdf.set_font("Body", size=9.5)
            pdf.set_x(18)
            pdf.multi_cell(178, 5, f"•  {item}")
            i += 1
            continue

        # Paragraph
        para = clean_inline(line)
        if para:
            pdf.set_font("Body", size=9.5)
            pdf.set_text_color(30, 34, 42)
            pdf.multi_cell(182, 5, para)
        i += 1

    pdf.output(str(OUT))
    print(f"Wrote {OUT} ({OUT.stat().st_size // 1024} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
