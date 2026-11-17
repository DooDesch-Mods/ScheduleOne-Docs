"""Turns the in-game shots of the Based bases into the WebP images the base pages show.

Every page image has one source shot here, so swapping a shot is one line and one run. Sources are relative to
--shots (the --out folder of base-shots.py, which holds storage/ and sweatshop/). Prints PASS/FAIL per image.

usage: images.py --shots F:/Projects/Mods/Schedule1/_drafts/based-shots [--only storage-unit/loft]
"""
import argparse
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "public", "img", "based")
SIZE = (1600, 900)

# Interiors stay dim at noon even with the room lights on, so they get an exposure lift (a gamma, 1.0 = none).
INSIDE = 1.6
WALL_IN_SHADE = 1.25

# page image (under public/img/based, without .webp): source shot, or (source shot, lift). Sources come from
# tools/based/base-shots.py; both halves of a before/after pair get the same lift.
SOURCES = {
    "storage-unit/before": ("storage/vanilla/door-front.png", WALL_IN_SHADE),
    "storage-unit/after": ("storage/loft/door-front.png", WALL_IN_SHADE),
    # Each stage card wipes from the stage before it to the stage itself, same view.
    "storage-unit/loft-outside-before": ("storage/vanilla/stair-side.png", WALL_IN_SHADE),
    "storage-unit/loft-outside": ("storage/loft/stair-side.png", WALL_IN_SHADE),
    "storage-unit/loft-before": ("storage/vanilla/loft-south.png", INSIDE),
    "storage-unit/loft": ("storage/loft/loft-south.png", INSIDE),
    "storage-unit/east-before": ("storage/loft/east-room.png", INSIDE),
    "storage-unit/east": ("storage/east/east-room.png", INSIDE),
    "storage-unit/south-before": ("storage/east/south-room.png", INSIDE),
    "storage-unit/south": ("storage/south/south-room.png", INSIDE),
    "storage-unit/bay-before": ("storage/south/hall-bays.png", INSIDE),
    "storage-unit/bay": ("storage/bay/hall-bays.png", INSIDE),
    "sweatshop/before": "sweatshop/none/north-high.png",
    "sweatshop/after": "sweatshop/dock/north-high.png",
    # From the yard: the wing stands on the low building behind the restaurant, so the new storey fills the frame.
    "sweatshop/wing-before": ("sweatshop/none/wing-yard.png", WALL_IN_SHADE),
    "sweatshop/wing": ("sweatshop/complete/wing-yard.png", WALL_IN_SHADE),
    "sweatshop/dock-before": ("sweatshop/complete/dock-yard.png", WALL_IN_SHADE),
    "sweatshop/dock": ("sweatshop/dock/dock-yard.png", WALL_IN_SHADE),
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--shots", required=True)
    ap.add_argument("--only", default="")
    a = ap.parse_args()
    only = [v for v in a.only.split(",") if v]
    failed = 0
    for name, rel in SOURCES.items():
        if only and name not in only:
            continue
        dest = os.path.join(OUT, name + ".webp")
        rel, lift = (rel, 1.0) if isinstance(rel, str) else rel
        src = os.path.join(a.shots, rel)
        try:
            image = Image.open(src).convert("RGB")
        except OSError as e:
            failed += 1
            print("FAIL %s: cannot read %s (%s)" % (name, src, e))
            continue
        w, h = image.size
        if w * 9 != h * 16:
            # A centred crop to 16:9; both halves of a pair come from the same window size, so they stay aligned.
            cw, ch = min(w, h * 16 // 9), min(h, w * 9 // 16)
            image = image.crop(((w - cw) // 2, (h - ch) // 2, (w - cw) // 2 + cw, (h - ch) // 2 + ch))
            print("INFO %s: %s is %dx%d, cropped to %dx%d" % (name, rel, w, h, cw, ch))
        if lift != 1.0:
            # A gamma curve brightens the shadows and mid tones and leaves white white, so lamps do not clip.
            image = image.point([round(255 * (i / 255) ** (1 / lift)) for i in range(256)] * 3)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        image.resize(SIZE, Image.LANCZOS).save(dest, "WEBP", quality=80, method=6)
        print("PASS %s <- %s, lift %.2f (%d KB)" % (name, rel, lift, os.path.getsize(dest) // 1024))
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
