"""
Builds the app icons and the link-preview image as real pixel art:
the studio duck sprite (public/duck/duck.png, frame 0) plus a 5x7 bitmap font.

    python3 scripts/make-brand-assets.py

Writes src/app/icon.png, src/app/apple-icon.png, src/app/opengraph-image.png and
src/app/twitter-image.png (Next.js picks these up by file name).
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "src" / "app"
FRAME = 26

PAPER = (246, 240, 225)
PAPER_DOT = (232, 223, 200)
INK = (43, 38, 32)
SOFT = (107, 97, 82)
CARD_COLORS = [(244, 197, 66), (91, 141, 239), (217, 140, 63), (74, 90, 140), (76, 175, 125), (162, 107, 214), (140, 74, 74)]
ACCENT = (217, 69, 43)

# 5x7 pixel font (uppercase, digits, a little punctuation).
FONT = {
    "A": ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    "B": ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
    "C": ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
    "D": ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    "E": ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    "F": ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
    "G": ["01111", "10000", "10000", "10011", "10001", "10001", "01111"],
    "H": ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
    "I": ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
    "K": ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
    "L": ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    "M": ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    "N": ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
    "O": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    "P": ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
    "Q": ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
    "R": ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    "S": ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
    "T": ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    "U": ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
    "V": ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
    "W": ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
    "Y": ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
    ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
    "·": ["00000", "00000", "00000", "01100", "01100", "00000", "00000"],
    " ": ["00000"] * 7,
}


def text(img, s, x, y, scale, color):
    for ch in s.upper():
        glyph = FONT.get(ch, FONT[" "])
        for gy, row in enumerate(glyph):
            for gx, bit in enumerate(row):
                if bit == "1":
                    for dy in range(scale):
                        for dx in range(scale):
                            img.putpixel((x + gx * scale + dx, y + gy * scale + dy), color)
        x += 6 * scale
    return x


def text_width(s, scale):
    return len(s) * 6 * scale - scale


def duck(scale):
    sheet = Image.open(ROOT / "public" / "duck" / "duck.png").convert("RGBA")
    return sheet.crop((0, 0, FRAME, FRAME)).resize((FRAME * scale, FRAME * scale), Image.NEAREST)


def icon(size, pad):
    # Duck on a paper tile with a pixel border, scaled to fit.
    inner = size - pad * 2
    scale = max(1, inner // FRAME)
    img = Image.new("RGBA", (size, size), PAPER + (255,))
    for i in range(size):
        for b in range(max(2, size // 32)):
            for xy in ((i, b), (i, size - 1 - b), (b, i), (size - 1 - b, i)):
                img.putpixel(xy, INK + (255,))
    d = duck(scale)
    img.alpha_composite(d, ((size - d.width) // 2, (size - d.height) // 2 + scale))
    return img


def og():
    w, h = 1200, 630
    img = Image.new("RGBA", (w, h), PAPER + (255,))
    # dithered paper
    for y in range(0, h, 6):
        for x in range((y // 6) % 2 * 3, w, 6):
            img.putpixel((x, y), PAPER_DOT + (255,))
    # card-type stripes along the bottom, like a row of taped cards
    stripe_w = w // len(CARD_COLORS)
    for i, c in enumerate(CARD_COLORS):
        for y in range(h - 36, h):
            for x in range(i * stripe_w, (i + 1) * stripe_w if i < len(CARD_COLORS) - 1 else w):
                img.putpixel((x, y), c + (255,))
    d = duck(10)
    img.alpha_composite(d, (90, 150))
    title = "QUACKLE.SCRAPBOOK"
    scale = 7
    tx = 90 + d.width + 40
    text(img, title, min(tx, w - text_width(title, scale) - 60), 220, scale, INK)
    sub = "OPEN PACKS · QUACK BAD IDEAS · FORGE A GAME"
    text(img, sub, min(tx, w - text_width(sub, 3) - 60), 300, 3, SOFT)
    tag = "A GAME IDEA SCRAPBOOK BY QUACKLE.BIT"
    text(img, tag, min(tx, w - text_width(tag, 3) - 60), 360, 3, ACCENT)
    return img.convert("RGB")


if __name__ == "__main__":
    icon(256, 24).save(APP / "icon.png")
    icon(180, 14).convert("RGB").save(APP / "apple-icon.png")
    image = og()
    image.save(APP / "opengraph-image.png")
    image.save(APP / "twitter-image.png")
    for name in ("icon.png", "apple-icon.png", "opengraph-image.png"):
        print("wrote", APP / name)
