#!/usr/bin/env python3
"""Generate PNG icons for the OrderHub PWA manifest."""

from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "icons"
BRAND = "#0f766e"
TEXT = "OH"

# Windows ships Arial; macOS/Linux may have it under a different path.
FONT_CANDIDATES = [
    "C:/Windows/Fonts/arialbd.ttf",
    "C:/Windows/Fonts/arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
]


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def draw_icon(size: int, *, maskable: bool = False) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    if maskable:
        # Keep content inside the maskable safe zone (inner 80%).
        pad = size // 10
        draw.rounded_rectangle(
            [pad, pad, size - pad, size - pad],
            radius=size // 12,
            fill=BRAND,
        )
    else:
        draw.rounded_rectangle(
            [0, 0, size, size],
            radius=size // 8,
            fill=BRAND,
        )

    font = load_font(size // 2)
    bbox = draw.textbbox((0, 0), TEXT, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text(
        ((size - tw) // 2, (size - th) // 2 - size // 24),
        TEXT,
        font=font,
        fill="white",
    )
    return img


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sizes = [72, 96, 128, 144, 152, 192, 384, 512]
    for size in sizes:
        draw_icon(size).save(OUT_DIR / f"icon-{size}.png")
    draw_icon(192, maskable=True).save(OUT_DIR / "icon-maskable-192.png")
    draw_icon(512, maskable=True).save(OUT_DIR / "icon-maskable-512.png")
    print(f"Wrote icons to {OUT_DIR}")


if __name__ == "__main__":
    main()
