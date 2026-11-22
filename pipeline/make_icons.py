"""Generate PWA icons (app/public/icons/*.png) and favicon.svg."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent.parent / "app" / "public"
INK = (30, 58, 138)       # brand ink blue
SAFFRON = (245, 158, 11)
WHITE = (255, 255, 255)


def font(size):
    for name in ("arialbd.ttf", "segoeuib.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default(size=size)


def icon(size: int, maskable: bool = False) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if maskable:
        d.rectangle([0, 0, size, size], fill=INK)
        pad = int(size * 0.18)
    else:
        d.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.22), fill=INK)
        pad = int(size * 0.1)
    inner = size - 2 * pad
    # open-book: two pages
    top, bottom = pad + int(inner * 0.18), pad + int(inner * 0.62)
    mid = size // 2
    w = int(inner * 0.36)
    d.polygon([(mid, top + inner * 0.04), (mid - w, top), (mid - w, bottom), (mid, bottom + inner * 0.04)], fill=WHITE)
    d.polygon([(mid, top + inner * 0.04), (mid + w, top), (mid + w, bottom), (mid, bottom + inner * 0.04)], fill=(219, 228, 255))
    # saffron underline + G1 label
    f = font(int(inner * 0.2))
    d.text((mid, bottom + inner * 0.2), "G1", fill=SAFFRON, font=f, anchor="mm")
    return img


def main():
    (OUT / "icons").mkdir(parents=True, exist_ok=True)
    icon(192).save(OUT / "icons" / "icon-192.png")
    icon(512).save(OUT / "icons" / "icon-512.png")
    icon(512, maskable=True).save(OUT / "icons" / "maskable-512.png")
    icon(180, maskable=True).convert("RGB").save(OUT / "icons" / "apple-touch-icon.png")
    (OUT / "favicon.svg").write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
        '<rect width="64" height="64" rx="14" fill="#1e3a8a"/>'
        '<path d="M32 17 15 14v26l17 4z" fill="#fff"/><path d="M32 17l17-3v26l-17 4z" fill="#dbe4ff"/>'
        '<rect x="20" y="50" width="24" height="4" rx="2" fill="#f59e0b"/></svg>',
        encoding="utf-8",
    )
    print("icons written")


if __name__ == "__main__":
    main()
